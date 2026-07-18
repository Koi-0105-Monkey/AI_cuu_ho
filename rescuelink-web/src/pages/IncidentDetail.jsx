import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, User, Phone, BatteryFull, Clock,
  MapPin, ChatCentered, BellRinging, Users, FileText
} from '@phosphor-icons/react';
import Header from '../components/layout/Header';
import api from '../services/api';
import { useEffect } from 'react';

// Fix default Leaflet icon for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_FLOW   = { open: 'assigned', assigned: 'resolved' };
const STATUS_LABELS = { open: 'Giao cho cứu hộ →', assigned: 'Đánh dấu Xong ✓' };

// ─── Tactical Telemetry Section Block ─────────────────────────────────────────
const Section = ({ title, children }) => (
  <div className="bg-surface-1 border border-slate-700 p-4 space-y-3">
    <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
      <span className="text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">[ {title} ]</span>
    </div>
    {children}
  </div>
);

// ─── Data Row — label mono UPPERCASE, value mono căn phải ────────────────────
const Row = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-2 text-xs">
    <span className="text-muted shrink-0 flex items-center gap-1 font-mono tracking-wide uppercase text-[10px]">{label}</span>
    <span className={`${mono ? 'font-mono tracking-wide' : 'font-mono'} text-muted-light text-right text-[11px]`}>{value || '—'}</span>
  </div>
);

export default function IncidentDetail() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [note, setNote] = useState('');

  const [rescuers, setRescuers] = useState([]);
  const [selectedRescuer, setSelectedRescuer] = useState('');
  const [eta, setEta] = useState(30);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [aarSummary, setAarSummary] = useState('');
  const [aarTeamNotes, setAarTeamNotes] = useState('');

  useEffect(() => {
    api.get('/admin/users?role=rescuer&limit=100')
      .then(res => {
        if (res.data?.success) setRescuers(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  const dispatchRescue = useMutation({
    mutationFn: (payload) => api.patch(`/incidents/${id}/dispatch`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['incident', id]);
      qc.invalidateQueries(['incidents']);
      qc.invalidateQueries(['active-incidents']);
      toast.success('Đã điều động cứu hộ thực địa!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi điều động');
    }
  });

  const resolveIncident = useMutation({
    mutationFn: (payload) => api.patch(`/incidents/${id}/resolve`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['incident', id]);
      qc.invalidateQueries(['incidents']);
      qc.invalidateQueries(['active-incidents']);
      toast.success('Đã đóng hồ sơ sự cố & lưu báo cáo AAR');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi đóng hồ sơ');
    }
  });

  const reviewIncident = useMutation({
    mutationFn: () => api.patch(`/incidents/${id}/review`),
    onSuccess: () => {
      qc.invalidateQueries(['incident', id]);
      qc.invalidateQueries(['incidents']);
      qc.invalidateQueries(['active-incidents']);
      toast.success('Đã xác nhận xem xét báo cáo AI thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi xác nhận');
    }
  });



  const { data: inc, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn:  () => api.get(`/incidents/${id}`).then(r => r.data.data),
  });

  const { data: trackData } = useQuery({
    queryKey: ['track', id],
    queryFn:  () => api.get(`/incidents/${id}/track`).then(r => r.data.data),
    enabled:  !!inc,
  });

  const updateStatus = useMutation({
    mutationFn: (status) => api.patch(`/incidents/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['incident', id]);
      qc.invalidateQueries(['incidents']);
      qc.invalidateQueries(['active-incidents']);
      toast.success('Đã cập nhật trạng thái');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Chi tiết Sự cố" />
        <div className="flex-1 flex items-center justify-center font-mono text-[11px] text-muted tracking-widest uppercase">[ ĐANG TẢI DỮ LIỆU... ]</div>
      </div>
    );
  }
  if (!inc) return null;

  const coords      = inc.location?.coordinates;
  const center      = coords ? [coords[1], coords[0]] : [16.047, 108.206];
  const trackCoords = trackData?.map(p => [p.coordinates[1], p.coordinates[0]]) || [];
  const nextStatus  = STATUS_FLOW[inc.status];

  return (
    <div className="flex flex-col h-full">
      <Header title="Chi tiết Sự cố" />
      <div className="flex-1 overflow-auto p-4 space-y-3">

        {/* ── Navigation bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <button onClick={() => navigate(-1)} className="btn-ghost text-xs font-mono tracking-wide flex items-center gap-1.5">
            <ArrowLeft size={14} />
            <span className="uppercase">// Quay lại</span>
          </button>
          {inc.reviewedBy && (
            <span className="text-[10px] text-sky-400 font-mono font-bold border border-sky-500/40 bg-sky-500/5 px-3 py-1 tracking-wider uppercase">
              ✓ APPROVED / {inc.reviewedBy.name || 'ADMIN'}
            </span>
          )}
        </div>

        {/* ── Manual Review Alert Banner ───────────────────────── */}
        {inc.severityBreakdown?.needsManualReview && !inc.reviewedBy && (
          <div className="border-l-4 border-amber-500 bg-amber-500/5 border border-amber-500/30 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="font-mono text-amber-400 text-sm font-black shrink-0">⚠</span>
              <div>
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider font-mono">
                  AI CONFIDENCE LOW — XÁC NHẬN THỦ CÔNG TRƯỚC KHI ĐIỀU PHỐI
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-1 tracking-wide">
                  Có sự mâu thuẫn giữa thông số đo đạc thực tế của thiết bị và nội dung sự cố tự khai báo.
                </p>
              </div>
            </div>
            <button
              onClick={() => reviewIncident.mutate()}
              disabled={reviewIncident.isLoading}
              className="btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] px-4 py-2 uppercase tracking-widest font-mono shrink-0 rounded-none"
            >
              {reviewIncident.isLoading ? '// ĐANG XỬ LÝ...' : '[ ĐÃ XEM XÉT & DUYỆT QUA ]'}
            </button>
          </div>
        )}

        {/* ── Main Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* ─── Left column 2/3 ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">

            {/* Map — border cứng, không rounded */}
            <div className="border border-slate-700 overflow-hidden">
              <MapContainer center={center} zoom={15} className="h-[350px] w-full">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  attribution='&copy; Google Maps'
                />
                <Marker position={center}>
                  <Popup>
                    <span className="text-xs font-mono">{inc.type} — MỨC {inc.severity}</span>
                  </Popup>
                </Marker>
                {trackCoords.length > 1 && (
                  <Polyline positions={trackCoords} color="#10b981" weight={3} opacity={0.8} />
                )}
              </MapContainer>
            </div>

            {/* Message */}
            {inc.message && (
              <Section title="Tin nhắn SOS">
                <div className="flex gap-2">
                  <ChatCentered size={14} className="text-muted mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-light leading-relaxed font-mono tracking-wide">{inc.message}</p>
                </div>
              </Section>
            )}

            {/* Google Gemini AI Analysis */}
            {(inc.audioUrl || inc.voiceTranscript || inc.extractedEntities) && (
              <Section title="Phân tích Google Gemini AI">
                <div className="space-y-3">

                  {/* Audio SOS Player */}
                  {inc.audioUrl && (
                    <div className="bg-surface-2 border border-slate-700 border-l-2 border-l-sky-500 p-3">
                      <div className="flex items-center gap-2 mb-2 text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest">
                        <span>[ VOICE SOS RECORDING ]</span>
                      </div>
                      <audio
                        controls
                        src={inc.audioUrl.startsWith('http') ? inc.audioUrl : `http://localhost:5000${inc.audioUrl}`}
                        className="w-full h-8"
                      />
                    </div>
                  )}

                  {/* Transcript */}
                  {inc.voiceTranscript && (
                    <div className="bg-surface-2 border border-slate-700 border-l-2 border-l-sky-500 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest">
                          {inc.source === 'sms' ? '[ SMS / GEMINI NLP ]' : '[ VOICE ASR / GEMINI ]'}
                        </div>
                        <button
                          onClick={() => {
                            if ('speechSynthesis' in window) {
                              window.speechSynthesis.cancel();
                              const utterance = new SpeechSynthesisUtterance(inc.voiceTranscript);
                              utterance.lang = 'vi-VN';
                              window.speechSynthesis.speak(utterance);
                            }
                          }}
                          className="text-[10px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/40 px-2 py-0.5 font-mono uppercase tracking-wide flex items-center gap-1 transition-all rounded-none"
                          title="Đọc tin nhắn bằng tiếng Việt"
                        >
                          ▶ PLAY
                        </button>
                      </div>
                      <p className="text-xs text-white font-mono tracking-wide leading-relaxed">"{inc.voiceTranscript}"</p>
                    </div>
                  )}

                  {/* Extracted Entities — gap:1px grid trick */}
                  {inc.extractedEntities && (
                    <div className="bg-surface-2 border border-slate-700 p-3">
                      <div className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest mb-3">
                        [ NLP NER — EXTRACTED ENTITIES ]
                      </div>
                      <div className="grid grid-cols-2 gap-px bg-slate-700">
                        <div className="bg-surface-2 p-2">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest mb-0.5">NẠN NHÂN</span>
                          <span className="font-mono font-bold text-white text-xs">{inc.extractedEntities.victimName || '—'}</span>
                        </div>
                        <div className="bg-surface-2 p-2">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest mb-0.5">ĐỊA ĐIỂM</span>
                          <span className="font-mono font-bold text-white text-xs">{inc.extractedEntities.location || '—'}</span>
                        </div>
                        <div className="bg-surface-2 p-2">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest mb-0.5">SỰ CỐ</span>
                          <span className="font-mono font-bold text-amber-400 text-xs">{inc.extractedEntities.incidentType || '—'}</span>
                        </div>
                        <div className="bg-surface-2 p-2">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest mb-0.5">MỨC KHẨN CẤP</span>
                          <span className="font-mono font-bold text-rose-400 text-xs">CAP {inc.extractedEntities.severity || 3}</span>
                        </div>
                      </div>
                      <button
                        className="btn-primary w-fit mt-3 text-[10px] font-mono uppercase tracking-widest rounded-none"
                        onClick={() => {
                          const val = `[Viettel AI NER] Nạn nhân: ${inc.extractedEntities.victimName || 'Chưa rõ'}, Địa điểm: ${inc.extractedEntities.location || 'Chưa rõ'}, Loại sự cố: ${inc.extractedEntities.incidentType || 'Khác'}`;
                          setNote(val);
                          toast.success('Đã áp dụng thông tin AI vào ghi chú xử lý');
                        }}
                      >
                        [ ÁP DỤNG VÀO GHI CHÚ ]
                      </button>
                    </div>
                  )}

                  {/* Severity Breakdown */}
                  {inc.severityBreakdown && (
                    <div className={`border p-3 ${
                      inc.severityBreakdown.needsManualReview
                        ? 'bg-amber-500/5 border-amber-500/40 border-l-4 border-l-amber-500'
                        : 'bg-surface-2 border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest">
                          [ SEVERITY SCORING ENGINE ]
                        </div>
                        {inc.severityBreakdown.needsManualReview && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 font-mono font-black uppercase tracking-widest animate-pulse rounded-none">
                            ! MANUAL REVIEW REQUIRED
                          </span>
                        )}
                      </div>

                      {/* Score Grid — gap:1px Tactical Compartments */}
                      <div className="grid grid-cols-5 gap-px bg-slate-700 mb-3">
                        <div className="bg-surface-2 p-2 text-center">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest">CƠ BẢN</span>
                          <span className="font-mono font-black text-slate-200 text-sm">{inc.severityBreakdown.baseScore || 3}</span>
                        </div>
                        <div className="bg-surface-2 p-2 text-center">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest">Y TẾ</span>
                          <span className="font-mono font-black text-rose-400 text-sm">+{inc.severityBreakdown.medicalAdjustment || 0}</span>
                        </div>
                        <div className="bg-surface-2 p-2 text-center">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest">PIN</span>
                          <span className="font-mono font-black text-amber-400 text-sm">+{inc.severityBreakdown.batteryAdjustment || 0}</span>
                        </div>
                        <div className="bg-surface-2 p-2 text-center">
                          <span className="text-muted block text-[9px] font-mono uppercase tracking-widest">THỜI TIẾT</span>
                          <span className="font-mono font-black text-sky-400 text-sm">+{inc.severityBreakdown.weatherAdjustment || 0}</span>
                        </div>
                        <div className="bg-sky-950 border border-sky-500/30 p-2 text-center">
                          <span className="text-sky-400 block text-[9px] font-mono uppercase tracking-widest font-bold">TỔNG</span>
                          <span className="font-mono font-black text-sky-400 text-sm">{inc.severityBreakdown.finalScore || inc.severity}</span>
                        </div>
                      </div>

                      {/* AI Confidence */}
                      <div className="flex items-center justify-between text-xs py-2 border-t border-slate-700/60 mb-2">
                        <span className="text-slate-400 font-mono font-bold uppercase text-[9px] tracking-widest">AI CONFIDENCE:</span>
                        <span className={`px-3 py-0.5 text-[10px] font-mono font-black uppercase tracking-widest border rounded-none ${
                          inc.severityBreakdown.aiConfidence === 'High'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/40'
                            : inc.severityBreakdown.aiConfidence === 'Medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                            : 'bg-red-500/10 text-red-400 border-red-500/40'
                        }`}>
                          {inc.severityBreakdown.aiConfidence === 'High' ? '▲ CAO' : inc.severityBreakdown.aiConfidence === 'Medium' ? '─ TRUNG BÌNH' : '▼ THẤP'}
                        </span>
                      </div>

                      {/* Reasons list */}
                      <div className="text-[10px] text-slate-400 font-mono space-y-1">
                        <span className="font-bold block text-[9px] text-slate-500 uppercase tracking-widest">// CHI TIẾT ĐIỀU CHỈNH:</span>
                        <ul className="space-y-0.5 pl-2">
                          {inc.severityBreakdown.reasons?.map((r, index) => (
                            <li key={index} className="leading-relaxed">› {r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Admin note */}
            {inc.status !== 'resolved' && (
              <Section title="Ghi chú xử lý nội bộ">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="// Ghi chú nội bộ về sự cố này…"
                  className="input resize-none font-mono text-xs tracking-wide w-full rounded-none"
                />
                <button
                  className="btn-primary w-fit font-mono text-[10px] uppercase tracking-widest rounded-none"
                  onClick={() => toast.success('Ghi chú đã lưu (chức năng hoàn thiện sau)')}
                >
                  [ LƯU GHI CHÚ ]
                </button>
              </Section>
            )}
          </div>

          {/* ─── Right column 1/3 ────────────────────────────── */}
          <div className="space-y-3">

            {/* Status & Dispatch / Coordination Panel */}
            <div className="bg-surface-1 border border-slate-700 p-4 space-y-3">
              {/* Panel header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <BellRinging size={14} className="text-emergency-400" />
                  <span className="text-xs font-mono font-black text-white uppercase tracking-widest">{inc.type}</span>
                </div>
                {/* Status badge — hoàn toàn vuông, kiểu terminal label */}
                <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-1 border rounded-none ${
                  inc.status === 'open'
                    ? 'bg-emergency-500/10 text-emergency-400 border-emergency-500/50'
                    : inc.status === 'assigned'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/50'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/50'
                }`}>
                  {inc.status === 'open' ? '! SOS / OPEN' : inc.status === 'assigned' ? '~ IN PROGRESS' : '✓ RESOLVED'}
                </span>
              </div>

              {/* 1. Trạng thái OPEN: Form điều động */}
              {inc.status === 'open' && (
                <div className="space-y-3">
                  <p className="text-[9px] text-muted font-mono font-bold uppercase tracking-widest">// CHỈ ĐỊNH ĐỘI CỨU HỘ THỰC ĐỊA</p>

                  <div className="space-y-1">
                    <label className="text-[9px] text-muted font-mono uppercase tracking-widest">NHÂN VIÊN CỨU HỘ</label>
                    <select
                      className="input w-full text-xs font-mono rounded-none"
                      value={selectedRescuer}
                      onChange={e => setSelectedRescuer(e.target.value)}
                    >
                      <option value="">-- CHỌN NHÂN VIÊN --</option>
                      {rescuers.map(r => (
                        <option key={r._id} value={r._id}>{r.name} ({r.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-muted font-mono uppercase tracking-widest">ETA TIẾP CẬN (PHÚT)</label>
                    <input
                      type="number"
                      className="input w-full text-xs font-mono rounded-none"
                      value={eta}
                      onChange={e => setEta(parseInt(e.target.value) || 30)}
                      min={1}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-muted font-mono uppercase tracking-widest">GHI CHÚ ĐIỀU ĐỘNG</label>
                    <textarea
                      className="input w-full text-xs h-16 resize-none font-mono tracking-wide rounded-none"
                      placeholder="// Hướng tiếp cận, vật tư y tế cần mang theo..."
                      value={dispatchNotes}
                      onChange={e => setDispatchNotes(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn-primary w-full justify-center bg-emergency-600 hover:bg-emergency-700 text-white font-mono font-black text-[10px] uppercase tracking-widest rounded-none"
                    onClick={() => {
                      if (!selectedRescuer) {
                        toast.error('Vui lòng chọn nhân viên cứu hộ thực địa');
                        return;
                      }
                      dispatchRescue.mutate({
                        assignedRescuerId: selectedRescuer,
                        etaMinutes: eta,
                        dispatchNotes
                      });
                    }}
                    disabled={dispatchRescue.isLoading || (inc.severityBreakdown?.needsManualReview && !inc.reviewedBy)}
                  >
                    {inc.severityBreakdown?.needsManualReview && !inc.reviewedBy
                      ? '! BLOCKED — CẦN DUYỆT THỦ CÔNG'
                      : '>>> BẮT ĐẦU ĐIỀU ĐỘNG CỨU HỘ'}
                  </button>
                </div>
              )}

              {/* 2. Trạng thái ASSIGNED: Thông tin đội + AAR form */}
              {inc.status === 'assigned' && (
                <div className="space-y-3">
                  <div className="bg-surface-2 border border-amber-500/30 border-l-4 border-l-amber-500 p-3 space-y-2">
                    <p className="font-mono font-black text-amber-400 text-[10px] uppercase tracking-widest">~ ĐANG TRIỂN KHAI CỨU HỘ</p>
                    <Row label="Đội phụ trách:" value={inc.assignedRescuerId?.name} />
                    <Row label="SĐT liên lạc:" value={inc.assignedRescuerId?.phone} />
                    <Row label="ETA tiếp cận:" value={`~${inc.etaMinutes} phút`} mono />
                    {inc.dispatchNotes && <p className="text-[10px] text-muted font-mono italic">"// {inc.dispatchNotes}"</p>}
                  </div>

                  <p className="text-[9px] text-muted font-mono font-bold uppercase tracking-widest">// BÁO CÁO SAU SỰ CỐ (AAR)</p>

                  <div className="space-y-1">
                    <label className="text-[9px] text-muted font-mono uppercase tracking-widest">TÓM TẮT CỨU HỘ</label>
                    <textarea
                      className="input w-full text-xs h-16 resize-none font-mono tracking-wide rounded-none"
                      placeholder="// Nạn nhân đã được tiếp cận an toàn, sơ cứu vết thương..."
                      value={aarSummary}
                      onChange={e => setAarSummary(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-muted font-mono uppercase tracking-widest">GHI CHÚ TỪ HIỆN TRƯỜNG</label>
                    <textarea
                      className="input w-full text-xs h-16 resize-none font-mono tracking-wide rounded-none"
                      placeholder="// Trật khớp cổ chân phải, đã nẹp cố định. Đang đưa về trạm..."
                      value={aarTeamNotes}
                      onChange={e => setAarTeamNotes(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn-primary w-full justify-center bg-safe hover:bg-safe-600 text-white font-mono font-black text-[10px] uppercase tracking-widest rounded-none"
                    onClick={() => {
                      resolveIncident.mutate({
                        afterActionReport: {
                          summary: aarSummary,
                          teamNotes: aarTeamNotes
                        }
                      });
                    }}
                    disabled={resolveIncident.isLoading}
                  >
                    ✓ GIẢI QUYẾT & ĐÓNG HỒ SƠ
                  </button>
                </div>
              )}

              {/* 3. Trạng thái RESOLVED: AAR summary */}
              {inc.status === 'resolved' && (
                <div className="space-y-3">
                  <div className="bg-surface-2 border border-sky-500/30 border-l-4 border-l-sky-500 p-3 space-y-2 text-xs">
                    <p className="font-mono font-black text-sky-400 text-[10px] uppercase tracking-widest">✓ MISSION COMPLETE — CỨU HỘ HOÀN THÀNH</p>
                    {inc.assignedRescuerId && (
                      <>
                        <Row label="Cứu hộ phụ trách:" value={inc.assignedRescuerId.name} />
                        <Row label="SĐT:" value={inc.assignedRescuerId.phone} />
                      </>
                    )}
                    <Row label="Thời gian phản ứng:" value={`${inc.afterActionReport?.responseTimeMinutes || 0} phút`} mono />
                    <Row label="Thời gian xử lý:" value={`${inc.afterActionReport?.resolutionTimeMinutes || 0} phút`} mono />
                  </div>

                  {inc.afterActionReport && (
                    <div className="space-y-2 text-xs bg-surface-2 border border-slate-700 p-3">
                      <p className="font-mono font-semibold text-white flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
                        <FileText size={12} className="text-slate-400" /> [ AAR — AFTER ACTION REPORT ]
                      </p>
                      <div className="space-y-1.5 border-t border-slate-700/60 pt-2">
                        <p className="text-[9px] text-muted font-mono uppercase tracking-widest">// TÓM TẮT CỨU HỘ:</p>
                        <p className="text-slate-300 font-mono text-[10px] leading-relaxed">"{inc.afterActionReport.summary}"</p>
                      </div>
                      {inc.afterActionReport.teamNotes && (
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-700/60">
                          <p className="text-[9px] text-muted font-mono uppercase tracking-widest">// GHI NHẬN TỪ HIỆN TRƯỜNG:</p>
                          <p className="text-slate-300 font-mono text-[10px] leading-relaxed">"{inc.afterActionReport.teamNotes}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User & Medical Info */}
            <Section title="Người báo cáo & Y tế">
              <Row label={<><User size={11} className="inline mr-1" />TÊN</>}  value={inc.userId?.name} />
              <Row label={<><Phone size={11} className="inline mr-1" />SĐT</>} value={inc.userId?.phone} />
              <Row label="VAI TRÒ" value={inc.userId?.role} />
              {inc.userId?.medicalProfile && (
                <div className="mt-2 pt-2 border-t border-slate-700/60 space-y-1.5">
                  <p className="font-mono font-black text-sky-400 text-[9px] uppercase tracking-widest">// HỒ SƠ Y TẾ SƠ CỨU:</p>
                  <Row label="NHÓM MÁU:" value={inc.userId.medicalProfile.bloodType === 'unknown' ? 'CHƯA RÕ' : inc.userId.medicalProfile.bloodType} mono />
                  <Row label="DỊ ỨNG:" value={inc.userId.medicalProfile.allergies || 'KHÔNG PHÁT HIỆN'} />
                  <Row label="THUỐC ĐANG DÙNG:" value={inc.userId.medicalProfile.medications || 'KHÔNG CÓ'} />
                  <Row label="BỆNH NỀN:" value={inc.userId.medicalProfile.chronicConditions || 'KHÔNG CÓ'} />
                  {inc.userId.medicalProfile.notes && (
                    <div className="bg-surface-2 border border-slate-700 border-l-2 border-l-sky-500/40 p-2 mt-1">
                      <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">// GHI CHÚ SƠ CỨU:</p>
                      <p className="text-[10px] text-slate-200 font-mono italic mt-0.5">"{inc.userId.medicalProfile.notes}"</p>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Incident metadata */}
            <Section title="Thông tin sự cố">
              <Row label={<><Clock size={11} className="inline mr-1" />THỜI GIAN</>}
                   value={format(new Date(inc.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })} mono />
              <Row label={<><BatteryFull size={11} className="inline mr-1" />PIN</>}
                   value={inc.batteryAtTime !== undefined ? `${inc.batteryAtTime}%` : '—'} mono />
              <Row label="NGUỒN" value={inc.source} />
              <Row label={<><MapPin size={11} className="inline mr-1" />TOẠ ĐỘ</>}
                   value={coords ? `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}` : '—'}
                   mono />
            </Section>

            {/* GPS Track */}
            {trackCoords.length > 0 && (
              <Section title="Theo dõi GPS">
                <Row label="SỐ ĐIỂM GPS" value={trackCoords.length} mono />
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
