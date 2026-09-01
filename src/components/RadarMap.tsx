import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { WirelessPoint } from '../services/wirelessService';

// Исправление стандартного бага Leaflet с путями к иконкам маркеров в сборщиках Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RadarMapProps {
  points: WirelessPoint[];
  selectedPoint?: WirelessPoint | null;
}

export const RadarMap: React.FC<RadarMapProps> = ({ points, selectedPoint }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Инициализация карты
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [47.0105, 28.8638], // Центр по умолчанию
        zoom: 13,
        attributionControl: false,
      });

      // Свободная подложка OpenStreetMap без водяных знаков и API-ключей
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ position: 'bottomright' })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
        .addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Обновление маркеров при изменении списка точек
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (points.length === 0) return;

    const bounds = L.latLngBounds([]);

    points.forEach((point) => {
      const latLng: [number, number] = [point.latitude, point.longitude];
      bounds.extend(latLng);

      // Круг радиуса погрешности
      if (point.accuracyMeters) {
        L.circle(latLng, {
          radius: point.accuracyMeters,
          color: '#06b6d4', // Cyan
          fillColor: '#06b6d4',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(layerGroup);
      }

      // Кастомный неоновый маркер
      const customIcon = L.divIcon({
        className: 'custom-radar-pin',
        html: `<div style="
          width: 14px;
          height: 14px;
          background: #06b6d4;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px #06b6d4, 0 0 20px #0891b2;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(layerGroup);

      // Всплывающее окно
      marker.bindPopup(`
        <div style="color: #0f172a; font-family: monospace; font-size: 12px; line-height: 1.4;">
          <strong style="font-size: 13px; color: #0284c7;">${point.ssid || '&lt;Скрытая сеть&gt;'}</strong><br/>
          <b>BSSID:</b> ${point.bssid}<br/>
          <b>Шифрование:</b> ${point.encryption || 'N/A'}<br/>
          <b>Канал:</b> ${point.channel || 'N/A'}<br/>
          <b>Координаты:</b> ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}<br/>
          <b>Источник:</b> <span style="color: #059669;">${point.source}</span>
        </div>
      `);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [points]);

  // Фокус на конкретной выбранной точке
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPoint) return;

    map.setView([selectedPoint.latitude, selectedPoint.longitude], 16, {
      animate: true,
    });
  }, [selectedPoint]);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
      <div ref={mapContainerRef} className="w-full h-full z-0 radar-dark-map" />
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-10 pointer-events-none">
          <p className="text-zinc-400 font-mono text-sm">
            Введите BSSID или запустите сканирование для отображения на карте
          </p>
        </div>
      )}
    </div>
  );
};
