import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MagnifyingGlass, Shield, Person, Users } from '@phosphor-icons/react';
import Header from '../components/layout/Header';
import api from '../services/api';

const ROLES = ['', 'user', 'rescuer', 'admin'];
const ROLE_LABEL = { user: 'Người dùng', rescuer: 'Cứu hộ', admin: 'Admin' };

// Badge vuông, kiểu terminal — giữ nguyên ý nghĩa màu
const roleBadge = (r) => ({
  admin:   'badge bg-purple-500/15 text-purple-400 border border-purple-500/40 rounded-none font-mono text-[9px] uppercase tracking-widest',
  rescuer: 'badge bg-blue-500/15 text-blue-400 border border-blue-500/40 rounded-none font-mono text-[9px] uppercase tracking-widest',
  user:    'badge bg-surface-3 text-muted-light border border-slate-700 rounded-none font-mono text-[9px] uppercase tracking-widest',
}[r] || 'badge bg-surface-3 text-muted-light border border-slate-700 rounded-none font-mono text-[9px] uppercase tracking-widest');

export default function UserList() {
  const [search, setSearch] = useState('');
  const [role, setRole]     = useState('');
  const [page, setPage]     = useState(1);
  const [query, setQuery]   = useState('');

  // Debounce: auto-trigger search 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search: query, role, page }],
    queryFn: () => api.get('/admin/users', {
      params: { search: query || undefined, role: role || undefined, page, limit: 25 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const users = data?.data || [];
  const pages = data?.pages || 1;

  return (
    <div className="flex flex-col h-full">
      <Header title="Người dùng" />
      <div className="flex-1 overflow-auto p-4 space-y-3">

        {/* ─── Filter bar ──────────────────────────────────── */}
        <div className="bg-surface-1 border border-slate-700 flex flex-wrap gap-3 items-center p-3">
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">// TÌM KIẾM:</span>

          {/* Search input */}
          <label className="sr-only" htmlFor="user-search">Tìm theo tên hoặc số điện thoại</label>
          <div className="flex items-center gap-2 bg-surface-2 border border-slate-700 px-3 py-2 flex-1 min-w-[180px]">
            <MagnifyingGlass size={13} className="text-muted shrink-0" />
            <input
              id="user-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tên, SĐT… (tự động)"
              className="bg-transparent text-xs font-mono text-white placeholder:text-muted outline-none flex-1 tracking-wide"
            />
          </div>

          {/* Role filter */}
          <select
            value={role}
            onChange={e => { setRole(e.target.value); setPage(1); }}
            className="select w-36 rounded-none font-mono text-xs"
          >
            <option value="">TẤT CẢ VAI TRÒ</option>
            {ROLES.slice(1).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>

        {/* ─── Table ───────────────────────────────────────── */}
        <div className="border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Danh sách người dùng">
              <thead>
                <tr className="bg-surface-2 border-b border-slate-700 text-[9px] font-mono uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3 text-left">TÊN</th>
                  <th className="px-4 py-3 text-left">SỐ ĐIỆN THOẠI</th>
                  <th className="px-4 py-3 text-left">VAI TRÒ</th>
                  <th className="px-4 py-3 text-left">NGÀY TẠO</th>
                  <th className="px-4 py-3 text-left">TRANG BỊ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-surface-3 animate-pulse w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted">
                        <Users size={28} weight="thin" className="text-slate-600" />
                        <p className="text-[11px] font-mono uppercase tracking-widest">[ KHÔNG TÌM THẤY NGƯỜI DÙNG NÀO ]</p>
                        {search && (
                          <button
                            onClick={() => setSearch('')}
                            className="text-[10px] font-mono text-emergency-400 hover:underline uppercase tracking-wide"
                          >
                            // Xóa từ khóa để xem tất cả
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u._id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Avatar — vuông thay vì tròn */}
                          <div className="w-6 h-6 bg-surface-3 border border-slate-700 flex items-center justify-center shrink-0">
                            <Person size={12} className="text-muted-light" />
                          </div>
                          <span className="text-white text-xs font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-light tracking-wide">{u.phone}</td>
                      <td className="px-4 py-3">
                        <span className={roleBadge(u.role)}>
                          {u.role === 'admin' ? <Shield size={9} className="inline mr-0.5" /> : null}{ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-light whitespace-nowrap">
                        {format(new Date(u.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-light">
                        {u.equipment?.join(', ') || '—'}
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
                TRANG {page} / {pages} • {data?.total} NGƯỜI
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
