import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Heartbeat, BatteryCharging, Clock, Compass, PhoneCall } from '@phosphor-icons/react';
import api from '../services/api';

// Config Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const activeMarkerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-8 h-8">
    <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-60 animate-ping"></div>
    <div class="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const emergencyMarkerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-8 h-8">
    <div class="absolute w-full h-full bg-red-500 rounded-full opacity-60 animate-ping"></div>
    <div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export default function FamilyView() {
  const { shareToken } = useParams();
  const [trip, setTrip] = useState(null);
  const [track, setTrack] = useState({ segments: [], rawPoints: [] });

  const VIETTEL_MAPS_KEY = import.meta.env.VITE_VIETTEL_MAPS_KEY || '';
  const TILE_URL = VIETTEL_MAPS_KEY 
    ? `https://maps.viettelmap.vn/api/v1/tile/{z}/{x}/{y}.png?key=${VIETTEL_MAPS_KEY}`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasEmergency, setHasEmergency] = useState(false);

  const fetchTripData = async () => {
    try {
      // 1. Get public trip details
      const tripRes = await api.get(`/family/trip/${shareToken}`);
      setTrip(tripRes.data.trip);

      // 2. Get public track
      const trackRes = await api.get(`/family/trip/${shareToken}/track`);
      setTrack(trackRes.data);

      // 3. Get incidents (if any)
      const incRes = await api.get(`/family/trip/${shareToken}/incidents`);
      setHasEmergency(incRes.data.hasOpenIncident);

    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kết nối máy chủ cứu hộ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripData();
    // Auto-refresh mỗi 30 giây
    const interval = setInterval(fetchTripData, 30_000);
    return () => clearInterval(interval);
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted text-sm font-medium">Đang đồng bộ tọa độ...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-6">
        <div className="card max-w-md w-full text-center space-y-4 py-8">
          <Compass size={48} className="text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Lỗi truy cập hành trình</h2>
          <p className="text-muted text-sm">{error || 'Hành trình không hợp lệ.'}</p>
        </div>
      </div>
    );
  }

  const [lng, lat] = trip.lastKnownLocation?.coordinates || [105.85, 21.02];
  const isTripEmergency = trip.status === 'emergency' || hasEmergency;

  // Render line cho hành trình
  const polylinePositions = track.rawPoints?.map(p => [p.lat, p.lng]) || [];

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className={`px-4 py-3 shrink-0 flex items-center justify-between border-b ${isTripEmergency ? 'bg-red-950/40 border-red-900/40' : 'bg-slate-900/40 border-slate-800'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isTripEmergency ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></div>
          <div>
            <h1 className="text-sm font-bold text-white">Theo dõi: {trip.trekker?.name}</h1>
            <p className="text-[10px] text-slate-400">Cung đường: {trip.routeName}</p>
          </div>
        </div>
        
        {isTripEmergency && (
          <div className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-red-900/20">
            <Heartbeat size={16} />
            CẢNH BÁO SOS
          </div>
        )}
      </header>

      {/* Map Area */}
      <div className="flex-1 relative overflow-hidden">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          className="w-full h-full"
        >
          <TileLayer
            url={TILE_URL}
            attribution='&copy; <a href="https://viettelmap.vn/">Viettel Maps</a>'
          />

          {polylinePositions.length > 0 && (
            <Polyline positions={polylinePositions} color="#10b981" weight={4} opacity={0.8} />
          )}

          <Marker
            position={[lat, lng]}
            icon={isTripEmergency ? emergencyMarkerIcon : activeMarkerIcon}
          >
            <Popup>
              <div className="text-slate-800 text-xs p-1">
                <p className="font-bold text-sm">{trip.trekker?.name}</p>
                <p className="text-slate-500">Pin hiện tại: {trip.lastBattery}%</p>
                <p className="text-slate-500 mt-1">
                  Cập nhật: {new Date(trip.lastSeen).toLocaleTimeString()}
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Info Sheet (Bottom HUD) */}
      <div className="shrink-0 p-4 bg-slate-950/80 border-t border-slate-900 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-medium">TRẠNG THÁI</span>
            <p className={`text-xs font-bold mt-1 ${isTripEmergency ? 'text-red-400' : 'text-emerald-400'}`}>
              {isTripEmergency ? 'CÓ SỰ CỐ' : 'BÌNH THƯỜNG'}
            </p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-medium">PIN THIẾT BỊ</span>
            <span className="flex items-center gap-1 mt-1 text-xs font-bold">
              <BatteryCharging size={16} className="text-emerald-400" />
              {trip.lastBattery}%
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-medium">ĐỒNG BỘ CUỐI</span>
            <span className="flex items-center gap-1 mt-1 text-xs font-bold">
              <Clock size={16} className="text-blue-400" />
              {new Date(trip.lastSeen).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {isTripEmergency && (
          <div className="bg-red-950/60 border border-red-900/60 rounded-xl p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-red-300">🚨 Đội Cứu Hộ Đã Nhận Tín Hiệu</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Tọa độ GPS khẩn cấp đã được gửi tới Trung tâm Cứu hộ và cơ quan Vườn Quốc Gia. Đội cứu hộ đang phối hợp xác định vị trí.
            </p>
            <div className="pt-1">
              <a
                href={`tel:113`}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <PhoneCall size={16} />
                Gọi Cơ Quan Cứu Hộ Địa Phương (113/115)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
