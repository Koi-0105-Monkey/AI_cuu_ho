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
  MapPin, ChatCentered, BellRinging
} from '@phosphor-icons/react';
import Header from '../components/layout/Header';
import api from '../services/api';

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

  const VIETTEL_MAPS_KEY = import.meta.env.VITE_VIETTEL_MAPS_KEY || '';
  const TILE_URL = VIETTEL_MAPS_KEY 
    ? `https://maps.viettelmap.vn/api/v1/tile/{z}/{x}/{y}.png?key=${VIETTEL_MAPS_KEY}`
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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
            {/* Status & action */}
            <Section title="Trạng thái">
              <div className="flex items-center gap-2">
                <BellRinging size={16} className="text-emergency-400" />
                <span className="text-sm font-medium text-white">{inc.type}</span>
                <span className={`badge ${inc.severity <= 2 ? 'badge-low' : inc.severity === 3 ? 'badge-med' : 'badge-high'}`}>
                  Mức {inc.severity}
                </span>
              </div>
              {nextStatus && (
                <button
                  className={`btn-primary w-full justify-center mt-2 ${
                    inc.status === 'assigned'
                      ? 'bg-safe/20 text-safe-400 border border-safe/40 hover:bg-safe/30'
                      : ''
                  }`}
                  onClick={() => updateStatus.mutate(nextStatus)}
                  disabled={updateStatus.isLoading}
                >
                  {inc.status === 'assigned' ? <CheckCircle size={16} /> : <BellRinging size={16} />}
                  {STATUS_LABELS[inc.status]}
                </button>
              )}
              {inc.status === 'resolved' && (
                <div className="flex items-center gap-2 text-safe-400 text-sm">
                  <CheckCircle size={16} weight="fill" /> Đã giải quyết
                </div>
              )}
            </Section>

            {/* User info */}
            <Section title="Người báo cáo">
              <Row label={<><User size={13} className="inline mr-1" />Tên</>}   value={inc.userId?.name} />
              <Row label={<><Phone size={13} className="inline mr-1" />SĐT</>}  value={inc.userId?.phone} />
              <Row label="Vai trò" value={inc.userId?.role} />
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
