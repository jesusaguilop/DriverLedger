import math
import requests
import time

MAX_DRIVING_HOURS = 11
MAX_DUTY_WINDOW_HOURS = 14
MIN_OFF_DUTY_HOURS = 10
BREAK_REQUIRED_AFTER = 8
BREAK_DURATION = 0.5
MAX_CYCLE_HOURS = 70
FUEL_INTERVAL_MILES = 1000
PICKUP_DROPOFF_DURATION = 1.0
AVERAGE_SPEED_MPH = 55

GEOCODE_CACHE = {}


def geocode(query):
    if query in GEOCODE_CACHE:
        return GEOCODE_CACHE[query]
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": query, "format": "json", "limit": 1}
    headers = {"User-Agent": "DriverLedger/1.0"}
    resp = requests.get(url, params=params, headers=headers, timeout=10)
    results = resp.json()
    if not results:
        raise ValueError(f"Could not geocode: {query}")
    r = results[0]
    result = {"lat": float(r["lat"]), "lon": float(r["lon"]), "display_name": r["display_name"]}
    GEOCODE_CACHE[query] = result
    time.sleep(1)
    return result


def get_route(coords):
    coord_str = ";".join(f"{c[1]},{c[0]}" for c in coords)
    url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}"
    params = {"overview": "full", "geometries": "geojson", "steps": "false"}
    resp = requests.get(url, params=params, timeout=30)
    data = resp.json()
    if not data.get("routes"):
        raise ValueError("Could not get route from OSRM")
    route = data["routes"][0]
    distance_meters = route["distance"]
    duration_seconds = route["duration"]
    geometry = route["geometry"]["coordinates"]
    distance_miles = distance_meters * 0.000621371
    duration_hours = duration_seconds / 3600
    route_points = [[p[1], p[0]] for p in geometry]
    if len(route_points) > 500:
        step = len(route_points) / 500
        route_points = [route_points[min(int(i * step), len(route_points) - 1)] for i in range(500)]
    return distance_miles, duration_hours, route_points


def split_route_at_pickup(route_points, current, pickup, dropoff):
    pickup_coords = (pickup["lat"], pickup["lon"])
    best_idx = 0
    best_dist = float("inf")
    for i, pt in enumerate(route_points):
        d = (pt[0] - pickup_coords[0]) ** 2 + (pt[1] - pickup_coords[1]) ** 2
        if d < best_dist:
            best_dist = d
            best_idx = i
    dtot = 0
    dseg1 = 0
    for i in range(1, len(route_points)):
        dx = route_points[i][0] - route_points[i - 1][0]
        dy = route_points[i][1] - route_points[i - 1][1]
        dist = math.sqrt(dx * dx + dy * dy) * 69
        dtot += dist
        if i <= best_idx:
            dseg1 += dist
    dseg2 = dtot - dseg1
    return dseg1, dseg2


def downsample_points(points, max_n=500):
    if len(points) <= max_n:
        return points
    step = len(points) / max_n
    return [points[min(int(i * step), len(points) - 1)] for i in range(max_n)]


def calculate_trip_plan(current_location, pickup_location, dropoff_location, current_cycle_used):
    current = geocode(current_location)
    pickup = geocode(pickup_location)
    dropoff = geocode(dropoff_location)

    total_distance, total_duration, route_points = get_route([
        (current["lat"], current["lon"]),
        (pickup["lat"], pickup["lon"]),
        (dropoff["lat"], dropoff["lon"]),
    ])

    dist_seg1, dist_seg2 = split_route_at_pickup(route_points, current, pickup, dropoff)
    route_points = downsample_points(route_points)

    driving_hours_seg1 = dist_seg1 / AVERAGE_SPEED_MPH
    driving_hours_seg2 = dist_seg2 / AVERAGE_SPEED_MPH

    timeline = []
    cumulative_cycle = current_cycle_used
    pretrip_count = 0

    def add_event(status, duration, loc_name, lat, lng, notes=""):
        nonlocal cumulative_cycle
        timeline.append({
            "status": status,
            "duration": duration,
            "location_name": loc_name,
            "lat": lat,
            "lng": lng,
            "notes": notes,
        })
        if status in ("driving", "on_duty_not_driving"):
            cumulative_cycle += duration

    rem1 = driving_hours_seg1
    rem2 = driving_hours_seg2
    day_driving = 0.0
    day_on_duty = 0.0
    state = "drive1"
    needs_pickup = True
    needs_dropoff_post = True

    while state != "done":
        if state == "drive1":
            if day_driving < 0.001 and day_on_duty < 0.001:
                pretrip_count += 1
                loc = current["display_name"] if pretrip_count == 1 else ""
                add_event("on_duty_not_driving", 0.25, loc,
                          current["lat"], current["lon"], "Pre-trip inspection — 0.25h")
                day_on_duty += 0.25

            avail = min(MAX_DRIVING_HOURS - day_driving, MAX_DUTY_WINDOW_HOURS - day_on_duty)

            if avail < 0.01:
                add_event("off_duty", MIN_OFF_DUTY_HOURS, "Rest stop", 0, 0,
                          "10-hour rest — end of day")
                day_driving = 0.0
                day_on_duty = 0.0
                continue

            drive_today = min(rem1, avail)

            if day_driving < BREAK_REQUIRED_AFTER and (day_driving + drive_today) >= BREAK_REQUIRED_AFTER:
                before_break = BREAK_REQUIRED_AFTER - day_driving
                after_break = drive_today - before_break
                if before_break > 0:
                    add_event("driving", before_break, "", 0, 0, f"Driving ({before_break:.1f}h)")
                    day_driving += before_break
                    day_on_duty += before_break
                    rem1 -= before_break
                add_event("on_duty_not_driving", BREAK_DURATION, "Break stop", 0, 0,
                          "30-minute break — 0.5h on-duty not driving")
                day_on_duty += BREAK_DURATION
                if after_break > 0:
                    add_event("driving", after_break, "", 0, 0, f"Driving ({after_break:.1f}h)")
                    day_driving += after_break
                    day_on_duty += after_break
                    rem1 -= after_break
            else:
                add_event("driving", drive_today, "", 0, 0, f"Driving ({drive_today:.1f}h)")
                day_driving += drive_today
                day_on_duty += drive_today
                rem1 -= drive_today

            if rem1 < 0.01:
                if needs_pickup:
                    state = "pickup"
                else:
                    state = "drive2" if rem2 > 0.01 else "final"
            elif day_driving >= MAX_DRIVING_HOURS - 0.01 or day_on_duty >= MAX_DUTY_WINDOW_HOURS - 0.01:
                add_event("off_duty", MIN_OFF_DUTY_HOURS, "Rest stop", 0, 0,
                          "10-hour rest — end of day")
                day_driving = 0.0
                day_on_duty = 0.0

        elif state == "pickup":
            avail = MAX_DUTY_WINDOW_HOURS - day_on_duty
            if avail >= PICKUP_DROPOFF_DURATION:
                add_event("on_duty_not_driving", PICKUP_DROPOFF_DURATION, pickup["display_name"],
                          pickup["lat"], pickup["lon"], f"Pickup — {PICKUP_DROPOFF_DURATION}h on-duty not driving")
                day_on_duty += PICKUP_DROPOFF_DURATION
                needs_pickup = False
                state = "drive2" if rem2 > 0.01 else "final"
            else:
                add_event("off_duty", MIN_OFF_DUTY_HOURS, "Rest stop", 0, 0,
                          "10-hour rest — end of day")
                day_driving = 0.0
                day_on_duty = 0.0

        elif state == "drive2":
            if day_driving < 0.001 and day_on_duty < 0.001:
                pretrip_count += 1
                loc = pickup["display_name"] if pretrip_count == 1 else ""
                add_event("on_duty_not_driving", 0.25, loc,
                          pickup["lat"], pickup["lon"], "Pre-trip inspection — 0.25h")
                day_on_duty += 0.25

            avail = min(MAX_DRIVING_HOURS - day_driving, MAX_DUTY_WINDOW_HOURS - day_on_duty)

            if avail < 0.01:
                add_event("off_duty", MIN_OFF_DUTY_HOURS, "Rest stop", 0, 0,
                          "10-hour rest — end of day")
                day_driving = 0.0
                day_on_duty = 0.0
                continue

            drive_today = min(rem2, avail)

            if day_driving < BREAK_REQUIRED_AFTER and (day_driving + drive_today) >= BREAK_REQUIRED_AFTER:
                before_break = BREAK_REQUIRED_AFTER - day_driving
                after_break = drive_today - before_break
                if before_break > 0:
                    add_event("driving", before_break, "", 0, 0, f"Driving ({before_break:.1f}h)")
                    day_driving += before_break
                    day_on_duty += before_break
                    rem2 -= before_break
                add_event("on_duty_not_driving", BREAK_DURATION, "Break stop", 0, 0,
                          "30-minute break — 0.5h on-duty not driving")
                day_on_duty += BREAK_DURATION
                if after_break > 0:
                    add_event("driving", after_break, "", 0, 0, f"Driving ({after_break:.1f}h)")
                    day_driving += after_break
                    day_on_duty += after_break
                    rem2 -= after_break
            else:
                add_event("driving", drive_today, "", 0, 0, f"Driving ({drive_today:.1f}h)")
                day_driving += drive_today
                day_on_duty += drive_today
                rem2 -= drive_today

            if rem2 < 0.01:
                state = "final"
            elif day_driving >= MAX_DRIVING_HOURS - 0.01 or day_on_duty >= MAX_DUTY_WINDOW_HOURS - 0.01:
                add_event("off_duty", MIN_OFF_DUTY_HOURS, "Rest stop", 0, 0,
                          "10-hour rest — end of day")
                day_driving = 0.0
                day_on_duty = 0.0

        elif state == "final":
            avail = MAX_DUTY_WINDOW_HOURS - day_on_duty
            needed = PICKUP_DROPOFF_DURATION + 0.25
            if avail >= needed:
                add_event("on_duty_not_driving", PICKUP_DROPOFF_DURATION, dropoff["display_name"],
                          dropoff["lat"], dropoff["lon"], f"Dropoff — {PICKUP_DROPOFF_DURATION}h on-duty not driving")
                add_event("on_duty_not_driving", 0.25, dropoff["display_name"],
                          dropoff["lat"], dropoff["lon"], "Post-trip inspection — 0.25h")
                needs_dropoff_post = False
                state = "done"
            else:
                add_event("off_duty", MIN_OFF_DUTY_HOURS, "Rest stop", 0, 0,
                          "10-hour rest — end of day")
                day_driving = 0.0
                day_on_duty = 0.0

    stops = []
    timeline_scheduled = []
    current_time = 7.0
    current_day = 1

    for ev in timeline:
        ev_start = current_time
        ev_end = current_time + ev["duration"]
        crossed = ev_end > 24.0
        if crossed:
            split1_dur = 24.0 - current_time
            split2_dur = ev["duration"] - split1_dur
            if split1_dur > 0:
                timeline_scheduled.append({
                    "status": ev["status"],
                    "start_hour": current_time,
                    "end_hour": 24.0,
                    "day": current_day,
                })
                stops.append(make_stop(ev, current_day, current_time, split1_dur))
            current_day += 1
            if split2_dur > 0:
                timeline_scheduled.append({
                    "status": ev["status"],
                    "start_hour": 0.0,
                    "end_hour": split2_dur,
                    "day": current_day,
                })
                stops.append(make_stop(ev, current_day, 0.0, split2_dur))
            current_time = split2_dur
        else:
            timeline_scheduled.append({
                "status": ev["status"],
                "start_hour": current_time,
                "end_hour": ev_end,
                "day": current_day,
            })
            stops.append(make_stop(ev, current_day, current_time, ev["duration"]))
            current_time = ev_end
        if ev["status"] == "off_duty" and ev["duration"] >= MIN_OFF_DUTY_HOURS:
            if not crossed:
                current_day += 1
                current_time = 7.0

    daily_logs_result = []
    day = 1
    while True:
        day_events = [e for e in timeline_scheduled if e["day"] == day]
        if not day_events:
            break
        day_events.sort(key=lambda e: e["start_hour"])
        filled = []
        cursor = 0.0
        for e in day_events:
            if e["start_hour"] > cursor + 0.01:
                filled.append({"status": "off_duty", "start_hour": cursor, "end_hour": e["start_hour"], "day": day})
            filled.append(e)
            cursor = max(cursor, e["end_hour"])
        if cursor < 24.0 - 0.01:
            filled.append({"status": "off_duty", "start_hour": cursor, "end_hour": 24.0, "day": day})
        day_events = filled
        totals = {"off_duty": 0, "sleeper_berth": 0, "driving": 0, "on_duty_not_driving": 0}
        for e in day_events:
            dur = e["end_hour"] - e["start_hour"]
            if e["status"] in totals:
                totals[e["status"]] += dur
        if totals["driving"] < 0.01 and totals["on_duty_not_driving"] < 0.3:
            day += 1
            continue
        remarks = []
        for e in day_events:
            h = e["start_hour"]
            display = display_time(h)
            matching_stops = [s for s in stops if s["arrival_day"] == day
                              and abs(s.get("arrival_hour", 0) - h) < 0.01]
            loc = matching_stops[0]["location_name"] if matching_stops else ""
            if loc:
                remarks.append(f"{display} — {loc} ({e['status'].replace('_', ' ').title()})")
        daily_logs_result.append({
            "day": day,
            "date_label": f"Day {day}",
            "events": [{"status": e["status"], "start_hour": e["start_hour"],
                        "end_hour": e["end_hour"]} for e in day_events],
            "totals": totals,
            "remarks": remarks,
        })
        day += 1

    cycle_used = cumulative_cycle

    violations = []
    if cycle_used > MAX_CYCLE_HOURS + 0.01:
        violations.append(f"70-hour cycle limit exceeded by {round(cycle_used - MAX_CYCLE_HOURS, 1)}h (total: {round(cycle_used, 1)}h)")

    stops_out = []
    for s in stops:
        stops_out.append({
            "type": s["type"],
            "location_name": s["location_name"],
            "lat": s["lat"],
            "lng": s["lng"],
            "arrival_day": s["arrival_day"],
            "arrival_time": s["arrival_time"],
            "departure_time": s["departure_time"],
            "duration_hours": s["duration_hours"],
            "notes": s["notes"],
        })

    return {
        "total_distance_miles": round(total_distance, 1),
        "total_driving_hours": round(driving_hours_seg1 + driving_hours_seg2, 1),
        "route_coordinates": route_points,
        "stops": stops_out,
        "daily_logs": daily_logs_result,
        "violations": violations,
        "summary": {
            "cycle_hours_used_after_trip": round(cycle_used, 1),
            "cycle_hours_remaining": round(max(0, MAX_CYCLE_HOURS - cycle_used), 1),
            "days_needed": len(daily_logs_result),
        },
    }


def make_stop(ev, day, start_hour, duration):
    stop_type = "rest"
    notes = ev.get("notes", "").lower()
    if ev["status"] == "on_duty_not_driving":
        if "break" in notes or "30-minute" in notes:
            stop_type = "break_30min"
        elif "pickup" in notes:
            stop_type = "pickup"
        elif "dropoff" in notes:
            stop_type = "dropoff"
        elif "fuel" in notes:
            stop_type = "fuel"
        elif "pre-trip" in notes or "post-trip" in notes or "inspection" in notes:
            stop_type = "rest"
        else:
            stop_type = "fuel"
    elif ev["status"] == "driving":
        stop_type = "driving"
    return {
        "type": stop_type,
        "location_name": ev["location_name"] if ev["location_name"] else "En Route",
        "lat": ev["lat"],
        "lng": ev["lng"],
        "arrival_day": day,
        "arrival_hour": start_hour,
        "arrival_time": format_hour(start_hour),
        "departure_time": format_hour(start_hour + duration),
        "duration_hours": round(duration, 2),
        "notes": ev.get("notes", ""),
    }


def format_hour(h):
    if h >= 24:
        h = h % 24
    ampm = "AM" if h < 12 or h == 24 else "PM"
    h12 = int(h) if h < 12 else (int(h) - 12 if int(h) > 12 else 12)
    if h12 == 0:
        h12 = 12
    m = int((h % 1) * 60)
    return f"{h12}:{m:02d} {ampm}"


def display_time(h):
    if h >= 24:
        h = h % 24
    period = "AM" if h < 12 or h == 24 else "PM"
    h12 = int(h)
    if h12 == 0:
        h12 = 12
    elif h12 > 12:
        h12 -= 12
    m = int((h % 1) * 60)
    return f"{h12}:{m:02d} {period}"
