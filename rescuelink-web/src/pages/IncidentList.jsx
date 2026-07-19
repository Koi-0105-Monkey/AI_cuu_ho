import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FunnelSimple, ArrowRight, Printer, Warning, CheckCircle, Clock } from '@phosphor-icons/react';
import Header from '../components/layout/Header';
import api from '../services/api';

const TYPES = ['', 'CRASH', 'LOST', 'FIRE', 'MED', 'VEH', 'MANUAL'];
const STATUSES = ['', 'open', 'assigned', 'resolved'];
const TYPE_LABELS = { CRASH:'Tai nạn', LOST:'Lạc đường', FIRE:'Cháy', MED:'Y tế', VEH:'Xe hỏng', MANUAL:'Thủ công' };

const severityBadge = (s) => {
  if (s <= 2) return 'badge-low';
  if (s === 3) return 'badge-med';
  return 'badge-high';
};
const statusBadge = (s) => {
  if (s === 'open')     return 'badge-open';
  if (s === 'assigned') return 'badge-assigned';
  return 'badge-resolved';
};
const statusLabel = (s) => ({ open: 'Mở', assigned: 'Đã giao', resolved: 'Xong' }[s] || s);

export default function IncidentList() {
  const navigate = useNavigate();
  const [type, setType]         = useState('');
  const [status, setStatus]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]         = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', { type, status, dateFrom, dateTo, page }],
    queryFn: () => api.get('/incidents', {
      params: { type: type || undefined, status: status || undefined,
                dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
                page, limit: 20 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const incidents = data?.data || [];
  const pages     = data?.pages || 1;

  return (
    <div className="flex flex-col h-full">
      <Header title="Danh sách Sự cố" liveCount={data?.total} />
      <div className="flex-1 overflow-auto p-4 space-y-3">

        {/* ─── Filters ─────────────────────────────────────── */}
        <div className="bg-surface-1 border border-slate-700 flex flex-wrap gap-3 items-center p-3">
          <FunnelSimple size={14} className="text-muted shrink-0" />
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">// BỘ LỌC:</span>

          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1); }}
            className="select w-36 rounded-none font-mono text-xs"
          >
            <option value="">TẤT CẢ LOẠI</option>
            {TYPES.slice(1).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>

          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="select w-36 rounded-none font-mono text-xs"
          >
            <option value="">TẤT CẢ TRẠNG THÁI</option>
            {STATUSES.slice(1).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="input w-40 rounded-none font-mono text-xs"
          />
          <span className="text-muted text-[10px] font-mono">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="input w-40 rounded-none font-mono text-xs"
          />

          {(type || status || dateFrom || dateTo) && (
            <button
              onClick={() => { setType(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="btn-ghost text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-none"
            >
              [ XÓA BỘ LỌC ]
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-none bg-surface-2 border border-slate-700 text-slate-300 hover:bg-surface-3 text-[10px] font-mono uppercase tracking-wide transition-all flex items-center gap-1.5"
              title="In hồ sơ xác minh cho 115/114"
            >
              <Printer size={12} />
              [ XUẤT HỒ SƠ ]
            </button>
          </div>
        </div>

        {/* ─── Table ────────────────────────────────────────── */}
        <div className="border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Danh sách sự cố">
              <thead>
                <tr className="bg-surface-2 border-b border-slate-700 text-[9px] font-mono uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3 text-left">LOẠI</th>
                  <th className="px-4 py-3 text-left">NGƯỜI BÁO</th>
                  <th className="px-4 py-3 text-left">VỊ TRÍ GPS</th>
                  <th className="px-4 py-3 text-left">THỜI GIAN</th>
                  <th className="px-4 py-3 text-left">PIN %</th>
                  <th className="px-4 py-3 text-left">MỨC ĐỘ</th>
                  <th className="px-4 py-3 text-left">TRẠNG THÁI</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-surface-3 animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted">
                        <Warning size={28} weight="thin" className="text-slate-600" />
                        <p className="text-[11px] font-mono uppercase tracking-widest">[ KHÔNG TÌM THẤY SỰ CỐ NÀO ]</p>
                        {(type || status || dateFrom || dateTo) && (
                          <button
                            onClick={() => { setType(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                            className="text-[10px] font-mono text-emergency-400 hover:underline uppercase tracking-wide"
                          >
                            // Xóa bộ lọc để xem tất cả
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidents.map(inc => (
                    <tr
                      key={inc._id}
                      onClick={() => navigate(`/incidents/${inc._id}`)}
                      className="hover:bg-surface-2 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-white text-xs uppercase tracking-wide">
                        {TYPE_LABELS[inc.type] || inc.type}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white text-xs font-medium">{inc.userId?.name || '—'}</p>
                        <p className="text-[10px] text-muted font-mono">{inc.userId?.phone}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-light tracking-wide">
                        {inc.location?.coordinates
                          ? `${inc.location.coordinates[1].toFixed(5)}, ${inc.location.coordinates[0].toFixed(5)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-light whitespace-nowrap tracking-wide">
                        {format(new Date(inc.createdAt), 'dd/MM HH:mm')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-light">
                        {inc.batteryAtTime ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${severityBadge(inc.severity)} flex items-center gap-0.5 w-fit rounded-none font-mono text-[9px] uppercase tracking-widest`}>
                          {inc.severity <= 2 ? (
                            <CheckCircle size={9} weight="fill" className="text-sky-400" />
                          ) : inc.severity === 3 ? (
                            <Warning size={9} weight="bold" className="text-amber-400" />
                          ) : (
                            <Warning size={9} weight="fill" className="text-rose-400 animate-pulse" />
                          )}
                          MỨC {inc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${statusBadge(inc.status)} flex items-center gap-0.5 w-fit rounded-none font-mono text-[9px] uppercase tracking-widest`}>
                          {inc.status === 'open' ? (
                            <Warning size={9} weight="bold" className="text-rose-400" />
                          ) : inc.status === 'assigned' ? (
                            <Clock size={9} className="text-amber-400" />
                          ) : (
                            <CheckCircle size={9} weight="fill" className="text-sky-400" />
                          )}
                          {statusLabel(inc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <ArrowRight size={14} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-surface-2">
              <p className="text-[9px] font-mono text-muted uppercase tracking-widest">
                TRANG {page} / {pages} • {data?.total} KẾT QUẢ
              </p>
              <div className="flex gap-px bg-slate-700">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn-ghost text-[10px] font-mono uppercase tracking-wide px-3 py-1.5 rounded-none disabled:opacity-30 bg-surface-2 hover:bg-surface-3"
                  aria-label="Trang trước"
                >← TRƯỚC</button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-ghost text-[10px] font-mono uppercase tracking-wide px-3 py-1.5 rounded-none disabled:opacity-30 bg-surface-2 hover:bg-surface-3"
                  aria-label="Trang sau"
                >SAU →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
