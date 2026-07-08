import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, MapPin, PhoneCall, Heartbeat, Users, Lightning,
  Compass, ArrowRight, CheckCircle, ArrowUpRight, X, List
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import PublicNavbar from '../components/layout/PublicNavbar';

// ─── Animated counter hook ────────────────────────────────
function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime;
    const tick = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return count;
}

// ─── Metric Card ─────────────────────────────────────────
function MetricCard({ value, suffix = '', label, color = 'text-white', delay = 0, inView }) {
  const num = useCounter(value, 1600, inView);
  return (
    <div
      className="relative bg-surface-2 border border-surface-4 rounded-2xl p-5 overflow-hidden group"
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), box-shadow 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'perspective(600px) rotateX(3deg) rotateY(-2deg) translateZ(6px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateZ(0)';
        e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)';
      }}
    >
      {/* Corner glow */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
      />
      <span className={`text-3xl sm:text-4xl font-black tabular-nums ${color} block`}>
        {num}{suffix}
      </span>
      <p className="text-xs text-muted font-medium mt-1.5 leading-relaxed">{label}</p>
    </div>
  );
}

// ─── Pillar Card ─────────────────────────────────────────
function PillarCard({ icon: Icon, title, description, accent, delay }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(8px)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative bg-surface-2 border border-surface-4 rounded-2xl p-8 overflow-hidden cursor-default"
      style={{
        transition: 'transform 0.2s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animationDelay: `${delay}ms`,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient spot light behind icon */}
      <div
        className="absolute -top-8 -left-8 w-32 h-32 rounded-full blur-2xl opacity-20"
        style={{ background: accent }}
      />

      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        <Icon size={28} weight="fill" style={{ color: accent }} />
      </div>

      <h4 className="text-base font-bold text-white mb-3">{title}</h4>
      <p className="text-sm text-muted-light leading-relaxed">{description}</p>

      {/* Bottom gradient line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
    </div>
  );
}

// ─── Main LandingPage ─────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metricsInView, setMetricsInView] = useState(false);
  const metricsRef = useRef(null);

  // IntersectionObserver for counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setMetricsInView(true); },
      { threshold: 0.3 }
    );
    if (metricsRef.current) observer.observe(metricsRef.current);
    return () => observer.disconnect();
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return (
    <div className="landing-page-container min-h-dvh text-slate-100 font-sans selection:bg-emergency-600/30" style={{ background: '#080c12' }}>

      {/* ─── Ambient background orbs (fixed, GPU safe) ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(225,29,72,1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[400px] rounded-full blur-[100px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,1) 0%, transparent 70%)' }} />
      </div>

      {/* ─── Floating Navbar (glass pill) ─── */}
      <PublicNavbar />

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 pt-20 pb-28 px-4 overflow-hidden" style={{ minHeight: '85dvh' }}>
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">

          {/* Eyebrow badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8 animate-fade-up"
            style={{
              background: 'rgba(225,29,72,0.1)',
              border: '1px solid rgba(225,29,72,0.25)',
              color: '#fb7185',
              animationDelay: '0ms',
            }}
          >
            <Lightning size={14} weight="fill" />
            Nền Tảng Cứu Hộ Dã Ngoại #1 Việt Nam
          </div>

          {/* Hero headline */}
          <h1
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl animate-fade-up"
            style={{ animationDelay: '80ms', textWrap: 'balance' }}
          >
            Bảo Vệ Tính Mạng{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 40%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Người Leo Núi
            </span>
            {' '}Tại Việt Nam
          </h1>

          <p
            className="mt-6 text-base sm:text-lg text-muted-light max-w-2xl leading-relaxed animate-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            Hệ sinh thái cứu hộ thông minh: định vị thích ứng, bản đồ ngoại tuyến, nén SMS 7-bit một segment,
            và điều phối khẩn cấp AI thời gian thực.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-up"
            style={{ animationDelay: '240ms' }}
          >
            {/* Primary CTA — Button-in-Button pattern */}
            <Link
              to="/trails"
              className="group flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                boxShadow: '0 0 24px rgba(225,29,72,0.35)',
                transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 0 40px rgba(225,29,72,0.55)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 0 24px rgba(225,29,72,0.35)';
                e.currentTarget.style.transform = '';
              }}
            >
              <Compass size={18} weight="bold" />
              Khám Phá Cung Đường
              <span className="w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                <ArrowUpRight size={14} weight="bold" />
              </span>
            </Link>

            {/* Secondary CTA */}
            <Link
              to="/portal"
              className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-slate-200 transition-all duration-200 hover:text-white"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = '';
              }}
            >
              <PhoneCall size={16} weight="fill" className="text-emergency-400" />
              Trekker Cá Nhân
            </Link>
          </div>

          {/* Floating shield graphic (3D CSS) */}
          <div
            className="mt-16 animate-float relative"
            style={{ animationDelay: '0ms', perspective: '800px' }}
          >
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto relative"
              style={{
                background: 'linear-gradient(135deg, rgba(225,29,72,0.2) 0%, rgba(30,20,50,0.8) 100%)',
                border: '1px solid rgba(225,29,72,0.3)',
                boxShadow: '0 0 60px rgba(225,29,72,0.3), 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                transform: 'perspective(800px) rotateX(8deg)',
              }}
            >
              <ShieldCheck size={56} weight="fill" className="text-emergency-400" />

              {/* Orbiting ping */}
              <div className="absolute -top-2 -right-2 w-5 h-5">
                <div className="w-full h-full bg-emerald-500 rounded-full opacity-80 animate-ping" />
                <div className="absolute inset-0 w-3 h-3 m-auto bg-emerald-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metrics Row ─── */}
      <section className="relative z-10 pb-20 px-4" ref={metricsRef}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard value={47} suffix="+" label="Cung đường leo núi phủ sóng" color="stat-number" inView={metricsInView} delay={0} />
          <MetricCard value={15} suffix=" phút" label="Thời gian phản hồi HQ" color="stat-number-red" inView={metricsInView} delay={100} />
          <MetricCard value={1247} suffix="+" label="Trekker đang sử dụng App" color="stat-number-green" inView={metricsInView} delay={200} />
          <MetricCard value={53} suffix=" ký tự" label="SMS SOS tối thiểu gửi được" color="stat-number-amber" inView={metricsInView} delay={300} />
        </div>
      </section>

      {/* ─── 3 Pillars Section ─── */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-4 uppercase tracking-widest"
              style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)', color: '#fb7185' }}>
              Công Nghệ Cốt Lõi
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ textWrap: 'balance' }}>
              3 Trụ Cột An Toàn Toàn Diện
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <PillarCard
              icon={PhoneCall}
              title="Nén SMS SOS Single Segment"
              description="Thuật toán nén tọa độ GPS xuống 53 ký tự ASCII GSM 7-bit, gửi thành công chỉ với 1 vạch sóng chập chờn — không cần 4G/5G."
              accent="#e11d48"
              delay={0}
            />
            <PillarCard
              icon={MapPin}
              title="Geocoding Photon & Off-grid Map"
              description="Nominatim OpenStreetMap + Photon Geocoder tìm kiếm tức thì mọi lán trại, đỉnh núi Việt Nam. Bản đồ ngoại tuyến lưu trực tiếp trên thiết bị."
              accent="#f59e0b"
              delay={80}
            />
            <PillarCard
              icon={Heartbeat}
              title="Khai Báo Y Tế & 2-Tier Protocol"
              description="Quản lý tiền sử bệnh lý (tim mạch, huyết áp, nhóm máu). Xác minh 2 lớp Human-in-the-loop tránh báo động giả cho 115/114."
              accent="#10b981"
              delay={160}
            />
          </div>
        </div>
      </section>

      {/* ─── B2B CTA Banner ─── */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="relative rounded-3xl p-8 sm:p-12 overflow-hidden text-center"
            style={{
              background: 'rgba(225,29,72,0.08)',
              border: '1px solid rgba(225,29,72,0.2)',
              boxShadow: '0 0 80px rgba(225,29,72,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Radial glow behind */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-40 rounded-full blur-[80px] opacity-30"
                style={{ background: '#e11d48' }} />
            </div>

            <div className="relative z-10">
              <Users size={40} className="text-emergency-400 mx-auto mb-4" weight="fill" />
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">Giải Pháp Cho Công Ty Tour B2B</h3>
              <p className="text-sm text-muted-light max-w-lg mx-auto mb-8">
                Dashboard điều hành toàn bộ đoàn trekking, khai báo y tế, theo dõi GPS realtime và cảnh báo khẩn cấp tức thì.
              </p>
              <Link
                to="/operator/groups"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  boxShadow: '0 0 32px rgba(225,29,72,0.4)',
                  transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 48px rgba(225,29,72,0.6)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(225,29,72,0.4)'; e.currentTarget.style.transform = ''; }}
              >
                Bắt Đầu Dùng Miễn Phí <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-surface-4 py-10 px-4"
        style={{ background: 'rgba(13,17,23,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-emergency-500" />
            <span className="font-bold text-slate-400">RescueLink Safety Tech © 2026</span>
          </div>
          <div className="flex gap-6">
            <Link to="/trails" className="hover:text-slate-300 transition-colors">Cung Đường</Link>
            <Link to="/portal" className="hover:text-slate-300 transition-colors">Trekker Portal</Link>
            <Link to="/login" className="hover:text-slate-300 transition-colors">Nội Bộ</Link>
            <Link to="/operator" className="hover:text-slate-300 transition-colors">Doanh Nghiệp</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
