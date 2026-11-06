import 'leaflet/dist/leaflet.css';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import type { GeoPoint } from '@civitrace/shared';

type Props = {
  point: GeoPoint;
  confirmationPoint?: GeoPoint; // citizen ne tasdeeq ki photo kahan se li
};

export function LocationMap({ point, confirmationPoint }: Props) {
  return (
    // relative z-0: map sidebar ke upar na aaye
    <div className="relative z-0 h-64 overflow-hidden rounded-lg border border-slate-200">
      <MapContainer
        center={[point.lat, point.lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {point.accuracyM && (
          <Circle
            center={[point.lat, point.lng]}
            radius={point.accuracyM}
            pathOptions={{ color: '#1f9e86', weight: 1, fillOpacity: 0.12 }}
          />
        )}
        <CircleMarker
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#16806c', fillOpacity: 1 }}
        >
          <Tooltip>Complaint location</Tooltip>
        </CircleMarker>
        {confirmationPoint && (
          <CircleMarker
            center={[confirmationPoint.lat, confirmationPoint.lng]}
            radius={7}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
          >
            <Tooltip>Citizen confirmation photo</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}