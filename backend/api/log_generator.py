STATUS_MAP = {
    "off_duty": 0,
    "sleeper_berth": 1,
    "driving": 2,
    "on_duty_not_driving": 3,
}


def build_daily_log(timeline_events, day):
    events_out = []
    for ev in timeline_events:
        events_out.append({
            "status": ev["status"],
            "start_hour": ev["start_hour"],
            "end_hour": ev["end_hour"],
        })

    totals = {"off_duty": 0, "sleeper_berth": 0, "driving": 0, "on_duty_not_driving": 0}
    for ev in events_out:
        dur = ev["end_hour"] - ev["start_hour"]
        if ev["status"] in totals:
            totals[ev["status"]] += dur

    return {
        "day": day,
        "date_label": f"Day {day}",
        "events": events_out,
        "totals": totals,
    }
