import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import IncidentCard from '../components/incidents/IncidentCard';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import {
  Warning, Users, CheckCircle, BellRinging, MapPin, Compass
} from '@phosphor-icons/react';

// Fix default Leaflet icon for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pulsing icons for high-end look
const incidentIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-red-500 rounded-full opacity-60 animate-ping"></div>
    <div class="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const tripIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-40 animate-pulse"></div>
    <div class="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// ─── Stat Card ────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'text-muted-light', loading }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
        <Icon size={18} className={color} />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-surface-3 animate-pulse rounded" />
      ) : (
        <p className="text-3xl font-bold text-white tabular-nums">{value ?? '—'}</p>
      )}
    </div>
  );
}

// ─── Beep sound ───────────────────────────────────────────
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
};

// ─── Dashboard Page ────────────────────────────────────────
export default function Dashboard() {
  const [feed, setFeed] = useState([]);
  const [trips, setTrips] = useState([]);
  const feedRef = useRef(null);
  const qc = useQueryClient();

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data.stats),
    refetchInterval: 30_000,
  });

  // Initial active incidents for the feed
  const { data: activeIncidentsData } = useQuery({
    queryKey: ['active-incidents'],
    queryFn: () => api.get('/admin/incidents/active').then(r => r.data.data),
  });

  // Initial active trips
  const { data: activeTripsData } = useQuery({
    queryKey: ['active-trips'],
    queryFn: () => api.get('/admin/trips/active').then(r => r.data.data),
  });

  useEffect(() => {
    if (activeIncidentsData) setFeed(activeIncidentsData);
  }, [activeIncidentsData]);

  useEffect(() => {
    if (activeTripsData) setTrips(activeTripsData);
  }, [activeTripsData]);

  // Real-time updates via Socket.io
  useSocket({
    'incident:new': (incident) => {
      playBeep();
      toast.custom((t) => (
        <div className="bg-surface-2 border border-emergency-600/40 max-w-sm rounded-xl p-4 shadow-emergency animate-fade-in flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="text-sm font-bold text-red-400">Sự cố khẩn cấp mới!</span>
          </div>
          <p className="text-xs text-white">
            <span className="font-semibold">{incident.userId?.name}</span> báo sự cố <span className="font-bold text-red-300">{incident.type}</span>
          </p>
        </div>
      ), { duration: 6000 });
      setFeed(prev => {
        if (prev.find(i => i._id === incident._id)) return prev;
        return [incident, ...prev].slice(0, 50);
      });
      // Refetch stats to keep numbers fresh
      qc.invalidateQueries(['admin-stats']);
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    'incident:updated': (updated) => {
      if (updated.status === 'resolved') {
        // Remove from active feed
        setFeed(prev => prev.filter(i => i._id !== updated._id));
      } else {
        // Update in feed
        setFeed(prev => prev.map(i => i._id === updated._id ? updated : i));
      }
      qc.invalidateQueries(['admin-stats']);
    },
    'gps:update': (gpsData) => {
      // Realtime update user coordinates on the map
      setTrips(prev => prev.map(t => {
        if (t._id === gpsData.tripId) {
          return {
            ...t,
            lastBattery: gpsData.battery,
            lastKnownLocation: {
              type: 'Point',
              coordinates: [gpsData.lng, gpsData.lat]
            },
            lastSeen: new Date().toISOString()
          };
        }
        return t;
      }));
    }
  });

  const openCount = feed.filter(i => i.status === 'open').length;

  // Render maps markers
  const activeIncidentsForMap = feed.filter(i => i.location?.coordinates);
  const activeTripsForMap = trips.filter(t => t.lastKnownLocation?.coordinates);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="RescueLink Dispatch HQ" liveCount={openCount} />
      <div className="flex-1 overflow-auto p-6 space-y-6 flex flex-col min-h-0">
        
        {/* ─── Stats Row ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard
            label="Sự cố hôm nay" value={stats?.todayCount}
            icon={BellRinging} color="text-emergency-400" loading={statsLoading}
          />
          <StatCard
            label="Đang mở" value={stats?.openCount}
            icon={Warning} color="text-amber-400" loading={statsLoading}
          />
          <StatCard
            label="Đã xử lý" value={stats?.resolvedCount}
            icon={CheckCircle} color="text-safe-400" loading={statsLoading}
          />
          <StatCard
            label="Đang trekking" value={stats?.activeUsers}
            icon={Users} color="text-blue-400" loading={statsLoading}
          />
        </div>

        {/* ─── Main Columns: Alert Feed & Map ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[400px] overflow-hidden">
          
          {/* Left Column: Alert Feed */}
          <div className="card flex flex-col gap-0 p-0 overflow-hidden xl:col-span-1 h-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-4 shrink-0 bg-surface-2/50">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="live-dot" />
                Alert thời gian thực
              </h2>
              <span className="text-xs text-muted font-mono">{feed.length} sự cố</span>
            </div>
            <div ref={feedRef} className="overflow-y-auto flex-1">
              {feed.length === 0 ? (
                <div className="py-16 text-center text-muted text-sm flex flex-col items-center gap-2">
                  <CheckCircle size={32} className="text-safe-500 opacity-60" />
                  Không có sự cố nào đang mở.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-surface-4">
                  {feed.map((inc) => (
                    <div key={inc._id} className="px-4 py-3 hover:bg-surface-3 transition-colors">
                      <IncidentCard incident={inc} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Monitor Map */}
          <div className="card p-0 overflow-hidden xl:col-span-2 h-full relative flex flex-col">
            <div className="absolute top-3 left-12 z-[1000] bg-surface-2/90 border border-surface-4 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block animate-pulse" />
                <span className="text-white font-medium">Sự cố khẩn cấp</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                <span className="text-white font-medium">Người đang trekking</span>
              </div>
            </div>
            
            <MapContainer
              center={[16.0, 108.0]}
              zoom={6}
              className="w-full h-full min-h-[350px] flex-1"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                maxZoom={19}
              />
              
              {/* Incident Markers */}
              {activeIncidentsForMap.map((inc) => (
                <Marker
                  key={inc._id}
                  position={[inc.location.coordinates[1], inc.location.coordinates[0]]}
                  icon={incidentIcon}
                >
                  <Popup className="dark-popup">
                    <div className="text-slate-800 p-1 space-y-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-600 text-sm">🚨 {inc.type}</span>
                        <span className="text-xs bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                          Cấp {inc.severity}
                        </span>
                      </div>
                      <p className="text-xs font-semibold">Thành viên: {inc.userId?.name || 'Ẩn danh'}</p>
                      <p className="text-xs font-mono">{inc.userId?.phone}</p>
                      <p className="text-xs italic bg-slate-100 p-1.5 rounded border-l-2 border-red-500 text-slate-700">
                        "{inc.message || 'Không có tin nhắn đính kèm'}"
                      </p>
                      <div className="pt-1">
                        <Link
                          to={`/incidents/${inc._id}`}
                          className="block text-center text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-1 rounded transition-colors"
                        >
                          Xem chi tiết cứu hộ
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Trekking Trip Markers */}
              {activeTripsForMap.map((trip) => (
                <Marker
                  key={trip._id}
                  position={[trip.lastKnownLocation.coordinates[1], trip.lastKnownLocation.coordinates[0]]}
                  icon={tripIcon}
                >
                  <Popup className="dark-popup">
                    <div className="text-slate-800 p-1 space-y-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-600 text-sm">🏃 Trekking</span>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          Pin: {trip.lastBattery}%
                        </span>
                      </div>
                      <p className="text-xs font-semibold">Thành viên: {trip.userId?.name || 'Ẩn danh'}</p>
                      <p className="text-xs text-slate-600">Cung đường: <span className="font-medium text-slate-800">{trip.routeName || 'Chưa đặt tên'}</span></p>
                      <p className="text-[10px] text-slate-500">
                        Cập nhật: {new Date(trip.lastSeen).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
        </div>
      </div>
    </div>
  );
}

