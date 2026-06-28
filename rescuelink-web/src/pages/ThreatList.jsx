import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
  Tree, Info, CheckCircle, Warning, SealWarning, Calendar, User, Phone, MapPin 
} from '@phosphor-icons/react';
import Header from '../components/layout/Header';
import api from '../services/api';

export default function ThreatList() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('open');

  // Load all threats
  const { data: threats = [], isLoading } = useQuery({
    queryKey: ['threats'],
    queryFn: () => api.get('/vqg/threats').then(r => r.data.data || [])
  });

  // Update threat status mutation
  const updateThreatStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/vqg/threats/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['threats']);
      toast.success('Đã cập nhật trạng thái mối đe dọa thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái.');
    }
  });

  const handleResolve = (id) => {
    if (confirm('Xác nhận mối đe dọa này đã được kiểm lâm xử lý/tháo dỡ hoàn tất?')) {
      updateThreatStatus.mutate({ id, status: 'resolved' });
    }
  };

  const filteredThreats = threats.filter(t => {
    const typeMatch = filterType === 'ALL' || t.type === filterType;
    const statusMatch = filterStatus === 'ALL' || t.status === filterStatus;
    return typeMatch && statusMatch;
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="Nhật ký Đe dọa Lâm nghiệp" />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Giám sát các mối đe dọa đa dạng sinh học và vi phạm rừng do Kiểm lâm/Guide báo cáo</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-surface-2 border border-surface-4 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">Tất cả loại vi phạm</option>
              <option value="GỖ LẬU">Chặt phá gỗ lậu</option>
              <option value="BẪY THÚ">Bẫy thú hoang</option>
              <option value="LẤN CHIẾM">Lấn chiếm đất rừng</option>
              <option value="SĂN BẮT">Săn bắt trái phép</option>
              <option value="KHÁC">Khác</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-surface-2 border border-surface-4 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="open">Đang mở (Chưa xử lý)</option>
              <option value="resolved">Đã xử lý xong</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12 text-muted text-sm">Đang tải danh sách vi phạm...</div>
        ) : filteredThreats.length === 0 ? (
          <div className="card text-center py-16 space-y-3">
            <Info size={32} className="text-muted mx-auto opacity-60" />
            <p className="text-xs text-muted">Không tìm thấy ghi nhận vi phạm rừng nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredThreats.map(threat => (
              <div 
                key={threat._id} 
                className={`card border p-5 flex flex-col justify-between gap-4 transition-all duration-300 ${
                  threat.status === 'resolved' 
                    ? 'border-safe-950 bg-safe-950/5' 
                    : 'border-emergency-950 bg-emergency-950/5'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`badge ${
                      threat.type === 'GỖ LẬU' || threat.type === 'SĂN BẮT'
                        ? 'badge-high' 
                        : threat.type === 'BẪY THÚ' 
                        ? 'badge-med' 
                        : 'badge-low'
                    }`}>
                      {threat.type}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      threat.status === 'resolved' ? 'text-safe-400' : 'text-emergency-400 animate-pulse'
                    }`}>
                      {threat.status === 'resolved' ? '✓ Đã tháo dỡ' : '⚠️ Đang mở'}
                    </span>
                  </div>

                  {threat.description && (
                    <p className="text-sm text-white leading-relaxed font-medium">
                      "{threat.description}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-surface-4 space-y-1.5 text-xs text-muted">
                    <div className="flex items-center gap-1.5">
                      <User size={14} className="text-muted-light" />
                      <span>Kiểm lâm báo cáo: <strong>{threat.reporterId?.name || 'Cán bộ tuần tra'}</strong> ({threat.reporterId?.phone || '—'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-muted-light" />
                      <span>Ngày phát hiện: {format(new Date(threat.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-muted-light" />
                      <span>Tọa độ GPS: <strong className="font-mono">{threat.location.coordinates[1].toFixed(5)}, {threat.location.coordinates[0].toFixed(5)}</strong></span>
                    </div>
                  </div>
                </div>

                {threat.status === 'open' && (
                  <button
                    onClick={() => handleResolve(threat._id)}
                    className="btn-primary w-full justify-center text-xs mt-2"
                  >
                    <CheckCircle size={16} />
                    Xác nhận tháo dỡ / Xử lý xong
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
