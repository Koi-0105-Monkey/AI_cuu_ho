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

const Section = ({ title, children }) => (
  <div className="card space-y-3">
    <h3 className="text-xs uppercase tracking-wider text-muted font-semibold">{title}</h3>
    {children}
  </div>
);

const Row = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-2 text-sm">
    <span className="text-muted shrink-0 flex items-center gap-1">{label}</span>
    <span className={`${mono ? 'font-mono text-xs' : ''} text-muted-light text-right`}>{value || '—'}</span>
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

  const VIETTEL_MAPS_KEY = import.meta.env.VITE_VIETTEL_MAPS_KEY || '';
  const TILE_URL = VIETTEL_MAPS_KEY 
    ? `https://maps.viettelmap.vn/api/v1/tile/{z}/{x}/{y}.png?key=${VIETTEL_MAPS_KEY}`
    : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

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
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Đang tải…</div>
      </div>
    );
  }
  if (!inc) return null;

  const coords     = inc.location?.coordinates;
  const center     = coords ? [coords[1], coords[0]] : [16.047, 108.206];
  const trackCoords = trackData?.map(p => [p.coordinates[1], p.coordinates[0]]) || [];
  const nextStatus = STATUS_FLOW[inc.status];

  return (
    <div className="flex flex-col h-full">
      <Header title="Chi tiết Sự cố" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Quay lại
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ─── Left column ────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Map */}
            <div className="card p-0 overflow-hidden">
              <MapContainer center={center} zoom={15} className="h-[350px] w-full">
                <TileLayer
                  url={TILE_URL}
                  attribution='&copy; <a href="https://viettelmap.vn/">Viettel Maps</a>'
                  maxZoom={19}
                />
                <Marker position={center}>
                  <Popup>
                    <span className="text-xs">{inc.type} — Mức {inc.severity}</span>
                  </Popup>
                </Marker>
                {trackCoords.length > 1 && (
                  <Polyline positions={trackCoords} color="#10b981" weight={3} opacity={0.8} />
                )}
              </MapContainer>
            </div>

            {/* Message */}
            {inc.message && (
              <Section title="Tin nhắn">
                <div className="flex gap-2">
                  <ChatCentered size={16} className="text-muted mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-light leading-relaxed">{inc.message}</p>
                </div>
              </Section>
            )}

            {/* Google Gemini AI Analysis */}
            {(inc.audioUrl || inc.voiceTranscript || inc.extractedEntities) && (
              <Section title="Phân tích sự cố bằng Google Gemini AI (Miễn phí)">
                <div className="space-y-4">
                  {/* Audio SOS Player */}
                  {inc.audioUrl && (
                    <div className="bg-[#1b253b] p-3 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        <span>🎙️ Tệp ghi âm Voice SOS</span>
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
                    <div className="bg-[#1b253b] p-3 rounded-lg border border-slate-700">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          {inc.source === 'sms' ? '✍️ Tin nhắn khôi phục dấu (Gemini NLP)' : '📝 Bản dịch giọng nói (Gemini ASR)'}
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
                          className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded flex items-center gap-1 transition-all"
                          title="Đọc tin nhắn bằng tiếng Việt"
                        >
                          🔊 Nghe đọc
                        </button>
                      </div>
                      <p className="text-sm text-white italic">"{inc.voiceTranscript}"</p>
                    </div>
                  )}

                  {/* Extracted Entities */}
                  {inc.extractedEntities && (
                    <div className="bg-[#1b253b] p-3 rounded-lg border border-slate-700">
                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                        🔍 Thực thể cứu nạn trích xuất (NLP NER)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-xs">Nạn nhân</span>
                          <span className="font-semibold text-white">{inc.extractedEntities.victimName || 'Chưa rõ'}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-xs">Địa điểm</span>
                          <span className="font-semibold text-white">{inc.extractedEntities.location || 'Chưa rõ'}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-xs">Sự cố</span>
                          <span className="font-semibold text-amber-400">{inc.extractedEntities.incidentType || 'Chưa rõ'}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-xs">Mức khẩn cấp</span>
                          <span className="font-semibold text-rose-500">Cấp {inc.extractedEntities.severity || 3}</span>
                        </div>
                      </div>

                      <button
                        className="btn-primary w-fit mt-3 text-xs"
                        onClick={() => {
                          const val = `[Viettel AI NER] Nạn nhân: ${inc.extractedEntities.victimName || 'Chưa rõ'}, Địa điểm: ${inc.extractedEntities.location || 'Chưa rõ'}, Loại sự cố: ${inc.extractedEntities.incidentType || 'Khác'}`;
                          setNote(val);
                          toast.success('Đã áp dụng thông tin AI vào ghi chú xử lý');
                        }}
                      >
                        Áp dụng thông tin AI vào ghi chú
                      </button>
                    </div>
                  )}

                  {/* Severity Breakdown */}
                  {inc.severityBreakdown && (
                    <div className={`p-4 rounded-lg border ${
                      inc.severityBreakdown.needsManualReview 
                        ? 'bg-amber-500/5 border-amber-500/30' 
                        : 'bg-[#1b253b] border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          ⚖️ Động cơ Phân tích Độ Nghiêm Trọng (Severity Scoring Engine)
                        </div>
                        {inc.severityBreakdown.needsManualReview && (
                          <span className="text-[9px] bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-black uppercase animate-pulse">
                            ⚠️ Cần duyệt lại
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center text-xs mb-3">
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-[10px]">Cơ bản</span>
                          <span className="font-bold text-slate-300">{inc.severityBreakdown.baseScore || 3}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-[10px]">Y tế</span>
                          <span className="font-bold text-rose-400">+{inc.severityBreakdown.medicalAdjustment || 0}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-[10px]">Pin</span>
                          <span className="font-bold text-amber-400">+{inc.severityBreakdown.batteryAdjustment || 0}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-muted block text-[10px]">Thời tiết</span>
                          <span className="font-bold text-sky-400">+{inc.severityBreakdown.weatherAdjustment || 0}</span>
                        </div>
                        <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/20">
                          <span className="text-emerald-400 block text-[10px] font-bold">Tổng điểm</span>
                          <span className="font-extrabold text-emerald-400 text-sm">{inc.severityBreakdown.finalScore || inc.severity}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs py-2 border-t border-slate-700/60 mb-2">
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Độ tin cậy của thuật toán AI:</span>
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-black border ${
                          inc.severityBreakdown.aiConfidence === 'High' 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : inc.severityBreakdown.aiConfidence === 'Medium'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                        }`}>
                          {inc.severityBreakdown.aiConfidence === 'High' ? 'CAO' : inc.severityBreakdown.aiConfidence === 'Medium' ? 'TRUNG BÌNH' : 'THẤP'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1">
                        <span className="font-semibold block text-slate-400 text-[10px] uppercase">Chi tiết điều chỉnh:</span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-300">
                          {inc.severityBreakdown.reasons?.map((r, index) => (
                            <li key={index} className="leading-relaxed">{r}</li>
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
              <Section title="Ghi chú xử lý">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú nội bộ về sự cố này…"
                  className="input resize-none"
                />
                <button
                  className="btn-primary w-fit"
                  onClick={() => toast.success('Ghi chú đã lưu (chức năng hoàn thiện sau)')}
                >
                  Lưu ghi chú
                </button>
              </Section>
            )}
          </div>

          {/* ─── Right column ───────────────────── */}
          <div className="space-y-4">
            {/* Status & Dispatch / AAR Coordination Panel */}
            <Section title="Trực Ban & Điều Phối Cứu Hộ">
              <div className="flex items-center justify-between pb-2 border-b border-surface-3">
                <div className="flex items-center gap-2">
                  <BellRinging size={16} className="text-emergency-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">{inc.type}</span>
                </div>
                <span className={`badge font-bold ${
                  inc.status === 'open' ? 'badge-high' : inc.status === 'assigned' ? 'badge-med' : 'badge-low'
                }`}>
                  {inc.status === 'open' ? '🔴 ĐANG MỞ (SOS)' : inc.status === 'assigned' ? '🟡 ĐANG CỨU HỘ' : '🟢 ĐÃ XONG (RESOLVED)'}
                </span>
              </div>

              {/* 1. Trạng thái OPEN: Hiển thị form điều động cứu hộ */}
              {inc.status === 'open' && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Chỉ định đội cứu hộ thực địa</p>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Nhân viên cứu hộ</label>
                    <select
                      className="input w-full text-xs"
                      value={selectedRescuer}
                      onChange={e => setSelectedRescuer(e.target.value)}
                    >
                      <option value="">-- Chọn nhân viên cứu hộ --</option>
                      {rescuers.map(r => (
                        <option key={r._id} value={r._id}>{r.name} ({r.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">ETA dự kiến tiếp cận (phút)</label>
                    <input
                      type="number"
                      className="input w-full text-xs"
                      value={eta}
                      onChange={e => setEta(parseInt(e.target.value) || 30)}
                      min={1}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Ghi chú điều động</label>
                    <textarea
                      className="input w-full text-xs h-16 resize-none"
                      placeholder="Mô tả hướng tiếp cận, mang theo vật tư y tế gì..."
                      value={dispatchNotes}
                      onChange={e => setDispatchNotes(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn-primary w-full justify-center bg-emergency-600 hover:bg-emergency-700 text-white font-bold"
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
                    disabled={dispatchRescue.isLoading}
                  >
                    🚀 BẮT ĐẦU ĐIỀU ĐỘNG CỨU HỘ
                  </button>
                </div>
              )}

              {/* 2. Trạng thái ASSIGNED: Hiển thị thông tin đội cứu hộ + form đóng hồ sơ sự cố (AAR) */}
              {inc.status === 'assigned' && (
                <div className="space-y-3 pt-2">
                  <div className="bg-[#1b253b] p-3 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <p className="font-bold text-amber-400">⚡ ĐANG TRIỂN KHAI CỨU HỘ</p>
                    <Row label="Đội phụ trách:" value={inc.assignedRescuerId?.name} />
                    <Row label="SĐT liên lạc:" value={inc.assignedRescuerId?.phone} />
                    <Row label="ETA tiếp cận:" value={`~${inc.etaMinutes} phút`} />
                    {inc.dispatchNotes && <p className="text-[10px] text-muted-light italic">"Ghi chú: {inc.dispatchNotes}"</p>}
                  </div>

                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-4">Báo cáo sau sự cố (AAR)</p>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Tóm tắt cứu hộ (để lưu trữ/HQ báo cáo)</label>
                    <textarea
                      className="input w-full text-xs h-16 resize-none"
                      placeholder="Nạn nhân đã được tiếp cận an toàn, sơ cứu vết thương..."
                      value={aarSummary}
                      onChange={e => setAarSummary(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Ghi chú từ hiện trường của đội cứu hộ</label>
                    <textarea
                      className="input w-full text-xs h-16 resize-none"
                      placeholder="Trật khớp cổ chân phải, đã nẹp cố định. Đang đưa về trạm..."
                      value={aarTeamNotes}
                      onChange={e => setAarTeamNotes(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn-primary w-full justify-center bg-safe hover:bg-safe-600 text-white font-bold"
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

              {/* 3. Trạng thái RESOLVED: Hiển thị tóm tắt hiệu quả cứu nạn AAR */}
              {inc.status === 'resolved' && (
                <div className="space-y-3 pt-2">
                  <div className="bg-[#10b981]/10 p-3 rounded-xl border border-[#10b981]/20 space-y-2 text-xs">
                    <p className="font-bold text-emerald-400">✓ ĐÃ HOÀN THÀNH CỨU HỘ</p>
                    {inc.assignedRescuerId && (
                      <>
                        <Row label="Cứu hộ phụ trách:" value={inc.assignedRescuerId.name} />
                        <Row label="SĐT:" value={inc.assignedRescuerId.phone} />
                      </>
                    )}
                    <Row label="Thời gian phản ứng (Response):" value={`${inc.afterActionReport?.responseTimeMinutes || 0} phút`} />
                    <Row label="Thời gian xử lý hiện trường (Resolution):" value={`${inc.afterActionReport?.resolutionTimeMinutes || 0} phút`} />
                  </div>

                  {inc.afterActionReport && (
                    <div className="space-y-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-surface-4">
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-400" /> Báo cáo sau sự cố (AAR)
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted uppercase">Tóm tắt cứu hộ:</p>
                        <p className="text-slate-300 italic">"{inc.afterActionReport.summary}"</p>
                      </div>
                      {inc.afterActionReport.teamNotes && (
                        <div className="space-y-1.5 pt-1.5 border-t border-surface-4">
                          <p className="text-[10px] text-muted uppercase">Ghi nhận từ hiện trường:</p>
                          <p className="text-slate-300 italic">"{inc.afterActionReport.teamNotes}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* User info */}
            <Section title="Người báo cáo & Y tế">
              <Row label={<><User size={13} className="inline mr-1" />Tên</>}   value={inc.userId?.name} />
              <Row label={<><Phone size={13} className="inline mr-1" />SĐT</>}  value={inc.userId?.phone} />
              <Row label="Vai trò" value={inc.userId?.role} />
              {inc.userId?.medicalProfile && (
                <div className="mt-2 pt-2 border-t border-surface-4 space-y-1.5 text-xs">
                  <p className="font-bold text-emerald-400">🩺 Thông tin y tế sơ cứu:</p>
                  <Row label="Nhóm máu:" value={inc.userId.medicalProfile.bloodType === 'unknown' ? 'Chưa rõ' : inc.userId.medicalProfile.bloodType} />
                  <Row label="Dị ứng:" value={inc.userId.medicalProfile.allergies || 'Không phát hiện'} />
                  <Row label="Thuốc đang dùng:" value={inc.userId.medicalProfile.medications || 'Không có'} />
                  <Row label="Bệnh nền:" value={inc.userId.medicalProfile.chronicConditions || 'Không có'} />
                  {inc.userId.medicalProfile.notes && (
                    <div className="bg-[#1b253b] p-2 rounded border border-slate-700 mt-1">
                      <p className="text-[10px] text-slate-400">Ghi chú sơ cứu:</p>
                      <p className="text-[11px] text-slate-200 italic mt-0.5">"{inc.userId.medicalProfile.notes}"</p>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Incident meta */}
            <Section title="Thông tin sự cố">
              <Row label={<><Clock size={13} className="inline mr-1" />Thời gian</>}
                   value={format(new Date(inc.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })} />
              <Row label={<><BatteryFull size={13} className="inline mr-1" />Pin</>}
                   value={inc.batteryAtTime !== undefined ? `${inc.batteryAtTime}%` : '—'} />
              <Row label="Nguồn" value={inc.source} />
              <Row label={<><MapPin size={13} className="inline mr-1" />Toạ độ</>}
                   value={coords ? `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}` : '—'}
                   mono />
            </Section>

            {/* Track summary */}
            {trackCoords.length > 0 && (
              <Section title="Theo dõi GPS">
                <Row label="Số điểm" value={trackCoords.length} />
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
