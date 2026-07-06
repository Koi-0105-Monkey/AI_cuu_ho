import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, MapPin, PhoneCall, Heartbeat, Users, Lightning,
  Compass, ArrowRight, CheckCircle, Warning, FileText
} from '@phosphor-icons/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090b0e] text-slate-100 font-sans selection:bg-red-500/30">
      
      {/* ─── Top Public Navigation ─── */}
      <nav className="border-b border-surface-4 bg-surface-1/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
              <ShieldCheck size={24} className="text-white" weight="fill" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
                RESCUELINK <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">SAFETY TECH</span>
              </h1>
              <p className="text-[10px] text-muted tracking-wider uppercase">Nền Tảng Cứu Hộ Dã Ngoại #1 Việt Nam</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <Link to="/home" className="text-red-400 font-bold">Trang Chủ</Link>
            <Link to="/trails" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Compass size={16} /> Cung Đường An Toàn
            </Link>
            <Link to="/" className="hover:text-white transition-colors">Trung Tâm Chỉ Huy HQ</Link>
            <Link to="/operator" className="hover:text-white transition-colors">Cổng Doanh Nghiệp Tour</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-4 text-white text-xs font-semibold transition-all border border-surface-4"
            >
              Đăng Nhập
            </Link>
            <Link
              to="/operator/groups"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center gap-1.5"
            >
              Dành Cho Doanh Nghiệp <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-surface-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-8">
            <Lightning size={16} weight="fill" /> GIẢI PHÁP AN TOÀN DU LỊCH MẠO HIỂM THẾ HỆ MỚI
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Bảo Vệ Tính Mạng <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-amber-300">Người Leo Núi & Thám Hiểm</span> Tại Việt Nam
          </h2>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Hệ sinh thái cứu hộ dã ngoại thông minh kết hợp định vị ngầm thích ứng, bản đồ ngoại tuyến nén SMS 7-bit và trợ lý AI Gemini 1.5 Flash cứu nạn khẩn cấp.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/trails"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-xl shadow-red-600/30 flex items-center gap-2 transition-all"
            >
              <Compass size={18} weight="bold" /> Khám Phá Cung Đường An Toàn
            </Link>
            <Link
              to="/operator/groups"
              className="px-6 py-3.5 rounded-2xl bg-surface-2 border border-surface-4 hover:border-slate-500 text-white font-semibold text-sm transition-all"
            >
              Giải Pháp Cho Công Ty Tour B2B
            </Link>
          </div>

          {/* Key Metrics Banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="card p-5 border border-surface-4 bg-surface-1/60">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">99.9%</span>
              <p className="text-xs text-muted font-medium mt-1">Định vị chính xác vùng mất sóng</p>
            </div>
            <div className="card p-5 border border-surface-4 bg-surface-1/60">
              <span className="text-2xl sm:text-3xl font-extrabold text-red-400 tabular-nums">&lt; 15 Phút</span>
              <p className="text-xs text-muted font-medium mt-1">Thời gian phản hồi chỉ huy HQ</p>
            </div>
            <div className="card p-5 border border-surface-4 bg-surface-1/60">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">100%</span>
              <p className="text-xs text-muted font-medium mt-1">Hồ sơ y tế xác minh an toàn</p>
            </div>
            <div className="card p-5 border border-surface-4 bg-surface-1/60">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">50+</span>
              <p className="text-xs text-muted font-medium mt-1">Cung đường leo núi phủ sóng</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3 Pillars Section ─── */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">CÔNG NGHỆ ĐỘT PHÁ</h3>
          <p className="text-3xl font-extrabold text-white mt-2">3 Trụ Cột An Toàn Cứu Hộ Toàn Diện</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="card p-8 border border-surface-4 bg-surface-1 hover:border-red-500/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <PhoneCall size={30} weight="fill" />
            </div>
            <h4 className="text-lg font-bold text-white mb-3">1. Nén SMS SOS Single Segment</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thuật toán nén tọa độ GPS xuống 53 ký tự ASCII GSM 7-bit, gửi thành công 100% chỉ với 1 vạch sóng chập chờn mà không cần kết nối 4G/5G.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="card p-8 border border-surface-4 bg-surface-1 hover:border-amber-500/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MapPin size={30} weight="fill" />
            </div>
            <h4 className="text-lg font-bold text-white mb-3">2. Geocoding Photon & Off-grid Map</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tích hợp Photon Geocoder local Docker và Komoot Public API tìm kiếm tức thì mọi lán trại, đỉnh núi Việt Nam (Fansipan, Tà Xùa, Lảo Thần...).
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="card p-8 border border-surface-4 bg-surface-1 hover:border-emerald-500/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Heartbeat size={30} weight="fill" />
            </div>
            <h4 className="text-lg font-bold text-white mb-3">3. Khai Báo Y Tế & 2-Tier Protocol</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quản lý tiền sử bệnh lý (tim mạch, huyết áp, nhóm máu). Cơ chế xác minh 2 lớp (Human-in-the-loop) đảm bảo không gây quá tải báo động giả cho 115/114.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-surface-4 bg-surface-1/50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-red-500" />
            <span className="font-bold text-slate-300">RescueLink Safety Tech Vietnam © 2026</span>
          </div>
          <div className="flex gap-6">
            <Link to="/trails" className="hover:text-slate-300">Cung Đường An Toàn</Link>
            <Link to="/login" className="hover:text-slate-300">Cổng Nội Bộ</Link>
            <Link to="/operator" className="hover:text-slate-300">Doanh Nghiệp Tour</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
