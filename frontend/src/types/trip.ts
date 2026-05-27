export interface Stop {
  type: 'pickup' | 'dropoff' | 'rest' | 'fuel' | 'break_30min' | 'driving';
  location_name: string;
  lat: number;
  lng: number;
  arrival_day: number;
  arrival_time: string;
  departure_time: string;
  duration_hours: number;
  notes: string;
}

export interface LogEvent {
  status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
  start_hour: number;
  end_hour: number;
}

export interface DailyLog {
  day: number;
  date_label: string;
  events: LogEvent[];
  totals: {
    off_duty: number;
    sleeper_berth: number;
    driving: number;
    on_duty_not_driving: number;
  };
  remarks: string[];
}

export interface TripSummary {
  cycle_hours_used_after_trip: number;
  cycle_hours_remaining: number;
  days_needed: number;
}

export interface TripPlan {
  total_distance_miles: number;
  total_driving_hours: number;
  route_coordinates: [number, number][];
  stops: Stop[];
  daily_logs: DailyLog[];
  violations: string[];
  summary: TripSummary;
}

export interface TripFormData {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

export interface RecapDay {
  day: number;
  on_duty_hours: number;
}
