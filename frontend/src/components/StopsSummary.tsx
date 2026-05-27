import { Stop } from '../types/trip';

const STOP_STYLES: Record<string, { border: string; icon: string; label: string; dark: string }> = {
  pickup: { border: '#3B82F6', icon: '📦', label: 'Pickup', dark: '#1D4ED8' },
  dropoff: { border: '#16A34A', icon: '🏠', label: 'Dropoff', dark: '#15803D' },
  rest: { border: '#9333EA', icon: '😴', label: 'Rest', dark: '#7E22CE' },
  fuel: { border: '#D97706', icon: '⛽', label: 'Fuel', dark: '#B45309' },
  break_30min: { border: '#14B8A6', icon: '☕', label: '30-min Break', dark: '#0D9488' },
  driving: { border: '#6B7280', icon: '🚛', label: 'Driving', dark: '#4B5563' },
};

interface StopsSummaryProps {
  stops: Stop[];
}

export default function StopsSummary({ stops }: StopsSummaryProps) {
  const filtered = stops.filter((s) => s.type !== 'driving' || s.location_name !== 'En Route');

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
      <h3 className="text-sm font-bold text-[#1E3A5F] mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Trip Stops Timeline
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {filtered.map((stop, i) => {
          const style = STOP_STYLES[stop.type] || STOP_STYLES.driving;
          return (
            <div
              key={i}
              className="flex-shrink-0 w-48 bg-white rounded-lg shadow-sm"
              style={{ borderLeft: `4px solid ${style.border}`, borderTop: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}
            >
              <div className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{style.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: style.dark }}>{style.label}</span>
                </div>
                <div className="text-sm font-medium text-slate-800 truncate">{stop.location_name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Day {stop.arrival_day} @ {stop.arrival_time}
                </div>
                <div className="text-xs text-slate-500">
                  {stop.duration_hours.toFixed(1)}h
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
