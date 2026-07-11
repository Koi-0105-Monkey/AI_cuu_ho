import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MagnifyingGlass, Shield, Person, Users } from '@phosphor-icons/react';
import Header from '../components/layout/Header';
import api from '../services/api';

const ROLES = ['', 'user', 'rescuer', 'admin'];
const ROLE_LABEL = { user: 'Người dùng', rescuer: 'Cứu hộ', admin: 'Admin' };

const roleBadge = (r) => ({
  admin:   'badge bg-purple-500/20 text-purple-400',
  rescuer: 'badge bg-blue-500/20 text-blue-400',
  user:    'badge bg-surface-4 text-muted-light',
}[r] || 'badge bg-surface-4 text-muted-light');

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
      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Filter bar */}
        <div className="card flex flex-wrap gap-3 items-center p-4">
          <label className="sr-only" htmlFor="user-search">Tìm theo tên hoặc số điện thoại</label>
          <div className="flex items-center gap-2 bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
            <MagnifyingGlass size={15} className="text-muted shrink-0" />
            <input
              id="user-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên, SĐT… (tự động)"
              className="bg-transparent text-sm text-white placeholder:text-muted outline-none flex-1"
            />
          </div>
          <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="select w-36">
            <option value="">Tất cả vai trò</option>
            {ROLES.slice(1).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Danh sách người dùng">
              <thead>
                <tr className="border-b border-surface-4 text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 text-left">Tên</th>
                  <th className="px-4 py-3 text-left">Số điện thoại</th>
                  <th className="px-4 py-3 text-left">Vai trò</th>
                  <th className="px-4 py-3 text-left">Ngày tạo</th>
                  <th className="px-4 py-3 text-left">Trang bị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-4">
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-surface-3 animate-pulse rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted">
                        <Users size={32} weight="thin" className="text-surface-5" />
                        <p className="text-sm">Không tìm thấy người dùng nào.</p>
                        {search && (
                          <button
                            onClick={() => setSearch('')}
                            className="text-xs text-emergency-400 hover:underline"
                          >
                            Xóa từ khóa để xem tất cả
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u._id} className="hover:bg-surface-3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-surface-4 flex items-center justify-center shrink-0">
                            <Person size={14} className="text-muted-light" />
                          </div>
                          <span className="text-white font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-light">{u.phone}</td>
                      <td className="px-4 py-3">
                        <span className={roleBadge(u.role)}>
                          {u.role === 'admin' ? <Shield size={11} className="inline" /> : null} {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-light whitespace-nowrap">
                        {format(new Date(u.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-light">
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-4">
              <p className="text-xs text-muted">Trang {page} / {pages} • {data?.total} người</p>
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
