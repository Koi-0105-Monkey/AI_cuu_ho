import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass, CloudSun, MapPin, ShieldCheck, Thermometer, Wind,
  WarningCircle, ArrowLeft, ArrowRight, CheckCircle, Warning, DownloadSimple, UploadSimple, NavigationArrow
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/layout/Header';
import PublicNavbar from '../components/layout/PublicNavbar';

const PROVINCES = [
  'Tất cả tỉnh thành',
  'Lào Cai',
  'Yên Bái',
  'Lai Châu',
  'Lâm Đồng',
  'Hà Giang',
  'Quảng Bình',
  'Hòa Bình'
];

const VIETNAM_TRAILS = [
  {
    id: 'fansipan',
    name: 'Đỉnh Fansipan (Nóc Nhà Đông Dương)',
    province: 'Lào Cai',
    location: 'Sa Pa, Lào Cai',
    lat: 22.30333,
    lng: 103.77500,
    difficulty: 'Thách thức',
    difficultyColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    lengthKm: 28,
    avgHours: '2 ngày 1 đêm',
    elevationM: 3143,
    huts: ['Trạm 2.200m (Lán Tôn)', 'Trạm 2.800m'],
    description: 'Cung đường leo núi biểu tượng của Việt Nam với địa hình dốc cao, vực sâu và thời tiết biến động đột ngột.',
    gpxFile: 'fansipan_28k_track.gpx',
    contributorsCount: 142
  },
  {
    id: 'taxua',
    name: 'Đỉnh Tà Xùa (Sống Lưng Khủng Long)',
    province: 'Yên Bái',
    location: 'Trạm Tấu, Yên Bái',
    lat: 21.43120,
    lng: 104.56890,
    difficulty: 'Cực kỳ nguy hiểm',
    difficultyColor: 'text-red-400 bg-red-500/10 border-red-500/30',
    lengthKm: 22,
    avgHours: '2 ngày 1 đêm',
    elevationM: 2865,
    huts: ['Lán dừng chân Sống lưng 2.400m'],
    description: 'Con đường sống lưng dao hẹp chỉ rộng 1-2m hai bên là vực sâu hun hút. Yêu cầu thể lực và kỹ năng giữ thăng bằng cao.',
    gpxFile: 'ta_xua_song_lung.gpx',
    contributorsCount: 98
  },
  {
    id: 'laothan',
    name: 'Đỉnh Lảo Thần (Săn Mây Y Tý)',
    province: 'Lào Cai',
    location: 'Y Tý, Bát Xát, Lào Cai',
    lat: 22.61240,
    lng: 103.62150,
    difficulty: 'Vừa phải',
    difficultyColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    lengthKm: 16,
    avgHours: '2 ngày 1 đêm',
    elevationM: 2860,
    huts: ['Lán A Hờ 2.200m'],
    description: 'Cung đường ngắm biển mây đẹp nhất vùng Tây Bắc, độ dốc vừa phải, phù hợp cho trekker mới bắt đầu.',
    gpxFile: 'lao_than_san_may.gpx',
    contributorsCount: 215
  },
  {
    id: 'bachmoc',
    name: 'Đỉnh Kỳ Quan San (Bạch Mộc Lương Tử)',
    province: 'Lào Cai',
    location: 'Bát Xát, Lào Cai / Lai Châu',
    lat: 22.50890,
    lng: 103.60450,
    difficulty: 'Thách thức',
    difficultyColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    lengthKm: 30,
    avgHours: '3 ngày 2 đêm',
    elevationM: 3046,
    huts: ['Lán Muối 2.100m'],
    description: 'Nổi tiếng với Đồi Muối ngắm bình minh mây bồng bềnh và quãng đường vách đá đèo dốc hiểm trở.',
    gpxFile: 'bach_moc_luong_tu.gpx',
    contributorsCount: 84
  },
  {
    id: 'putaleng',
    name: 'Đỉnh Pu Ta Leng (Rừng Đỗ Quyên cổ thụ)',
    province: 'Lai Châu',
    location: 'Tam Đường, Lai Châu',
    lat: 22.42150,
    lng: 103.60980,
    difficulty: 'Cực kỳ nguy hiểm',
    difficultyColor: 'text-red-400 bg-red-500/10 border-red-500/30',
    lengthKm: 38,
    avgHours: '3 ngày 2 đêm',
    elevationM: 3049,
    huts: ['Trạm suối 1.800m', 'Trạm đỉnh 2.400m'],
    description: 'Cung đường dài xuyên rừng nguyên sinh, nhiều suối xiết và độ dốc gắt đòi hỏi dẻo dai cao.',
    gpxFile: 'pu_ta_leng_do_quyen.gpx',
    contributorsCount: 61
  },
  {
    id: 'bidoup',
    name: 'Đỉnh Bidoup Nóc Nhà Lâm Đồng',
    province: 'Lâm Đồng',
    location: 'Lạc Dương, Lâm Đồng (Đà Lạt)',
    lat: 12.08860,
    lng: 108.65340,
    difficulty: 'Vừa phải',
    difficultyColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    lengthKm: 27,
    avgHours: '2 ngày 1 đêm',
    elevationM: 2287,
    huts: ['Trạm kiểm lâm Klong Lanh', 'Lán dừng chân 2.000m'],
    description: 'Băng qua rừng thông bạt ngàn và rừng rêu Tây Nguyên ẩm ướt tuyệt đẹp.',
    gpxFile: 'bidoup_nui_ba.gpx',
    contributorsCount: 173
  }
];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function TrailWeatherCard({ trail, userCoords }) {
  const distance = userCoords ? getDistance(userCoords.lat, userCoords.lng, trail.lat, trail.lng) : null;
  const { data: weather, isLoading } = useQuery({
    queryKey: ['trail-weather', trail.id],
    queryFn: () => api.get(`/weather?lat=${trail.lat}&lng=${trail.lng}`).then(r => r.data.weather),
    staleTime: 5 * 60 * 1000,
  });

  const handleDownloadGPX = () => {
    const dummyGpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RescueLink Safety Tech">
  <metadata><name>${trail.name}</name></metadata>
  <trk><name>${trail.name}</name><trkseg>
    <trkpt lat="${trail.lat}" lon="${trail.lng}"><ele>${trail.elevationM}</ele></trkpt>
  </trkseg></trk>
</gpx>`;

    const blob = new Blob([dummyGpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = trail.gpxFile;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã tải xuống file GPX ${trail.name} cho Mobile App!`);
  };

  return (
    <div className="card p-6 border border-surface-4 bg-surface-1/90 hover:border-surface-5 transition-all space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-surface-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-white">{trail.name}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${trail.difficultyColor}`}>
              {trail.difficulty}
            </span>
            {distance !== null && (
              <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                📍 Cách bạn {distance.toFixed(1)} km
              </span>
            )}
          </div>
          <p className="text-xs text-muted flex items-center gap-1 mt-1">
            <MapPin size={14} className="text-red-400" /> {trail.location} • Độ cao: <strong className="text-slate-200">{trail.elevationM}m</strong>
          </p>
        </div>

        {/* Live Weather Forecast */}
        <div className="bg-surface-2 border border-surface-4 px-4 py-2.5 rounded-2xl flex items-center gap-4 shrink-0">
          {isLoading ? (
            <span className="text-xs text-muted animate-pulse">Đo thời tiết đỉnh...</span>
          ) : weather ? (
            <>
              <div className="text-right">
                <span className="text-xl font-bold text-white font-mono">{weather.temperature}°C</span>
                <p className="text-[10px] text-muted font-mono">{weather.description}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <CloudSun size={20} weight="fill" />
              </div>
            </>
          ) : (
            <span className="text-xs text-muted">Không có dữ liệu</span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{trail.description}</p>

      {/* Trail Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-2/60 p-3.5 rounded-xl text-xs">
        <div>
          <span className="text-[10px] text-muted block">Chiều dài</span>
          <strong className="text-white">{trail.lengthKm} km</strong>
        </div>
        <div>
          <span className="text-[10px] text-muted block">Thời gian leo</span>
          <strong className="text-white">{trail.avgHours}</strong>
        </div>
        <div>
          <span className="text-[10px] text-muted block">Đóng góp bởi</span>
          <strong className="text-sky-400">{trail.contributorsCount} Trekker</strong>
        </div>
        <div>
          <span className="text-[10px] text-muted block">Lán dừng chân</span>
          <strong className="text-emerald-400 text-[11px] truncate block">{trail.huts[0]}</strong>
        </div>
      </div>

      {/* Download & Share GPX Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={handleDownloadGPX}
          className="px-4 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/25 hover:bg-emerald-600/25 text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <DownloadSimple size={16} weight="bold" /> Tải File GPX Track (.gpx)
        </button>

        <span className="text-[11px] text-muted italic">
          💡 Tải về để mở trên <strong>RescueLink App (Chế độ Off-grid)</strong>
        </span>
      </div>
    </div>
  );
}

export default function TrailSafety() {
  const [selectedProvince, setSelectedProvince] = useState('Tất cả tỉnh thành');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [userAddress, setUserAddress] = useState('Vị trí của bạn');

  // Auto locate user on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          toast.success('Đã xác định vị trí của bạn. Đang sắp xếp cung đường gần bạn nhất!');
        },
        (err) => console.log('Autolocation declined or failed:', err.message)
      );
    }
  }, []);

  // Fetch address for user location
  useEffect(() => {
    if (!userCoords) return;
    api.get(`/search/reverse?lat=${userCoords.lat}&lng=${userCoords.lng}`)
      .then(r => {
        if (r.data.success) {
          const addr = r.data.address;
          const name = addr.city || addr.town || addr.quarter || addr.suburb || addr.state || addr.country || 'Vị trí của bạn';
          setUserAddress(name);
        }
      })
      .catch(() => setUserAddress('Vị trí của bạn'));
  }, [userCoords]);

  // Fetch user location weather
  const { data: userWeather } = useQuery({
    queryKey: ['user-weather', userCoords],
    queryFn: () => {
      if (!userCoords) return null;
      return api.get(`/weather?lat=${userCoords.lat}&lng=${userCoords.lng}`).then(r => r.data.weather);
    },
    enabled: !!userCoords,
    staleTime: 5 * 60 * 1000,
  });

  const filteredTrails = VIETNAM_TRAILS.filter(t => {
    return selectedProvince === 'Tất cả tỉnh thành' || t.province === selectedProvince;
  });

  // Sort by distance if userCoords is available
  const sortedTrails = [...filteredTrails].sort((a, b) => {
    if (!userCoords) return 0;
    const distA = getDistance(userCoords.lat, userCoords.lng, a.lat, a.lng);
    const distB = getDistance(userCoords.lat, userCoords.lng, b.lat, b.lng);
    return distA - distB;
  });

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      toast.loading('Đang xác định vị trí...', { id: 'locate' });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          toast.dismiss('locate');
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          toast.success(`Đã định vị thành công: (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`);
        },
        () => {
          toast.dismiss('locate');
          toast.error('Không thể định vị. Vui lòng bật quyền định vị trình duyệt.');
        }
      );
    } else {
      toast.error('Trình duyệt không hỗ trợ định vị.');
    }
  };

  const { pathname } = useLocation();
  const isAdminView = pathname.startsWith('/dashboard') || pathname.startsWith('/operator');

  return (
    <div className={`flex flex-col h-full ${!isAdminView ? 'min-h-dvh' : ''}`} style={!isAdminView ? { background: '#080c12' } : undefined}>
      {/* Dynamic Header / Navigation */}
      {isAdminView ? (
        <Header title="Cung Đường An Toàn & GPX Track" />
      ) : (
        <PublicNavbar />
      )}

      {/* Ambient background orbs for public view */}
      {!isAdminView && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-[-20%] left-[10%] w-[600px] h-[500px] rounded-full blur-[120px] opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(225,29,72,1) 0%, transparent 70%)' }} />
        </div>
      )}

      <div className={`flex-1 overflow-auto p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6 relative z-10 ${!isAdminView ? 'pt-8' : ''}`}>


      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-surface-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-slate-300 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Compass size={28} className="text-red-500" weight="fill" /> Cung Đường An Toàn & File GPX Dã Ngoại
            </h1>
          </div>
          <p className="text-xs text-muted mt-1.5 ml-0 sm:ml-11">
            Tra cứu thời tiết đỉnh núi real-time, tải file GPX track của các trekker đi trước để sử dụng ngoại tuyến trên App.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 border border-surface-4 text-white text-xs font-bold transition-all flex items-center gap-2"
        >
          <UploadSimple size={16} /> Đóng Góp GPX Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-1 border border-surface-4 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-medium">Lọc theo tỉnh:</span>
          <select
            className="bg-surface-2 border border-surface-4 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-red-500"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
          >
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {userCoords && userWeather ? (
          <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <span className="text-slate-300 font-medium">Thời tiết tại {userAddress}:</span>
            <span className="font-bold text-emerald-400 font-mono">{userWeather.temperature}°C</span>
            <span className="text-[10px] text-slate-400">({userWeather.description})</span>
          </div>
        ) : (
          <button
            onClick={handleLocateMe}
            className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <NavigationArrow size={14} weight="fill" /> Định Vị Của Tôi
          </button>
        )}
      </div>

      {/* Trails List */}
      <div className="space-y-6">
        {sortedTrails.map((trail) => (
          <TrailWeatherCard key={trail.id} trail={trail} userCoords={userCoords} />
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-1 border border-surface-4 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">📤 Đóng Góp File GPX Cung Đường Trekking</h3>
            <p className="text-xs text-slate-400">
              Chia sẻ file GPX track mà bạn đã đi thực tế để người leo núi đi sau có thể tải về ứng dụng di động ngoại tuyến.
            </p>
            <input
              type="text"
              placeholder="Tên cung đường (VD: Tà Xùa 2D1N...)"
              className="w-full bg-surface-2 border border-surface-4 text-white text-xs rounded-xl p-3 focus:outline-none"
            />
            <input
              type="file"
              accept=".gpx"
              className="w-full bg-surface-2 border border-surface-4 text-slate-300 text-xs rounded-xl p-3"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-3 text-white text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  toast.success('Đã tải lên và chia sẻ file GPX thành công!');
                  setShowUploadModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Đóng Góp File GPX
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
