import { useState, useEffect, useRef, type ReactNode } from 'react';
import { TripFormData } from '../types/trip';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  loading: boolean;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

function AutocompleteInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string | ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function fetchSuggestions(query: string) {
    if (query.length < 3) {
      setSuggestions([]);
      setShow(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`,
          { headers: { 'User-Agent': 'DriverLedger/1.0' } }
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShow(true);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0"
              onClick={() => {
                onChange(s.display_name);
                setOpen(false);
                setShow(false);
              }}
            >
              {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripForm({ onSubmit, loading }: TripFormProps) {
  const [currentLocation, setCurrentLocation] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cycleUsed, setCycleUsed] = useState(24.5);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentLocation || !pickupLocation || !dropoffLocation) return;
    onSubmit({
      current_location: currentLocation,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      current_cycle_used: cycleUsed,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Plan Your Trip
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <AutocompleteInput
          label={
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Current Location
            </span>
          }
          value={currentLocation}
          onChange={setCurrentLocation}
          placeholder="e.g. Chicago, IL"
        />
        <AutocompleteInput
          label={
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pickup Location
            </span>
          }
          value={pickupLocation}
          onChange={setPickupLocation}
          placeholder="e.g. St. Louis, MO"
        />
        <AutocompleteInput
          label={
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Dropoff Location
            </span>
          }
          value={dropoffLocation}
          onChange={setDropoffLocation}
          placeholder="e.g. Dallas, TX"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Current Cycle Used (0–70 hrs)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={cycleUsed}
            onChange={(e) => {
              const raw = e.target.value.replace(',', '.');
              const val = parseFloat(raw);
              if (!isNaN(val) && val >= 0 && val <= 70) setCycleUsed(val);
              else if (raw === '' || raw === '.') setCycleUsed(0);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
          />
          <input
            type="range"
            min={0}
            max={70}
            step={0.5}
            value={cycleUsed}
            onChange={(e) => setCycleUsed(parseFloat(e.target.value))}
            className="w-full mt-2 accent-blue-800"
          />
          <div className="text-xs text-slate-500 mt-1">{cycleUsed.toFixed(1)} hrs used / 70 hrs</div>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading || !currentLocation || !pickupLocation || !dropoffLocation}
        className="w-full py-3 bg-[#1E3A5F] text-white font-semibold rounded-lg hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-base"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Planning Route...
          </span>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            Plan Trip
          </>
        )}
      </button>
    </form>
  );
}
