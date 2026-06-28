import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Info } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function AuthorityIncidents() {
  const queryClient = useQueryClient();

  // Fetch all incidents
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['authority-all-incidents'],
    queryFn: () => api.get('/admin/incidents/active').then(r => r.data.data || [])
  });

  // Mutation to resolve incident
  const resolveIncidentMutation = useMutation({
    mutationFn: (id) => api.patch(`/incidents/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries(['authority-all-incidents']);
      toast.success('Đã cập nhật trạng thái xử lý sự cố thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Không thể cập nhật sự cố.');
    }
  });

  const handleResolve = (id) => {
    if (confirm('Xác nhận đã xử lý hoàn tất cứu hộ cho sự cố này?')) {
      resolveIncidentMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-xs text-slate-400">Đang tải danh sách sự cố...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">Quản Lý Tìm Kiếm & Cứu Nạn</h1>
        <p className="text-xs text-slate-400">Xác thực tin báo SOS, phân công trạm kiểm lâm và cập nhật trạng thái cứu hộ</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="card text-center py-16 space-y-3">
            <Info size={32} className="text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">Hiện không có sự cố khẩn cấp nào cần xử lý.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map(inc => (
              <div key={inc._id} className="card bg-[#0b140f] border border-[#142a1e] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded border border-red-900/30">
                      SOS: {inc.type}
                    </span>
                    <span className="text-xs text-slate-400">Mức độ nguy hiểm: <span className="text-red-400 font-bold">Cấp {inc.severity}/5</span></span>
                  </div>
                  <p className="text-sm font-semibold text-white">Người gặp nạn: {inc.userId?.name} ({inc.userId?.phone})</p>
                  {inc.message && <p className="text-xs text-slate-400 bg-[#070d0a] p-2 rounded border border-[#142a1e] italic">"{inc.message}"</p>}
                  <p className="text-[10px] text-slate-500">Tạo lúc: {new Date(inc.createdAt).toLocaleString('vi-VN')}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleResolve(inc._id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Check size={16} />
                    Xác nhận hoàn thành cứu hộ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
