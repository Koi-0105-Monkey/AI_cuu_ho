import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Tree, Users, Warning, Bell } from '@phosphor-icons/react';
import api from '../services/api';

const activeTrekkerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-40 animate-pulse"></div>
    <div class="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const emergencyTrekkerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-red-500 rounded-full opacity-60 animate-ping"></div>
    <div class="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Mock VQG Hoang Lin boundary polygon coordinates (Sapa area) for visual reference
const hoangLienBoundary = [
  [22.38, 103.75],
  [22.38, 103.88],
  [22.28, 103.88],
  [22.28, 103.75]
];

export default function AuthorityDashboard() {
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);

  // Query active trips
  const { data: tripsData } = useQuery({
    queryKey: ['authority-trips'],
    queryFn: () => api.get('/admin/trips/active').then(r => r.data.data || []),
    refetchInterval: 15_000
  });

  // Query active incidents
  const { data: incidentsData } = useQuery({
    queryKey: ['authority-incidents'],
    queryFn: () => api.get('/admin/incidents/active').then(r => r.data.data || []),
    refetchInterval: 10_000
  });

  useEffect(() => {
    if (tripsData) setActiveTrips(tripsData);
  }, [tripsData]);

  useEffect(() => {
    if (incidentsData) setActiveIncidents(incidentsData);
  }, [incidentsData]);

  const emergencyCount = activeIncidents.length;

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-6 p-6">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Tree size={22} className="text-emerald-500" />
            Giám Sát Vườn Quốc Gia Hoàng Liên
          </h1>
          <p className="text-xs text-slate-400">Hệ thống theo dõi thực địa & cứu nạn khẩn cấp VQG</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="stat-card bg-[#0b140f] border border-[#142a1e] p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase">Trekker Trong Vùng</span>
            <Users size={18} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums mt-1">
            {activeTrips.length}
          </p>
        </div>

        <div className="stat-card bg-[#0b140f] border border-[#142a1e] p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase">SOS Đang Hoạt Động</span>
            <Warning size={18} className={emergencyCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-500'} />
          </div>
          <p className={`text-3xl font-bold mt-1 tabular-nums ${emergencyCount > 0 ? 'text-red-400' : 'text-white'}`}>
            {emergencyCount}
          </p>
        </div>

        <div className="stat-card bg-[#0b140f] border border-[#142a1e] p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase">Đội Kiểm Lâm Trực Chiến</span>
            <Bell size={18} className="text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white mt-1">3 Trạm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[350px] overflow-hidden">
        {/* Left Column: Alerts Feed */}
        <div className="card p-0 flex flex-col overflow-hidden h-full">
          <div className="px-5 py-3 border-b border-[#142a1e] shrink-0 bg-[#070e0a] flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Cảnh báo khẩn cấp VQG</h2>
            {emergencyCount > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />}
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {activeIncidents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Khu vực an toàn. Không có sự cố khẩn cấp.</p>
            ) : (
              activeIncidents.map(inc => (
                <div key={inc._id} className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-red-400">🚨 SOS: {inc.type}</h3>
                    <span className="text-[10px] bg-red-950 text-red-400 font-bold px-1.5 py-0.5 rounded">
                      Cấp {inc.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">Trekker: <span className="font-semibold">{inc.userId?.name}</span></p>
                  <p className="text-[11px] text-slate-400 italic">"{inc.message || 'Không có tin nhắn đính kèm.'}"</p>
                  <p className="text-[10px] text-slate-500">{new Date(inc.createdAt).toLocaleTimeString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Geographic Monitor Map */}
        <div className="card p-0 overflow-hidden xl:col-span-2 h-full relative">
          <div className="absolute top-3 left-12 z-[1000] bg-[#070e0a]/90 border border-[#142a1e] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-4 text-[10px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-700/60 border border-emerald-500 inline-block" />
              <span className="text-slate-200">Ranh Giới VQG</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
              <span className="text-slate-200">Trekker</span>
            </div>
          </div>

          <MapContainer
            center={[22.33, 103.82]}
            zoom={12}
            className="w-full h-full min-h-[300px]"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {/* Draw VQG boundary */}
            <Polygon
              positions={hoangLienBoundary}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.08,
                weight: 2
              }}
            />

            {/* Trekker markers */}
            {activeTrips.map(trip => {
              const [lng, lat] = trip.lastKnownLocation?.coordinates || [];
              if (!lat || !lng) return null;
              return (
                <Marker
                  key={trip._id}
                  position={[lat, lng]}
                  icon={trip.status === 'emergency' ? emergencyTrekkerIcon : activeTrekkerIcon}
                >
                  <Popup>
                    <div className="text-slate-800 text-xs p-1 space-y-1">
                      <p className="font-bold">{trip.userId?.name}</p>
                      <p className="text-[10px]">Tuyến: {trip.routeName}</p>
                      <p className="text-[10px]">Pin: {trip.lastBattery}%</p>
                      <p className="text-[10px] text-slate-500">Đồng bộ cuối: {new Date(trip.lastSeen).toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
