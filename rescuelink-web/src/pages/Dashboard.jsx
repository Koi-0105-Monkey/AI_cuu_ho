import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMapEvents } from 'react-leaflet';
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

import { LayersControl } from 'react-leaflet';

// Custom click listener component for Leaflet Map with Reverse Geocoding
function LocationPickerMarker({ selectedPos, setSelectedPos }) {
  const [address, setAddress] = useState('Đang tìm tên địa điểm...');

  useMapEvents({
    click(e) {
      setSelectedPos(e.latlng);
      setAddress('Đang tra cứu địa chỉ...');
      api.get(`/search/reverse?lat=${e.latlng.lat}&lng=${e.latlng.lng}`)
        .then(r => setAddress(r.data.display_name || `Tọa độ: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`))
        .catch(() => setAddress(`Tọa độ: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`));
      toast.success(`Đã ghim vị trí: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
    },
  });

  const handleCopyCoords = () => {
    if (selectedPos) {
      navigator.clipboard.writeText(`${selectedPos.lat.toFixed(5)}, ${selectedPos.lng.toFixed(5)}`);
      toast.success('Đã sao chép tọa độ GPS vào bộ nhớ tạm!');
    }
  };

  return selectedPos ? (
    <Marker position={selectedPos}>
      <Popup className="dark-popup">
        <div className="text-slate-800 p-2 space-y-1.5 min-w-[220px]">
          <span className="font-bold text-sky-600 text-xs flex items-center gap-1">📍 Vị trí ghim chọn trực tiếp</span>
          <p className="text-[11px] font-semibold text-slate-700 leading-tight border-b pb-1">{address}</p>
          <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
            <p>Vĩ độ (Lat): <strong>{selectedPos.lat.toFixed(5)}</strong></p>
            <p>Kinh độ (Lng): <strong>{selectedPos.lng.toFixed(5)}</strong></p>
          </div>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={handleCopyCoords}
              className="flex-1 text-center text-[10px] bg-sky-500 hover:bg-sky-600 text-white font-bold py-1 px-2 rounded transition-colors"
            >
              📋 Sao chép
            </button>
            <button
              onClick={() => setSelectedPos(null)}
              className="text-center text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-2 rounded transition-colors"
            >
              Bỏ chọn ❌
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

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

const fireHotspotIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-red-600 rounded-full opacity-60 animate-ping"></div>
    <div class="w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white z-10 shadow-lg flex items-center justify-center text-[9px] font-bold">🔥</div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const rangerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-40 animate-pulse"></div>
    <div class="w-3.5 h-3.5 bg-emerald-700 rounded-full border-2 border-white z-10 shadow-lg flex items-center justify-center text-[8px]">👮</div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const VQG_BOUNDS = [
  [22.38, 103.75],
  [22.38, 103.88],
  [22.28, 103.88],
  [22.28, 103.75]
];

const FORBIDDEN_ZONE = [
  [22.36, 103.76],
  [22.36, 103.82],
  [22.32, 103.82],
  [22.32, 103.76]
];

// Custom island labels for Hoang Sa & Truong Sa
const islandIcon = (name) => L.divIcon({
  html: `<div class="flex flex-col items-center justify-center">
    <div class="w-2.5 h-2.5 bg-yellow-500 rounded-full border border-red-600 shadow-md"></div>
    <div class="bg-slate-900/90 border border-slate-700 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap mt-1">
      ${name} (VN)
    </div>
  </div>`,
  className: 'custom-leaflet-island-icon',
  iconSize: [100, 36],
  iconAnchor: [50, 18]
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
  const [selectedPos, setSelectedPos] = useState(null);
  const feedRef = useRef(null);
  const qc = useQueryClient();

  // Load satellite hotspots
  const { data: hotspots = [] } = useQuery({
    queryKey: ['satellite-hotspots'],
    queryFn: () => api.get('/vqg/hotspots').then(r => r.data.data || []),
    refetchInterval: 30_000,
  });

  const createIncidentMutation = useMutation({
    mutationFn: (newIncident) => api.post('/incidents', newIncident),
    onSuccess: () => {
      qc.invalidateQueries(['active-incidents']);
      qc.invalidateQueries(['admin-stats']);
      toast.success('Đã tạo sự cố xác minh cháy rừng và phân công trạm kiểm lâm!');
    }
  });

  const handleVerifyHotspot = (hotspot) => {
    if (confirm(`Xác nhận phân công đội tuần tra kiểm lâm đi xác minh điểm nóng cháy vệ tinh tại [${hotspot.lat}, ${hotspot.lng}]?`)) {
      createIncidentMutation.mutate({
        type: 'FIRE',
        severity: hotspot.confidence === 'High' ? 5 : 4,
        lat: hotspot.lat,
        lng: hotspot.lng,
        message: `[FireWatch VN] Phát hiện điểm cháy rừng vệ tinh (${hotspot.satellite}), bức xạ nhiệt FRP ${hotspot.frp} MW. Cần kiểm lâm xác thực thực địa.`,
        batteryAtTime: 100
      });
    }
  };

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
            <div className="absolute top-3 left-12 z-[1000] bg-surface-2/90 border border-surface-4 px-3 py-1.5 rounded-lg shadow-lg flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block animate-pulse" />
                <span className="text-white font-medium">Sự cố khẩn cấp</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                <span className="text-white font-medium">Trekker</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-700 rounded-full inline-block animate-pulse" />
                <span className="text-white font-medium">Kiểm lâm tuần tra</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-orange-500 font-bold">🔥</span>
                <span className="text-white font-medium">Điểm cháy vệ tinh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-2 bg-red-500/20 border border-red-500 inline-block" />
                <span className="text-white font-medium">Vùng cấm VQG</span>
              </div>
            </div>
            
            <MapContainer
              center={[16.0, 108.0]}
              zoom={6}
              className="w-full h-full min-h-[350px] flex-1"
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="🗺️ OpenStreetMap Chi Tiết (Full Quán xá, ngõ hẻm)">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="🛰️ Ảnh Vệ Tinh Siêu Nét (Esri World Imagery)">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    maxZoom={18}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="🏔️ Bản Đồ Địa Hình Topo (OpenTopoMap)">
                  <TileLayer
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                    maxZoom={17}
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {/* Tự chọn vị trí trực tiếp trên bản đồ qua Click */}
              <LocationPickerMarker selectedPos={selectedPos} setSelectedPos={setSelectedPos} />

              {/* Vẽ Ranh giới VQG Hoàng Liên */}
              <Polygon
                positions={VQG_BOUNDS}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.05,
                  weight: 2
                }}
              />

              {/* Vẽ Phân khu cấm bảo vệ nghiêm ngặt */}
              <Polygon
                positions={FORBIDDEN_ZONE}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5, 5'
                }}
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

              {/* Satellite Fire Hotspots (MODIS/VIIRS) */}
              {hotspots.map((hs) => (
                <Marker
                  key={hs.id}
                  position={[hs.lat, hs.lng]}
                  icon={fireHotspotIcon}
                >
                  <Popup className="dark-popup">
                    <div className="text-slate-800 p-1 space-y-1.5 min-w-[200px]">
                      <span className="font-bold text-orange-600 text-sm">🔥 Điểm cháy vệ tinh</span>
                      <p className="text-xs font-semibold">Vệ tinh: {hs.satellite} ({hs.confidence})</p>
                      <p className="text-xs">Bức xạ nhiệt: <strong className="text-red-600">{hs.frp} MW</strong></p>
                      <p className="text-xs">Phát hiện lúc: {new Date(hs.acqTime).toLocaleTimeString()}</p>
                      <button
                        onClick={() => handleVerifyHotspot(hs)}
                        className="w-full text-center text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold py-1.5 rounded transition-colors mt-2"
                      >
                        Giao kiểm lâm xác minh 🚨
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Trekking Trip & Ranger Patrol Markers */}
              {activeTripsForMap.map((trip) => {
                const isRanger = trip.userId?.isRanger || trip.userId?.role === 'authority';
                const lat = trip.lastKnownLocation.coordinates[1];
                const lng = trip.lastKnownLocation.coordinates[0];
                
                // Simplified geofencing check
                const inForbiddenZone = !isRanger && 
                  lat >= 22.32 && lat <= 22.36 && 
                  lng >= 103.76 && lng <= 103.82;

                const markerIcon = isRanger ? rangerIcon : tripIcon;

                return (
                  <Marker
                    key={trip._id}
                    position={[lat, lng]}
                    icon={markerIcon}
                  >
                    <Popup className="dark-popup">
                      <div className="text-slate-800 p-1 space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${isRanger ? 'text-emerald-700' : 'text-emerald-600'}`}>
                            {isRanger ? '👮 Kiểm lâm tuần tra' : '🏃 Trekking'}
                          </span>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            Pin: {trip.lastBattery}%
                          </span>
                        </div>
                        {inForbiddenZone && (
                          <div className="bg-red-100 border border-red-300 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse mt-1">
                            ⚠️ CẢNH BÁO: Xâm nhập phân khu cấm
                          </div>
                        )}
                        <p className="text-xs font-semibold">Tên: {trip.userId?.name || 'Ẩn danh'}</p>
                        <p className="text-xs text-slate-600">Cung đường: <span className="font-medium text-slate-800">{trip.routeName || 'Chưa đặt tên'}</span></p>
                        <p className="text-[10px] text-slate-500">
                          Cập nhật: {new Date(trip.lastSeen).toLocaleTimeString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Quần đảo Hoàng Sa & Trường Sa thuộc chủ quyền Việt Nam */}
              <Marker position={[16.5, 112.0]} icon={islandIcon('Quần đảo Hoàng Sa')}>
                <Popup>
                  <div className="text-xs font-bold text-slate-800 text-center p-1">
                     Quần đảo Hoàng Sa<br/>(Việt Nam)
                  </div>
                </Popup>
              </Marker>
              <Marker position={[9.5, 112.5]} icon={islandIcon('Quần đảo Trường Sa')}>
                <Popup>
                  <div className="text-xs font-bold text-slate-800 text-center p-1">
                     Quần đảo Trường Sa<br/>(Việt Nam)
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
          
        </div>
      </div>
    </div>
  );
}

