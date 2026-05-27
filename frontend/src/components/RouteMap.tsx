import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Stop } from '../types/trip';

function createIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:18px;height:18px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

const ICONS: Record<string, string> = {
  pickup: '#3B82F6',
  dropoff: '#22C55E',
  rest: '#A855F7',
  fuel: '#F59E0B',
  break_30min: '#14B8A6',
  driving: '#6B7280',
};

function getStopEmoji(type: string) {
  switch (type) {
    case 'pickup': return '📦';
    case 'dropoff': return '🏠';
    case 'rest': return '😴';
    case 'fuel': return '⛽';
    case 'break_30min': return '☕';
    default: return '📍';
  }
}

function getStopLabel(type: string) {
  switch (type) {
    case 'pickup': return 'Pickup';
    case 'dropoff': return 'Dropoff';
    case 'rest': return 'Rest';
    case 'fuel': return 'Fuel';
    case 'break_30min': return '30-min Break';
    default: return 'Stop';
  }
}

interface RouteMapProps {
  routeCoordinates: [number, number][];
  stops: Stop[];
}

export default function RouteMap({ routeCoordinates, stops }: RouteMapProps) {
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoordinates]);

  const visibleStops = stops.filter((s) => s.type !== 'driving' && s.lat !== 0 && s.lng !== 0);

  const legend = [
    { color: '#3B82F6', label: 'Pickup' },
    { color: '#22C55E', label: 'Dropoff' },
    { color: '#A855F7', label: 'Rest' },
    { color: '#F59E0B', label: 'Fuel' },
    { color: '#14B8A6', label: '30-min Break' },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
      <div className="bg-[#1E3A5F] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="font-bold text-sm">Route Overview</span>
        </div>
        <div className="flex items-center gap-3">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
              <span className="text-[10px] text-blue-200">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[450px]">
        <MapContainer
          center={[39.8283, -98.5795]}
          zoom={4}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeCoordinates.length > 0 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.8 }}
            />
          )}
          {visibleStops.map((stop, i) => (
            <Marker
              key={i}
              position={[stop.lat, stop.lng]}
              icon={createIcon(ICONS[stop.type] || '#6B7280')}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{getStopEmoji(stop.type)} {getStopLabel(stop.type)}</div>
                  <div>{stop.location_name}</div>
                  <div>Arrive: {stop.arrival_time}</div>
                  <div>Duration: {stop.duration_hours}h</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
