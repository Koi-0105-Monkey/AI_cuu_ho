import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Users, Warning, Compass, MapPin } from '@phosphor-icons/react';
import api from '../../services/api';

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

export default function OperatorDashboard() {
  const [activeTrips, setActiveTrips] = useState([]);

  // Fetch operator statistics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['operator-analytics'],
    queryFn: () => api.get('/operators/analytics').then(r => r.data.stats),
    refetchInterval: 30_000
  });

  // Fetch active trips of this operator
  const { data: tripsData, refetch: refetchTrips } = useQuery({
    queryKey: ['operator-trips'],
    queryFn: () => api.get('/operators/trips').then(r => r.data.groups),
    refetchInterval: 15_000
  });

  useEffect(() => {
    if (tripsData) {
      // Flatten all members/trips from groups
      const allActiveTrips = tripsData
        .filter(g => g.status === 'active')
        .flatMap(g => 
          g.memberTripIds.map(trip => ({
            ...trip,
            groupName: g.groupName,
            leaderName: g.leaderId?.name || 'Chưa phân công'
          }))
        );
      setActiveTrips(allActiveTrips);
    }
  }, [tripsData]);

  // Check if any trip is in emergency
  const emergencyCount = activeTrips.filter(t => t.status === 'emergency').length;

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-6 p-6">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bảng điều khiển Nhà điều hành</h1>
          <p className="text-xs text-muted">Giám sát các đoàn trekking và hướng dẫn viên của bạn</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wider">Đoàn đang leo</span>
            <Compass size={18} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums mt-1">
            {analyticsLoading ? '...' : analytics?.activeGroups || 0}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wider">Tổng thành viên đang trekking</span>
            <Users size={18} className="text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums mt-1">
            {activeTrips.length}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wider">Sự cố khẩn cấp</span>
            <Warning size={18} className={emergencyCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'} />
          </div>
          <p className={`text-3xl font-bold mt-1 tabular-nums ${emergencyCount > 0 ? 'text-red-400' : 'text-white'}`}>
            {emergencyCount}
          </p>
        </div>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[350px] overflow-hidden">
        {/* Left column: List of active groups */}
        <div className="card p-0 flex flex-col overflow-hidden h-full">
          <div className="px-5 py-3 border-b border-surface-4 shrink-0 bg-surface-2/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Danh sách đoàn đang leo</h2>
            <span className="text-xs text-muted font-mono">{tripsData?.filter(g => g.status === 'active').length || 0} đoàn</span>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {tripsData?.filter(g => g.status === 'active').length === 0 ? (
              <p className="text-xs text-muted text-center py-12">Hiện không có đoàn nào đang leo núi.</p>
            ) : (
              tripsData?.filter(g => g.status === 'active').map(g => (
                <div key={g._id} className="bg-surface-3 border border-surface-4 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white">{g.groupName}</h3>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-900/40">
                      Đang leo
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Tuyến: {g.routeName}</p>
                  <p className="text-[10px] text-slate-400">HDV: <span className="font-semibold text-white">{g.leaderId?.name || 'Chưa gán'}</span></p>
                  <div className="border-t border-surface-4 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Thành viên: {g.memberTripIds?.length || 0}</span>
                    <span>SOS: {g.memberTripIds?.filter(m => m.status === 'emergency').length || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Monitor Map */}
        <div className="card p-0 overflow-hidden xl:col-span-2 h-full relative">
          <MapContainer
            center={[16.0, 108.0]}
            zoom={6}
            className="w-full h-full min-h-[300px]"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {activeTrips.map(trip => {
              const [lng, lat] = trip.lastKnownLocation?.coordinates || [];
              if (!lat || !lng) return null;
              const isEmergency = trip.status === 'emergency';
              return (
                <Marker
                  key={trip._id}
                  position={[lat, lng]}
                  icon={isEmergency ? emergencyTrekkerIcon : activeTrekkerIcon}
                >
                  <Popup>
                    <div className="text-slate-800 text-xs p-1 space-y-1">
                      <p className="font-bold">{trip.userId?.name || 'Trekker'}</p>
                      <p className="text-[10px]">Đoàn: {trip.groupName}</p>
                      <p className="text-[10px]">HDV phụ trách: {trip.leaderName}</p>
                      <p className="text-[10px]">Pin: {trip.lastBattery}%</p>
                      <p className="text-[10px] text-slate-500">
                        Cập nhật cuối: {new Date(trip.lastSeen).toLocaleTimeString()}
                      </p>
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
