import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { HostWithDistance } from '../utils/chargingLogic';

interface InteractiveMapProps {
  hosts: HostWithDistance[];
  driverLat: number;
  driverLng: number;
  driverLabel: string;
  selectedHostId: string | null;
  onSelectHost: (host: HostWithDistance) => void;
  onRequestCharge: (host: HostWithDistance) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  hosts,
  driverLat,
  driverLng,
  driverLabel,
  selectedHostId,
  onSelectHost,
  onRequestCharge,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [driverLat, driverLng],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update center when driver location changes significantly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([driverLat, driverLng], map.getZoom(), { animate: true });
  }, [driverLat, driverLng]);

  // Render markers and obfuscated privacy circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Driver marker
    const driverIcon = L.divIcon({
      className: 'custom-driver-marker',
      html: `<div style="
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        background: #0F172A;
        border: 3px solid #FFFFFF;
        box-shadow: 0 2px 8px rgba(15,23,42,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        font-size: 10px;
        font-weight: 700;
      ">YOU</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon });
    driverMarker.bindTooltip(`Your Location: ${driverLabel}`, { direction: 'top', offset: [0, -12] });
    driverMarker.addTo(layerGroup);

    hosts.forEach((host) => {
      const isSelected = host.id === selectedHostId;
      const color =
        host.availabilityStatus === 'Available'
          ? '#16A34A'
          : host.availabilityStatus === 'Busy'
          ? '#D97706'
          : '#64748B';

      // Draw obfuscated privacy zone circle (~350m radius) so exact home addresses remain protected
      L.circle([host.publicLat, host.publicLng], {
        radius: host.privacyRadiusMeters || 350,
        color,
        weight: isSelected ? 2 : 1,
        fillColor: color,
        fillOpacity: isSelected ? 0.18 : 0.08,
        dashArray: '4 4',
      }).addTo(layerGroup);

      const hostIcon = L.divIcon({
        className: 'custom-host-marker',
        html: `<div style="
          padding: 4px 8px;
          border-radius: 6px;
          background: ${isSelected ? '#0F172A' : '#FFFFFF'};
          color: ${isSelected ? '#FFFFFF' : '#0F172A'};
          border: 2px solid ${color};
          box-shadow: 0 2px 6px rgba(15,23,42,0.18);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        ">
          <span>₹${host.pricePerKwh}</span>
          <span style="opacity:0.65;">·</span>
          <span>${host.powerOutputKw}kW</span>
        </div>`,
        iconSize: [86, 28],
        iconAnchor: [43, 14],
      });

      const marker = L.marker([host.publicLat, host.publicLng], { icon: hostIcon });
      marker.on('click', () => {
        onSelectHost(host);
      });

      const popupContainer = document.createElement('div');
      popupContainer.style.minWidth = '230px';
      popupContainer.innerHTML = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">
            ${host.isDemo ? 'DEMO DATA · ' : 'COMMUNITY VERIFIED · '}${host.category} · ${host.availabilityStatus}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
            ${host.stationName}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">
            ${host.locality} (Obfuscated ~${host.privacyRadiusMeters}m zone)
          </div>
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-variant-numeric: tabular-nums; font-weight: 600; font-size: 12px; color: #0F172A; margin-bottom: 8px;">
            ₹${host.pricePerKwh}/kWh · ${host.powerOutputKw} kW · ${host.distanceKm} km away
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 10px;">
            Connectors: ${host.connectors.join(', ')}
          </div>
          <button
            type="button"
            data-host-request="${host.id}"
            style="
              width: 100%;
              padding: 7px 12px;
              background: #0F172A;
              color: #FFFFFF;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            Request Emergency Charge
          </button>
        </div>
      `;

      const btn = popupContainer.querySelector('button');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          onRequestCharge(host);
        });
      }

      marker.bindPopup(popupContainer);
      marker.addTo(layerGroup);

      if (isSelected) {
        marker.openPopup();
      }
    });
  }, [hosts, driverLat, driverLng, driverLabel, selectedHostId, onSelectHost, onRequestCharge]);

  return (
    <div className="relative w-full h-[380px] lg:h-[520px] bg-slate-100 rounded-lg border border-slate-200 overflow-hidden" data-testid="nearby-map-container">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Privacy & Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">Map Legend:</span>
          <span>Green Border: Available</span>
          <span aria-hidden="true">·</span>
          <span>Amber Border: Busy</span>
          <span aria-hidden="true">·</span>
          <span>Dashed Circle: ~350m Home Privacy Zone</span>
        </div>
        <div className="text-slate-500">
          Exact home street addresses unlock only after host accepts booking.
        </div>
      </div>
    </div>
  );
};
