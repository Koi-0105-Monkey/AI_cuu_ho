import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMapEvents, LayersControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import IncidentCard from '../components/incidents/IncidentCard';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import {
  Warning, Users, CheckCircle, BellRinging, MapPin, Compass,
  BatteryHigh, BatteryLow, BatteryWarning, X, Robot, FirstAid, Clock, NavigationArrow
} from '@phosphor-icons/react';
import { setupLeafletIcons, incidentIcon, tripIcon } from '../utils/leafletIcons';

setupLeafletIcons();

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

// ─── Battery prediction helper ─────────────────────────────
// ~10% battery ≈ 1h of active GPS tracking (conservative)
function batteryEstimate(pct) {
  if (pct == null) return null;
  const minutes = Math.round((pct / 10) * 60);
  if (minutes < 60) return `~${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h${m.toString().padStart(2, '0')}p` : `~${h} giờ`;
}

// ─── Severity metadata ─────────────────────────────────────
const SEVERITY_META = {
  1: { label: 'Cấp 1 – Nhẹ',          color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-700/40' },
  2: { label: 'Cấp 2 – Thấp',          color: 'text-sky-400',     bg: 'bg-sky-950/60 border-sky-700/40' },
  3: { label: 'Cấp 3 – Trung bình',    color: 'text-amber-400',   bg: 'bg-amber-950/60 border-amber-700/40' },
  4: { label: 'Cấp 4 – Nghiêm trọng', color: 'text-orange-400',  bg: 'bg-orange-950/60 border-orange-700/40' },
  5: { label: 'Cấp 5 – Nguy kịch ❗',  color: 'text-red-400',     bg: 'bg-red-950/60 border-red-700/40' },
};

// ─── First-aid triage tips per incident type ───────────────
const TRIAGE_TIPS = {
  CRASH:  'Kiểm tra tình trạng bất tỉnh. Không di chuyển nạn nhân nếu nghi ngờ chấn thương cột sống. Cầm máu bằng băng ép trực tiếp.',
  LOST:   'Yêu cầu nạn nhân đứng yên tại chỗ, gõ vào cây/đá tạo tiếng động. Bật đèn pin lên cao. Tiết kiệm pin — tắt wifi, Bluetooth.',
  FIRE:   'Thoát ngược chiều gió. Tìm vùng trống hoặc đất trống. Che miệng mũi bằng vải ướt, cúi thấp dưới làn khói.',
  MED:    'Kiểm tra đường thở, hơi thở, mạch đập. Đặt nằm ngửa, kê đầu cao nếu bất tỉnh. Giữ ấm cơ thể. Không cho ăn uống nếu có thể phẫu thuật.',
  VEH:    'Tắt máy phương tiện, đặt cọc cảnh báo. Không hút thuốc gần hiện trường. Gọi 115 ngay lập tức.',
  MANUAL: 'Theo dõi tình trạng và giữ liên lạc với nạn nhân. Ghi lại tọa độ GPS cuối cùng (Last Known Position).',
};

// ─── Incident Detail Side Panel ───────────────────────────
function IncidentDetailPanel({ incident, onClose }) {
  const [track, setTrack] = useState([]);
  const sev  = SEVERITY_META[incident.severity] || SEVERITY_META[3];
  const tip  = TRIAGE_TIPS[incident.type] || TRIAGE_TIPS.MANUAL;
  const ent  = incident.extractedEntities;
  const bat  = incident.batteryAtTime;
  const est  = batteryEstimate(bat);

  useEffect(() => {
    if (!incident._id) return;
    api.get(`/incidents/${incident._id}/track`)
      .then(r => { if (r.data.success) setTrack(r.data.data || []); })
      .catch(() => {});
  }, [incident._id]);

  // Build timeline from raw GPS track + incident timestamps
  const events = [];
  const startTime = incident.tripId?.startedAt || incident.createdAt;
  if (startTime) events.push({ time: new Date(startTime), label: '🟢 Bắt đầu hành trình', dot: 'bg-emerald-500' });
  if (track.length > 2) {
    const mid = track[Math.floor(track.length / 2)];
    if (mid?.recordedAt) events.push({ time: new Date(mid.recordedAt), label: '🔵 Đang di chuyển trên cung đường', dot: 'bg-sky-500' });
    const preSOS = track[track.length - 2];
    if (preSOS?.recordedAt) events.push({ time: new Date(preSOS.recordedAt), label: '🟡 Tín hiệu GPS cuối trước SOS', dot: 'bg-amber-500' });
  }
  events.push({ time: new Date(incident.createdAt), label: `🚨 Kích hoạt SOS — ${incident.type}`, dot: 'bg-red-500' });
  if (bat != null && bat <= 20) events.push({ time: new Date(incident.createdAt), label: `🔋 Pin thấp cảnh báo: ${bat}%`, dot: 'bg-orange-500' });
  events.sort((a, b) => a.time - b.time);

  return (
    <div className="fixed top-0 right-0 h-full w-[340px] z-[2000] bg-[#0b0f18] border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden animate-fade-in">
      {/* Panel header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-800 ${sev.bg}`}>
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${sev.color}`}>{sev.label}</span>
          <p className="text-white font-bold text-sm mt-0.5">
            {incident.userId?.name || 'Ẩn danh'} — {incident.type}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Battery card */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            {bat != null && bat <= 15 ? <BatteryLow size={15} className="text-red-400" />
              : bat != null && bat <= 30 ? <BatteryWarning size={15} className="text-amber-400" />
              : <BatteryHigh size={15} className="text-emerald-400" />}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái Pin</span>
          </div>
          {bat != null ? (
            <>
              <div className="flex items-end gap-3">
                <span className={`text-3xl font-black tabular-nums ${bat <= 15 ? 'text-red-400' : bat <= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{bat}%</span>
                {est && (
                  <div className="pb-1">
                    <p className="text-[10px] text-slate-500">Ước tính còn</p>
                    <p className="text-sm font-bold text-slate-200">{est} hoạt động</p>
                  </div>
                )}
              </div>
              <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bat <= 15 ? 'bg-red-500' : bat <= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${bat}%` }} />
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500 italic">Không có dữ liệu pin</p>
          )}
        </div>

        {/* AI Triage card */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Robot size={15} className="text-violet-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Triage — Sơ cứu nhanh</span>
          </div>
          {ent?.incidentType && (
            <div className="mb-1.5">
              <p className="text-[10px] text-slate-500">Phân loại AI</p>
              <p className="text-sm font-bold text-violet-300">{ent.incidentType}</p>
            </div>
          )}
          {ent?.victimName && ent.victimName !== 'Chưa rõ' && (
            <div className="mb-1.5">
              <p className="text-[10px] text-slate-500">Nạn nhân</p>
              <p className="text-sm font-semibold text-white">{ent.victimName}</p>
            </div>
          )}
          {ent?.location && ent.location !== 'Chưa rõ' && (
            <div className="mb-1.5">
              <p className="text-[10px] text-slate-500">Địa điểm mô tả</p>
              <p className="text-xs text-slate-300">{ent.location}</p>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-slate-700/60">
            <div className="flex items-center gap-1.5 mb-1">
              <FirstAid size={12} className="text-amber-400" weight="fill" />
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Hướng dẫn sơ cứu</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{tip}</p>
          </div>
          {incident.voiceTranscript && (
            <div className="mt-2 pt-2 border-t border-slate-700/60">
              <p className="text-[10px] text-slate-500 mb-0.5">Transcript giọng nói</p>
              <p className="text-xs text-slate-400 italic">"{incident.voiceTranscript.slice(0, 130)}{incident.voiceTranscript.length > 130 ? '...' : ''}"</p>
            </div>
          )}
          {!ent && !incident.voiceTranscript && (
            <p className="text-xs text-slate-500 italic mt-2">SOS thủ công — chưa có phân tích AI</p>
          )}
        </div>

        {/* AI Confidence & Review Card */}
        {incident.severityBreakdown && (
          <div className={`border rounded-xl p-3 ${
            incident.severityBreakdown.needsManualReview 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : 'bg-slate-900 border-slate-700/60'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái AI Evaluation</span>
              {incident.severityBreakdown.needsManualReview && (
                <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-black uppercase animate-pulse">
                  ⚠️ Cần duyệt lại
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Độ tin cậy của AI:</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded ${
                incident.severityBreakdown.aiConfidence === 'High' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : incident.severityBreakdown.aiConfidence === 'Medium'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {incident.severityBreakdown.aiConfidence === 'High' ? 'CAO' : incident.severityBreakdown.aiConfidence === 'Medium' ? 'TRUNG BÌNH' : 'THẤP'}
              </span>
            </div>
            
            {incident.severityBreakdown.needsManualReview && (
              <p className="text-[10px] text-amber-300 italic mt-2 border-t border-amber-500/10 pt-1.5 leading-tight">
                * Có tín hiệu mâu thuẫn giữa mức khẩn cấp tự khai báo và thông số y tế/thiết bị thực tế. Trực ban cần ưu tiên kiểm tra.
              </p>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-sky-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhật ký Hành trình</span>
          </div>
          <div>
            {events.map((ev, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${ev.dot}`} />
                  {i < events.length - 1 && <div className="w-px flex-1 bg-slate-700 my-0.5" style={{ minHeight: 12 }} />}
                </div>
                <div className="pb-3 min-w-0">
                  <p className="text-[10px] text-slate-500 font-mono">{ev.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-xs text-slate-200 leading-tight">{ev.label}</p>
                </div>
              </div>
            ))}
            {/* Last Known Position */}
            <div className="flex gap-3">
              <NavigationArrow size={12} className="text-red-400 mt-0.5 shrink-0" weight="fill" />
              <div>
                <p className="text-[10px] text-slate-500">Last Known Position</p>
                <p className="text-xs font-mono text-red-300">
                  {incident.location?.coordinates
                    ? `${incident.location.coordinates[1].toFixed(5)}, ${incident.location.coordinates[0].toFixed(5)}`
                    : 'Không xác định'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full detail link */}
        <Link
          to={`/incidents/${incident._id}`}
          className="block text-center text-sm bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors"
        >
          Xem toàn bộ hồ sơ sự cố →
        </Link>
      </div>
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────
export default function Dashboard() {
  const [feed, setFeed] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedPos, setSelectedPos] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
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
    },
    'weather:alert': (data) => {
      playBeep();
      toast.error(`⛈️ Cảnh báo thời tiết nguy hiểm: ${data.weather?.description || 'Giông bão'} phát hiện tại chuyến đi của ${data.userName || 'Trekker'}!`, {
        duration: 8000,
        position: 'top-center'
      });
    }
  });

  const openCount = feed.filter(i => i.status === 'open').length;

  // Sắp xếp sự cố theo mức độ nghiêm trọng giảm dần (severity 5 -> 1)
  const sortedFeed = useMemo(
    () => [...feed].sort((a, b) => (b.severity || 0) - (a.severity || 0)),
    [feed]
  );

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
                  {sortedFeed.map((inc) => (
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
            </div>
            
            <MapContainer
              center={[16.0, 108.0]}
              zoom={6}
              className="w-full h-full min-h-[350px] flex-1"
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution='&copy; Google Maps'
              />



              {/* Tự chọn vị trí trực tiếp trên bản đồ qua Click */}
              <LocationPickerMarker selectedPos={selectedPos} setSelectedPos={setSelectedPos} />
              
              {/* Incident Markers + Rescue Radius Circles */}
              {activeIncidentsForMap.map((inc) => {
                const lat = inc.location.coordinates[1];
                const lng = inc.location.coordinates[0];
                const isSelected = selectedIncident?._id === inc._id;
                return (
                  <React.Fragment key={inc._id}>
                    <Marker
                      position={[lat, lng]}
                      icon={incidentIcon}
                      eventHandlers={{ click: () => setSelectedIncident(isSelected ? null : inc) }}
                    >
                      <Popup className="dark-popup">
                        <div className="text-slate-800 p-1 space-y-1.5 min-w-[200px]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-red-600 text-sm">🚨 {inc.type}</span>
                            <span className="text-xs bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">Cấp {inc.severity}</span>
                          </div>
                          <p className="text-xs font-semibold">Thành viên: {inc.userId?.name || 'Ẩn danh'}</p>
                          <p className="text-xs font-mono">{inc.userId?.phone}</p>
                          <p className="text-xs italic bg-slate-100 p-1.5 rounded border-l-2 border-red-500 text-slate-700">
                            "{inc.message || 'Không có tin nhắn đính kèm'}"
                          </p>
                          <button
                            onClick={() => setSelectedIncident(inc)}
                            className="block w-full text-center text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 rounded transition-colors mt-1"
                          >
                            📋 Mở hồ sơ SAR cứu hộ
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                    {/* Rescue Radius Circles — only shown for selected incident */}
                    {isSelected && (
                      <>
                        <Circle center={[lat, lng]} radius={1000}
                          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.04, weight: 1.5, dashArray: '6 4' }} />
                        <Circle center={[lat, lng]} radius={2000}
                          pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.03, weight: 1.5, dashArray: '6 4' }} />
                        <Circle center={[lat, lng]} radius={5000}
                          pathOptions={{ color: '#eab308', fillColor: '#eab308', fillOpacity: 0.02, weight: 1, dashArray: '6 4' }} />
                      </>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Trekking Trip Markers */}
              {activeTripsForMap.map((trip) => {
                const isRanger = trip.userId?.isRanger || trip.userId?.role === 'authority';
                if (isRanger) return null; // Ẩn kiểm lâm khỏi bản đồ theo scope rút gọn
                
                const lat = trip.lastKnownLocation.coordinates[1];
                const lng = trip.lastKnownLocation.coordinates[0];
                
                // Simplified geofencing check
                const inForbiddenZone = lat >= 22.32 && lat <= 22.36 && 
                  lng >= 103.76 && lng <= 103.82;

                const markerIcon = tripIcon;

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

      {/* SAR Incident Detail Panel — slides in from right on incident selection */}
      {selectedIncident && (
        <IncidentDetailPanel
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

