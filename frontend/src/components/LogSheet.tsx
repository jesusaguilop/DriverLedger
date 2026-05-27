import { useRef } from 'react';
import { DailyLog } from '../types/trip';

const ROWS = [
  { key: 'off_duty', label: 'Off Duty', color: '#D1FAE5', barColor: 'transparent', borderColor: '#86EFAC' },
  { key: 'sleeper_berth', label: 'Sleeper Berth', color: '#F3F4F6', barColor: '#D1D5DB', borderColor: '#D1D5DB' },
  { key: 'driving', label: 'Driving', color: '#EFF6FF', barColor: '#2563EB', borderColor: '#93C5FD' },
  { key: 'on_duty_not_driving', label: 'On Duty (Not Driving)', color: '#FFF7ED', barColor: '#D97706', borderColor: '#FDBA74' },
];

interface LogSheetProps {
  log: DailyLog;
  index: number;
  fromLocation?: string;
  toLocation?: string;
  totalDistanceMiles?: number;
  recapDays?: { day: number; on_duty_hours: number }[];
}

function formatDate(day: number): string {
  const d = new Date();
  d.setDate(d.getDate() + (day - 1));
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${mm}/${dd}/${y}`;
}

export default function LogSheet({ log, index, fromLocation, toLocation, totalDistanceMiles, recapDays }: LogSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const fromVal = fromLocation || '';
  const toVal = toLocation || '';

  const recapHours: number[] = [];
  if (recapDays) {
    const sorted = [...recapDays].sort((a, b) => a.day - b.day);
    const lastEight = sorted.slice(-8);
    for (let i = 0; i < 8; i++) {
      recapHours.push(i < lastEight.length ? lastEight[i].on_duty_hours : 0.0);
    }
    recapHours.push(lastEight.reduce((sum, d) => sum + d.on_duty_hours, 0));
  } else {
    for (let i = 0; i < 9; i++) recapHours.push(0.0);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
      <div className="flex justify-between items-center mb-3 no-print">
        <h3 className="text-base font-bold text-[#1E3A5F] flex items-center gap-2">
          <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
          {log.date_label} — Driver's Daily Log
        </h3>
        <button
          onClick={() => {
            if (sheetRef.current) {
              import('html2canvas').then(({ default: html2canvas }) =>
                import('jspdf').then(({ default: jsPDF }) => {
                  html2canvas(sheetRef.current!, { scale: 2, useCORS: true, logging: false }).then((canvas) => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('l', 'mm', 'letter');
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const imgWidth = pageWidth - 20;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
                    pdf.save(`log-day-${log.day}.pdf`);
                  });
                })
              );
            }
          }}
          className="px-4 py-2 text-xs font-semibold bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors shadow-sm"
        >
          Download Log PDF
        </button>
      </div>

      <div ref={sheetRef} className="border border-slate-400 bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="px-3 py-2 border-b border-slate-400 bg-[#1E3A5F] text-white">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              DRIVER'S DAILY LOG
            </span>
            <span>Date: {formatDate(log.day)}</span>
          </div>
          <div className="flex justify-between mt-0.5">
            <span>From: {fromVal || '_______________'}</span>
            <span>To: {toVal || '_______________'}</span>
          </div>
          <div className="flex justify-between mt-0.5">
            <span>Total Miles: {totalDistanceMiles ? Math.round(totalDistanceMiles).toString() : '________'}</span>
            <span>Carrier: DriverLedger</span>
          </div>
        </div>

        <div className="relative" style={{ height: `${ROWS.length * 32}px` }}>
          {ROWS.map((row, ri) => (
            <div
              key={row.key}
              className="relative border-b border-slate-300"
              style={{ height: '32px', backgroundColor: row.color }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-48 z-10 flex items-center px-2 text-xs font-semibold text-slate-700 bg-white/80 border-r border-slate-300">
                {row.label}
              </div>

              <div className="absolute left-48 right-0 top-0 bottom-0">
                {log.events
                  .filter((e) => e.status === row.key)
                  .map((ev, ei) => (
                    <div
                      key={ei}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${(ev.start_hour / 24) * 100}%`,
                        width: `${((ev.end_hour - ev.start_hour) / 24) * 100}%`,
                        backgroundColor: row.barColor || 'transparent',
                        borderLeft: row.barColor !== 'transparent' ? '1px solid rgba(0,0,0,0.15)' : 'none',
                        borderRight: row.barColor !== 'transparent' ? '1px solid rgba(0,0,0,0.15)' : 'none',
                        minWidth: '2px',
                      }}
                    />
                  ))}

                {Array.from({ length: 25 }).map((_, hi) => {
                  const pct = (hi / 24) * 100;
                  const isMain = hi % 6 === 0;
                  return (
                    <div
                      key={hi}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${pct}%`,
                        borderLeft: isMain ? '2px solid #64748B' : '1px solid #CBD5E1',
                        height: isMain ? '100%' : '50%',
                        top: isMain ? '0' : '25%',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="absolute left-48 right-0 top-0" style={{ height: `${ROWS.length * 32}px`, pointerEvents: 'none' }}>
            {[0, 6, 12, 18, 24].map((h) => (
              <div
                key={h}
                className="absolute text-[10px] font-bold text-slate-600"
                style={{
                  left: `${(h / 24) * 100}%`,
                  top: `${ROWS.length * 32 + 2}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                {h === 24 ? '24' : h}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-400 px-3 py-2 text-xs bg-[#F8FAFC]">
          <div className="flex gap-4">
            {ROWS.map((row) => {
              const val = log.totals[row.key as keyof typeof log.totals] || 0;
              return (
                <span key={row.key} className="font-medium">
                  {row.label.split(' ')[0]}: <span className="font-bold">{val.toFixed(1)}h</span>
                </span>
              );
            })}
            <span className="text-slate-400">|</span>
            <span className="font-medium">
              Total:{' '}
              <span className="font-bold">
                {Object.values(log.totals).reduce((a, b) => a + b, 0).toFixed(1)}h
              </span>
            </span>
          </div>
        </div>

        <div className="border-t border-slate-400 px-3 py-2 bg-[#F1F5F9]">
          <div className="text-xs font-bold mb-1 text-[#1E3A5F]">REMARKS:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {log.remarks.length > 0 ? (
              log.remarks.map((r, i) => (
                <div key={i} className="text-xs text-slate-700">{r}</div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic">No remarks for this day</div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-400 px-3 py-2">
          <div className="text-xs font-bold mb-1 text-[#1E3A5F]">70-Hour / 8-Day Recap:</div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300">
                {['Day', '1', '2', '3', '4', '5', '6', '7', '8', 'Total'].map((h, i) => (
                  <th key={i} className="px-1 py-0.5 text-left font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {['Hours', ...recapHours.map(h => h.toFixed(1))].map((h, i) => (
                  <td
                    key={i}
                    className={`px-1 py-0.5 text-slate-700 ${i > 0 && i % 2 === 0 ? 'bg-[#F1F5F9]' : ''}`}
                  >
                    {h}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
