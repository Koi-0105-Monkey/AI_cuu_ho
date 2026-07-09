import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass, ShieldCheck, PhoneCall, MapPin, Heartbeat, Users,
  ShareNetwork, Warning, ArrowLeft, CheckCircle, Copy, Info
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/layout/Header';
import PublicNavbar from '../components/layout/PublicNavbar';
import { setupLeafletIcons } from '../utils/leafletIcons';

setupLeafletIcons();

export default function UserPortal() {
  const [userLocation, setUserLocation] = useState({ lat: 21.02851, lng: 105.85417 });
  const [locationName, setLocationName] = useState('Hà Nội');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [medicalNote, setMedicalNote] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [message, setMessage] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(80);
  const [sending, setSending] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef(null);

  // 1. Lấy vị trí thực tế của thiết bị trình duyệt
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
        () => toast.error('Không thể định vị GPS trình duyệt. Vui lòng cho phép quyền truy cập vị trí.')
      );
    }
    // Lấy dung lượng pin trình duyệt
    if (navigator.getBattery) {
      navigator.getBattery().then((bat) => {
        setBatteryLevel(Math.round(bat.level * 100));
      });
    }
  }, []);

  // 2. Tự động điền nếu đã có user đăng nhập
  useEffect(() => {
    const checkLoggedUser = async () => {
      try {
        const token = localStorage.getItem('rl_token');
        if (token) {
          const res = await api.get('/auth/me');
          if (res.data.success && res.data.user) {
            const u = res.data.user;
            setFullName(u.name || '');
            setPhone(u.phone || '');
            if (u.medicalProfile) {
              setBloodType(u.medicalProfile.bloodType || 'O+');
              setMedicalNote(u.medicalProfile.chronicConditions || '');
            }
            if (u.emergencyContacts && u.emergencyContacts.length > 0) {
              setEmergencyPhone(u.emergencyContacts[0].phone || '');
            }
          }
        }
      } catch (err) {
        // Token hết hạn hoặc không hợp lệ -> bỏ qua
      }
    };
    checkLoggedUser();
  }, []);

  const triggerSOSDirectly = async () => {
    setSending(true);
    const loadingToast = toast.loading('Đang xử lý thông tin và gửi yêu cầu cứu hộ...');

    try {
      let token = localStorage.getItem('rl_token');
      
      if (!token) {
        try {
          const regRes = await api.post('/auth/register', {
            name: fullName,
            phone: phone,
            password: 'guestpassword123',
            emergencyContacts: [{ name: 'Gia đình', phone: emergencyPhone, relation: 'Family' }],
            medicalProfile: { bloodType, chronicConditions: medicalNote }
          });
          token = regRes.data.token;
          localStorage.setItem('rl_token', token);
        } catch (regErr) {
          try {
            const logRes = await api.post('/auth/login', {
              phone: phone,
              password: 'guestpassword123'
            });
            token = logRes.data.token;
            localStorage.setItem('rl_token', token);
          } catch (loginErr) {
            toast.dismiss(loadingToast);
            toast.error('Số điện thoại này đã được đăng ký bảo mật. Vui lòng đăng nhập hoặc dùng SĐT khác.');
            setSending(false);
            return;
          }
        }
      }

      await api.patch('/auth/profile', {
        name: fullName,
        emergencyContacts: [{ name: 'Gia đình', phone: emergencyPhone, relation: 'Family' }],
        medicalProfile: { bloodType, chronicConditions: medicalNote }
      });

      const incidentRes = await api.post('/incidents', {
        type: 'LOST',
        lat: userLocation.lat,
        lng: userLocation.lng,
        message: message || 'Yêu cầu cứu trợ khẩn cấp từ Cổng Web Portal',
        batteryAtTime: batteryLevel
      });

      toast.dismiss(loadingToast);
      toast.error(`🚨 SOS ĐÃ GỬI THÀNH CÔNG! Vị trí của bạn đã được chuyển đến Trung tâm cứu nạn HQ. Hệ thống tự động kích hoạt cuộc gọi/tin nhắn SMS đến số người thân ${emergencyPhone}.`, {
        duration: 9000,
        position: 'top-center'
      });
      
      if (incidentRes.data.incident?.tripId) {
        const tripRes = await api.get(`/trips/active`);
        if (tripRes.data.trip?.shareToken) {
          setShareToken(tripRes.data.trip.shareToken);
        }
      }

      setMessage('');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi truyền phát tín hiệu cứu hộ.');
    } finally {
      setSending(false);
      setHoldProgress(0);
      setIsHolding(false);
    }
  };

  const startHold = (e) => {
    e.preventDefault();
    if (sending) return;
    if (!fullName || !phone) {
      toast.error('Vui lòng điền Họ tên và Số điện thoại báo nạn!');
      return;
    }
    if (!emergencyPhone) {
      toast.error('Vui lòng cung cấp Số điện thoại người thân để báo tin SOS!');
      return;
    }

    setIsHolding(true);
    setHoldProgress(0);
    
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
          triggerSOSDirectly();
          return 100;
        }
        return prev + 1.67;
      });
    }, 50);
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (isHolding && holdProgress < 99) {
      toast.error('⚠️ Hãy nhấn giữ đủ 3 giây để kích hoạt SOS!');
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  const handleCopyFamilyLink = () => {
    if (!shareToken) {
      toast.error('Không tìm thấy hành trình active để tạo link gia đình.');
      return;
    }
    const familyUrl = `${window.location.origin}/family/${shareToken}`;
    navigator.clipboard.writeText(familyUrl);
    toast.success('Đã sao chép link Family View gửi cho người thân!');
  };

  const { pathname } = useLocation();
  const isAdminView = pathname.startsWith('/dashboard') || pathname.startsWith('/operator');

  return (
    <div className={`flex flex-col h-full ${!isAdminView ? 'min-h-dvh' : ''}`} style={!isAdminView ? { background: '#080c12' } : undefined}>
      {/* Navigation Header */}
      {isAdminView ? (
        <Header title="Cổng Web SOS Trekker" />
      ) : (
        <PublicNavbar />
      )}

      {/* Ambient Red glow for emergency portal */}
      {!isAdminView && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-[-25%] left-[20%] w-[700px] h-[550px] rounded-full blur-[140px] opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(239,68,68,1) 0%, transparent 70%)' }} />
        </div>
      )}

      <div className={`flex-1 overflow-auto p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6 relative z-10 ${!isAdminView ? 'pt-8' : ''}`}>
        
        {/* Header Title Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-surface-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-slate-300 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Compass size={28} className="text-red-500" weight="fill" /> Cổng Phát SOS Trực Tuyến
              </h1>
            </div>
            <p className="text-xs text-muted ml-0 sm:ml-11">
              Phát tín hiệu định vị cứu nạn trực tiếp từ trình duyệt điện thoại. Dữ liệu được mã hóa bảo mật và chuyển thẳng về trực ban HQ.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-surface-2 border border-surface-4 px-4 py-2 rounded-2xl text-xs font-semibold text-slate-300">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
            <span>Kết nối GPS: Ổn định</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* Left Side: Map & Safety info (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Real GPS Map */}
            <div className="card p-0 border border-surface-4 overflow-hidden relative flex flex-col">
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
                zoom={14}
                className="w-full h-[320px] md:h-[380px]"
              >
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  attribution='&copy; Google Maps'
                />
                <Marker position={[userLocation.lat, userLocation.lng]}>
                  <Popup>
                    <div className="text-slate-800 p-1 text-xs">
                      <strong>Vị trí của bạn</strong>
                      <p className="font-mono text-[10px] mt-0.5">{userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Quick Warning Info card */}
            <div className="card p-5 border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5 text-amber-400">
                <Info size={16} weight="bold" /> Hướng dẫn khi cần cứu hộ khẩn cấp:
              </h4>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                <li>Duy trì mở trình duyệt này để hệ thống tiếp tục truyền phát tín hiệu GPS của bạn.</li>
                <li>Hạn chế di chuyển xa khỏi điểm báo nạn để lực lượng cứu nạn dễ dàng khoanh vùng.</li>
                <li>Tìm nơi khuất gió, giữ ấm cơ thể trong lúc chờ đội cứu hộ tiếp cận hiện trường.</li>
              </ul>
            </div>

            {shareToken && (
              <div className="card p-5 border border-sky-500/30 bg-sky-500/10 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sky-300 text-sm flex items-center gap-2">
                    <ShareNetwork size={20} /> Đường dẫn theo dõi cho người nhà (Family View)
                  </h4>
                  <p className="text-xs text-slate-300">
                    Người thân của bạn có thể theo dõi live GPS và dung lượng pin của bạn từ xa.
                  </p>
                </div>
                <button
                  onClick={handleCopyFamilyLink}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Copy size={16} /> Sao chép link gửi gia đình
                </button>
              </div>
            )}

          </div>

          {/* Right Side: Emergency Form & Medical Note (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            <form onSubmit={handleTriggerWebSOS} className="card p-6 border border-red-500/20 bg-surface-1 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-surface-4 pb-3">
                <Heartbeat size={20} className="text-red-400" /> THÔNG TIN KHAI BÁO Y TẾ & BÁO NẠN
              </h3>

              {/* Form Input fields */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">1. Họ và tên người báo nạn *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">2. Số điện thoại của bạn *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0901234567"
                      className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">3. SĐT người thân nhận tin *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0987654321"
                      className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">4. Nhóm máu</label>
                  <select
                    className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                  >
                    <option value="O+">O+ (Phổ biến)</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O- (Hiếm)</option>
                    <option value="A-">A- (Hiếm)</option>
                    <option value="B-">B- (Hiếm)</option>
                    <option value="AB-">AB- (Hiếm)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">5. Bệnh nền & Dị ứng thuốc</label>
                  <textarea
                    rows={2}
                    placeholder="Ví dụ: Hen suyễn cần mang thuốc hít, dị ứng kháng sinh penicillin..."
                    className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                    value={medicalNote}
                    onChange={(e) => setMedicalNote(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">6. Mô tả sự cố đang gặp phải (Tùy chọn)</label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Bị lạc đường do sương mù dày, trượt chân ngã trầy xước không đứng dậy được..."
                    className="w-full bg-surface-2 border border-surface-4 text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-surface-4 text-[10px] font-semibold text-slate-400">
                  <span>🔋 Pin trình duyệt hiện tại: {batteryLevel}%</span>
                  <span>🛰️ GPS Accuracy: +/- 5m</span>
                </div>
              </div>

              {/* Big, red, pulse SOS trigger button with Hold-to-SOS (3 seconds) */}
              <div className="relative overflow-hidden rounded-2xl border border-red-500/30">
                {/* Hold Progress background overlay */}
                {isHolding && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-red-800/80 transition-all duration-75 pointer-events-none"
                    style={{ width: `${holdProgress}%` }}
                  />
                )}
                
                <button
                  type="button"
                  disabled={sending}
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  className="relative w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wide disabled:opacity-50 select-none cursor-pointer"
                >
                  <PhoneCall size={20} weight="fill" />
                  {sending 
                    ? 'ĐANG PHÁT TÍN HIỆU...' 
                    : isHolding 
                    ? `🚨 GIỮ NÚT: ${Math.max(0, Math.ceil((100 - holdProgress) / 33))}s...` 
                    : '🚨 NHẤN GIỮ 3 GIÂY ĐỂ SOS'}
                </button>
              </div>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
