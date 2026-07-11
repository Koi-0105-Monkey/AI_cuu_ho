import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FunnelSimple, ArrowRight, Printer, Warning } from '@phosphor-icons/react';
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
      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* ─── Filters ─────────────────── */}
        <div className="card flex flex-wrap gap-3 items-center p-4">
          <FunnelSimple size={16} className="text-muted shrink-0" />
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="select w-36">
            <option value="">Tất cả loại</option>
            {TYPES.slice(1).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="select w-36">
            <option value="">Tất cả trạng thái</option>
            {STATUSES.slice(1).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="input w-40" />
          <span className="text-muted text-xs">→</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="input w-40" />
          {(type || status || dateFrom || dateTo) && (
            <button onClick={() => { setType(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                    className="btn-ghost text-xs px-2 py-1">
              Xoá bộ lọc
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-surface-3 border border-surface-4 text-slate-300 hover:bg-surface-4 text-xs font-medium transition-all flex items-center gap-1.5"
              title="In hồ sơ xác minh cho 115/114"
            >
              <Printer size={14} />
              Xuất Hồ Sơ
            </button>
          </div>
        </div>

        {/* ─── Table ───────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Danh sách sự cố">
              <thead>
                <tr className="border-b border-surface-4 text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 text-left">Loại</th>
                  <th className="px-4 py-3 text-left">Người báo</th>
                  <th className="px-4 py-3 text-left">Vị trí GPS</th>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                  <th className="px-4 py-3 text-left">Pin %</th>
                  <th className="px-4 py-3 text-left">Mức độ</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-4">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-surface-3 animate-pulse rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted">
                        <Warning size={32} weight="thin" className="text-surface-5" />
                        <p className="text-sm">Không tìm thấy sự cố nào.</p>
                        {(type || status || dateFrom || dateTo) && (
                          <button
                            onClick={() => { setType(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                            className="text-xs text-emergency-400 hover:underline"
                          >
                            Xóa bộ lọc để xem tất cả
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidents.map(inc => (
                    <tr key={inc._id}
                        onClick={() => navigate(`/incidents/${inc._id}`)}
                        className="hover:bg-surface-3 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        {TYPE_LABELS[inc.type] || inc.type}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white">{inc.userId?.name || '—'}</p>
                        <p className="text-xs text-muted">{inc.userId?.phone}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-light">
                        {inc.location?.coordinates
                          ? `${inc.location.coordinates[1].toFixed(5)}, ${inc.location.coordinates[0].toFixed(5)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-light whitespace-nowrap">
                        {format(new Date(inc.createdAt), 'dd/MM HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-muted-light">
                        {inc.batteryAtTime ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={severityBadge(inc.severity)}>Mức {inc.severity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(inc.status)}>{statusLabel(inc.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <ArrowRight size={16} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-4">
              <p className="text-xs text-muted">Trang {page} / {pages} • {data?.total} kết quả</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn-ghost text-xs px-3 py-1 disabled:opacity-30"
                  aria-label="Trang trước"
                >← Trước</button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-ghost text-xs px-3 py-1 disabled:opacity-30"
                  aria-label="Trang sau"
                >Sau →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
