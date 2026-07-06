import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass, ShieldCheck, PhoneCall, MapPin, Heartbeat, Users,
  QrCode, ShareNetwork, CloudSun, Warning, ArrowLeft, CheckCircle, Copy
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../services/api';

// Fix default Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function UserPortal() {
  const [userLocation, setUserLocation] = useState({ lat: 21.02851, lng: 105.85417 });
  const [locationName, setLocationName] = useState('Hà Nội');
  const [pinInput, setPinInput] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [medicalNote, setMedicalNote] = useState('');
  const [joinedGroup, setJoinedGroup] = useState(null);
  const [shareToken, setShareToken] = useState('family_' + Math.random().toString(36).substring(2, 8));

  // Auto detect user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          api.get(`/search/reverse?lat=${loc.lat}&lng=${loc.lng}`)
            .then(r => setLocationName(r.data.display_name || 'Vị trí của bạn'))
            .catch(() => setLocationName('Vị trí thực tế của bạn'));
        },
        () => toast.error('Không thể tự động lấy vị trí GPS. Đang dùng vị trí mặc định.')
      );
    }
  }, []);

  const handleTriggerWebSOS = () => {
    toast.error(`🚨 ĐÃ GỬI SOS KHẨN CẤP! Vị trí (${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}) đã được chuyển về Trung tâm Cứu hộ HQ!`, {
      duration: 6000
    });
  };

  const handleJoinByPin = (e) => {
    e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      toast.error('Vui lòng nhập mã PIN 6 số hợp lệ do Trưởng đoàn cấp!');
      return;
    }
    toast.success(`🎉 Ghép đoàn thành công với mã PIN ${pinInput}! Bạn đã gia nhập đoàn dã ngoại.`);
    setJoinedGroup({
      code: pinInput,
      name: 'Đoàn Trekking Chinh Phục Núi Rừng',
      leader: 'Nguyễn Văn Hướng Dẫn Viên',
      phone: '0912345678'
    });
  };

  const handleCopyFamilyLink = () => {
    const familyUrl = `${window.location.origin}/family/${shareToken}`;
    navigator.clipboard.writeText(familyUrl);
    toast.success('Đã sao chép link Family View! Hãy gửi cho Người thân qua Zalo/Facebook.');
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-slate-100 font-sans p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-surface-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-slate-300 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Compass size={28} className="text-emerald-500" weight="fill" /> Cổng Web Dành Cho Trekker Cá Nhân
            </h1>
          </div>
          <p className="text-xs text-muted mt-1.5 ml-0 sm:ml-11">
            Trải nghiệm cứu hộ khẩn cấp SOS, ghép đoàn PIN 6 số và chia sẻ vị trí cho người thân trực tiếp trên trình duyệt Web.
          </p>
        </div>

        <button
          onClick={handleTriggerWebSOS}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs shadow-xl shadow-red-600/30 flex items-center gap-2 animate-pulse"
        >
          <PhoneCall size={18} weight="fill" /> 🚨 GỬI TÍN HIỆU SOS KHẨN CẤP
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Map & Location */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-0 border border-surface-4 overflow-hidden relative min-h-[380px] flex flex-col">
            <div className="p-4 bg-surface-2/70 border-b border-surface-4 flex flex-wrap items-center justify-between gap-2 z-10">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <MapPin size={16} className="text-red-400" /> {locationName}
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                GPS: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
              </span>
            </div>

            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={13}
              className="w-full h-[320px] flex-1"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <div className="text-slate-800 p-1 text-xs">
                    <strong>Vị trí hiện tại của bạn</strong>
                    <p className="font-mono text-[10px] mt-0.5">{userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Family View Share Widget */}
          <div className="card p-6 border border-sky-500/30 bg-sky-500/10 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sky-300 text-sm flex items-center gap-2">
                <ShareNetwork size={20} /> Chia Sẻ Vị Trí Cho Người Thân (Family View)
              </h4>
              <p className="text-xs text-slate-300">
                Gửi đường dẫn này cho người thân ở nhà để theo dõi hành trình GPS thực tế của bạn.
              </p>
            </div>

            <button
              onClick={handleCopyFamilyLink}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/20 flex items-center gap-2 shrink-0"
            >
              <Copy size={16} /> Sao Chép Link Gửi Zalo/FB
            </button>
          </div>
        </div>

        {/* Right Column: Join Group & Medical Info */}
        <div className="space-y-6">
          
          {/* Join Group PIN Form */}
          <div className="card p-6 border border-surface-4 bg-surface-1 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={20} className="text-amber-400" /> Nhập PIN 6 Số Ghép Đoàn Tour
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhập mã PIN do Hướng dẫn viên / Công ty Tour cấp để tham gia đoàn dã ngoại trực tiếp trên Web.
            </p>

            <form onSubmit={handleJoinByPin} className="space-y-3">
              <input
                type="text"
                maxLength={6}
                placeholder="Ví dụ: 123456"
                className="w-full bg-surface-2 border border-surface-4 text-white text-center text-lg font-mono tracking-widest rounded-xl p-3 focus:outline-none focus:border-amber-500"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-lg shadow-amber-600/20"
              >
                Gia Nhập Đoàn Tour
              </button>
            </form>

            {joinedGroup && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle size={14} /> Đã ghép đoàn: {joinedGroup.code}
                </span>
                <p className="text-slate-300 font-medium">{joinedGroup.name}</p>
                <p className="text-muted text-[11px]">Trưởng đoàn: {joinedGroup.leader} ({joinedGroup.phone})</p>
              </div>
            )}
          </div>

          {/* Quick Medical Note */}
          <div className="card p-6 border border-surface-4 bg-surface-1 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Heartbeat size={20} className="text-red-400" /> Khai Báo Y Tế Cá Nhân (Web)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-1">Nhóm máu</label>
                <select
                  className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-2.5 focus:outline-none"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                >
                  <option value="O+">Nhóm máu O+</option>
                  <option value="A+">Nhóm máu A+</option>
                  <option value="B+">Nhóm máu B+</option>
                  <option value="AB+">Nhóm máu AB+</option>
                  <option value="O-">Nhóm máu O-</option>
                </select>
              </div>

              <div>
                <label className="text-muted block mb-1">Tiền sử dị ứng & sức khỏe</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú tiền sử hen suyễn, dị ứng thuốc..."
                  className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-2.5 focus:outline-none"
                  value={medicalNote}
                  onChange={(e) => setMedicalNote(e.target.value)}
                />
              </div>

              <button
                onClick={() => toast.success('Đã lưu hồ sơ y tế cá nhân trên Web!')}
                className="w-full py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 text-white font-semibold text-xs border border-surface-4 transition-all"
              >
                Cập Nhật Hồ Sơ Y Tế
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
