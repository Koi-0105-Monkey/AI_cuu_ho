import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Compass, CloudSun, MapPin, ShieldCheck, Thermometer, Wind,
  WarningCheck, ArrowLeft, ArrowRight, CheckCircle, Warning
} from '@phosphor-icons/react';
import api from '../services/api';

const VIETNAM_TRAILS = [
  {
    id: 'fansipan',
    name: 'Đỉnh Fansipan (Nóc Nhà Đông Dương)',
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
    status: 'Bình thường'
  },
  {
    id: 'taxua',
    name: 'Đỉnh Tà Xùa (Sống Lưng Khủng Long)',
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
    status: 'Cảnh báo sương mù'
  },
  {
    id: 'laothan',
    name: 'Đỉnh Lảo Thần (Săn Mây Y Tý)',
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
    status: 'Thời tiết đẹp'
  },
  {
    id: 'bachmoc',
    name: 'Đỉnh Kỳ Quan San (Bạch Mộc Lương Tử)',
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
    status: 'Bình thường'
  },
  {
    id: 'putaleng',
    name: 'Đỉnh Pu Ta Leng (Rừng Đỗ Quyên cổ thụ)',
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
    status: 'Mưa rào rải rác'
  }
];

function TrailWeatherCard({ trail }) {
  const { data: weather, isLoading } = useQuery({
    queryKey: ['trail-weather', trail.id],
    queryFn: () => api.get(`/weather?lat=${trail.lat}&lng=${trail.lng}`).then(r => r.data.weather),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="card p-6 border border-surface-4 bg-surface-1/90 hover:border-surface-5 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-surface-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{trail.name}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${trail.difficultyColor}`}>
              {trail.difficulty}
            </span>
          </div>
          <p className="text-xs text-muted flex items-center gap-1 mt-1">
            <MapPin size={14} className="text-red-400" /> {trail.location} • Độ cao: <strong className="text-slate-200">{trail.elevationM}m</strong>
          </p>
        </div>

        {/* Live Weather Forecast */}
        <div className="bg-surface-2 border border-surface-4 px-4 py-2.5 rounded-2xl flex items-center gap-4 shrink-0">
          {isLoading ? (
            <span className="text-xs text-muted animate-pulse">Đo thời tiết...</span>
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

      <p className="text-xs text-slate-300 mt-4 leading-relaxed">{trail.description}</p>

      {/* Trail Info Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-2/60 p-3 rounded-xl text-xs">
        <div>
          <span className="text-[10px] text-muted block">Chiều dài</span>
          <strong className="text-white">{trail.lengthKm} km</strong>
        </div>
        <div>
          <span className="text-[10px] text-muted block">Thời gian leo</span>
          <strong className="text-white">{trail.avgHours}</strong>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] text-muted block">Điểm lán trại</span>
          <strong className="text-emerald-400 text-[11px]">{trail.huts.join(', ')}</strong>
        </div>
      </div>
    </div>
  );
}

export default function TrailSafety() {
  return (
    <div className="min-h-screen bg-[#090b0e] text-slate-100 font-sans p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-surface-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/home" className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-slate-300 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Compass size={28} className="text-red-500" weight="fill" /> Tra Cứu Cung Đường An Toàn Việt Nam
            </h1>
          </div>
          <p className="text-xs text-muted mt-1.5 ml-11">
            Thời tiết đỉnh núi thực tế từ Open-Meteo, thông số kỹ thuật đèo dốc và danh sách lán trại dừng chân.
          </p>
        </div>

        <Link
          to="/operator/groups"
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
        >
          Doanh Nghiệp Tạo Tour <ArrowRight size={14} />
        </Link>
      </div>

      {/* Safety Notice Banner */}
      <div className="card p-5 border border-amber-500/30 bg-amber-500/10 flex items-start gap-4">
        <Warning size={24} className="text-amber-400 shrink-0 mt-0.5" weight="fill" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-amber-300">Khuyến Cáo Khẩn Cấp Khi Trekking Vùng Núi Tây Bắc</h4>
          <p className="text-slate-300 leading-relaxed">
            Trước khi khởi hành, tất cả Trekker cần đăng ký chuyến đi trên ứng dụng di động <strong>RescueLink App</strong> để kích hoạt tính năng định vị ngầm thích ứng và dự phòng nén tin nhắn SMS SOS khi mất sóng 4G/5G.
          </p>
        </div>
      </div>

      {/* Trails List */}
      <div className="space-y-6">
        {VIETNAM_TRAILS.map((trail) => (
          <TrailWeatherCard key={trail.id} trail={trail} />
        ))}
      </div>

    </div>
  );
}
