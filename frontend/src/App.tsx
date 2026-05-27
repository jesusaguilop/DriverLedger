import { useState, useRef } from 'react';
import { useTripPlan } from './hooks/useTripPlan';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import StopsSummary from './components/StopsSummary';
import LogSheet from './components/LogSheet';
import { TripFormData, DailyLog } from './types/trip';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function App() {
  const { tripPlan, loading, error, planTrip, reset } = useTripPlan();
  const [lastFormData, setLastFormData] = useState<TripFormData | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  function handlePlan(data: TripFormData) {
    setLastFormData(data);
    planTrip(data);
  }

  async function downloadAllPdfs() {
    if (!logsContainerRef.current) return;
    const sheets = logsContainerRef.current.querySelectorAll<HTMLElement>('[data-log-sheet]');
    const pdf = new jsPDF('l', 'mm', 'letter');
    for (let i = 0; i < sheets.length; i++) {
      const canvas = await html2canvas(sheets[i], { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    }
    pdf.save('all-logs.pdf');
  }

  const dailyLogs = tripPlan?.daily_logs || [];

  const recapDays = dailyLogs.map((dl) => ({
    day: dl.day,
    on_duty_hours: dl.totals.driving + dl.totals.on_duty_not_driving,
  }));

  function getDayLocations(index: number) {
    const current = lastFormData?.current_location || '';
    const pickup = lastFormData?.pickup_location || '';
    const dropoff = lastFormData?.dropoff_location || '';
    if (index === 0) return { from: current, to: pickup };
    if (index === dailyLogs.length - 1) return { from: pickup, to: dropoff };
    return { from: pickup, to: dropoff };
  }

  function getDayMiles(log: DailyLog) {
    const totalHours = tripPlan?.total_driving_hours || 0;
    const totalMiles = tripPlan?.total_distance_miles || 0;
    if (totalHours === 0) return 0;
    return (log.totals.driving / totalHours) * totalMiles;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <header className="bg-[#1E3A5F] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2563EB] rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">DriverLedger</h1>
              <p className="text-[10px] text-blue-200 leading-tight -mt-0.5">FMCSA HOS Compliant Trip Planning</p>
            </div>
          </div>
          <span className="text-xs text-blue-300/80 hidden sm:block">FMCSA HOS Compliant</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <TripForm onSubmit={handlePlan} loading={loading} />

        {error && (
          <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between shadow-sm">
            <span className="text-sm">{error}</span>
            <button onClick={reset} className="text-red-500 hover:text-red-700 text-sm font-medium">Dismiss</button>
          </div>
        )}

        {tripPlan && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Total Distance</div>
                    <div className="text-xl font-bold text-[#2563EB]">{tripPlan.total_distance_miles.toFixed(0)} <span className="text-xs font-normal text-slate-500">miles</span></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Driving Hours</div>
                    <div className="text-xl font-bold text-[#D97706]">{tripPlan.total_driving_hours.toFixed(1)} <span className="text-xs font-normal text-slate-500">hours</span></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Trip Days</div>
                    <div className="text-xl font-bold text-[#16A34A]">{tripPlan.summary.days_needed} <span className="text-xs font-normal text-slate-500">days</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <div className="text-xs text-slate-500 uppercase font-semibold">Cycle Used After Trip</div>
                <div className="text-lg font-semibold text-[#D97706]">{tripPlan.summary.cycle_hours_used_after_trip.toFixed(1)}h</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <div className="text-xs text-slate-500 uppercase font-semibold">Cycle Remaining</div>
                <div className="text-lg font-semibold text-[#16A34A]">{tripPlan.summary.cycle_hours_remaining.toFixed(1)}h</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <div className="text-xs text-slate-500 uppercase font-semibold">Cycle Limit</div>
                <div className="text-lg font-semibold text-[#1E3A5F]">70h / 8 days</div>
              </div>
            </div>

            {tripPlan.violations.length > 0 && (
              <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
                <span className="font-semibold">Violations:</span>
                <ul className="list-disc list-inside text-sm mt-1">
                  {tripPlan.violations.map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </div>
            )}

            <RouteMap routeCoordinates={tripPlan.route_coordinates} stops={tripPlan.stops} />
            <StopsSummary stops={tripPlan.stops} />

            {dailyLogs.length > 1 && (
              <div className="max-w-4xl mx-auto no-print mb-4">
                <button
                  onClick={downloadAllPdfs}
                  className="px-5 py-2.5 text-sm font-semibold bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors shadow-sm"
                >
                  Download All Logs PDF
                </button>
              </div>
            )}

            <div ref={logsContainerRef} className="max-w-4xl mx-auto">
              {dailyLogs.map((log, i) => {
                const { from, to } = getDayLocations(i);
                const dayMiles = getDayMiles(log);
                return (
                  <div key={log.day} data-log-sheet>
                    <LogSheet
                      log={log}
                      index={i}
                      fromLocation={from}
                      toLocation={to}
                      totalDistanceMiles={dayMiles}
                      recapDays={recapDays}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
