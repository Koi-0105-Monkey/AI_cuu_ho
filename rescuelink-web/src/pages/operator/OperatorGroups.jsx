import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, PlusCircle, Trash, Check } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function OperatorGroups() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedLeader, setSelectedLeader] = useState('');

  const queryClient = useQueryClient();

  // 1. Fetch trip groups managed by the operator
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['operator-groups-list'],
    queryFn: () => api.get('/operators/trips').then(r => r.data.groups)
  });

  // 2. Fetch guides (members with role='guide') belonging to this operator
  // Note: we can list them from user API filter or specialized endpoint.
  // For simplicity, we query a simplified user list.
  const { data: guides } = useQuery({
    queryKey: ['operator-guides'],
    queryFn: () => api.get('/users').then(r => r.data.users?.filter(u => u.role === 'guide') || [])
  });

  // 3. Mutation to create a group
  const createGroupMutation = useMutation({
    mutationFn: (newGroup) => api.post('/operators/groups', newGroup),
    onSuccess: () => {
      queryClient.invalidateQueries(['operator-groups-list']);
      toast.success('Đã tạo đoàn trekking mới!');
      setShowAddModal(false);
      // Reset form
      setNewGroupName('');
      setNewRouteName('');
      setNewDescription('');
      setSelectedLeader('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName || !newRouteName) {
      toast.error('Vui lòng điền tên đoàn và cung đường.');
      return;
    }
    createGroupMutation.mutate({
      groupName: newGroupName,
      routeName: newRouteName,
      description: newDescription,
      leaderId: selectedLeader || undefined
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-6 p-6">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Quản lý Đoàn Trekking</h1>
          <p className="text-xs text-muted">Tạo mới đoàn khách và gán hướng dẫn viên đi kèm</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Plus size={16} />
          Tạo đoàn mới
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groupsLoading ? (
          <p className="text-xs text-muted">Đang tải danh sách đoàn...</p>
        ) : !groups || groups.length === 0 ? (
          <div className="card text-center py-16 space-y-3">
            <Users size={32} className="text-slate-600 mx-auto" />
            <p className="text-xs text-muted">Bạn chưa khởi tạo đoàn trekking nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(g => (
              <div key={g._id} className="card flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-white">{g.groupName}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      g.status === 'active' ? 'bg-emerald-950 text-emerald-400' :
                      g.status === 'completed' ? 'bg-slate-900 text-slate-400' :
                      'bg-amber-950 text-amber-400'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Tuyến đường: <span className="font-medium text-slate-200">{g.routeName}</span></p>
                  {g.description && <p className="text-xs text-slate-500 italic">"{g.description}"</p>}
                  <p className="text-xs text-slate-400">HDV: <span className="font-semibold text-emerald-400">{g.leaderId?.name || 'Chưa gán'}</span></p>
                </div>

                <div className="border-t border-surface-4 pt-3 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thành viên ({g.memberTripIds?.length || 0})</h4>
                  {g.memberTripIds?.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Chưa có thành viên nào.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {g.memberTripIds.map(m => (
                        <div key={m._id} className="flex items-center justify-between text-[11px] bg-surface-3 p-1.5 rounded-lg border border-surface-4">
                          <span className="font-medium text-slate-200">{m.userId?.name}</span>
                          <span className="text-[10px] text-slate-400">Pin: {m.lastBattery}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="card w-full max-w-md space-y-4">
            <h2 className="text-sm font-bold text-white">Tạo đoàn trekking mới</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tên đoàn</label>
                <input
                  type="text" required
                  placeholder="VD: Đoàn Fansipan Tháng 6"
                  value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cung đường</label>
                <input
                  type="text" required
                  placeholder="VD: Trạm Tôn - Núi Fansipan"
                  value={newRouteName} onChange={e => setNewRouteName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hướng dẫn viên phụ trách</label>
                <select
                  value={selectedLeader} onChange={e => setSelectedLeader(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Chọn hướng dẫn viên --</option>
                  {guides?.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.phone})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mô tả thêm</label>
                <textarea
                  rows={3}
                  value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  placeholder="Mô tả hoặc ghi chú quan trọng..."
                  className="input-field resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary text-xs px-4 py-2"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isLoading}
                  className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {createGroupMutation.isLoading ? 'Đang tạo...' : 'Tạo đoàn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
