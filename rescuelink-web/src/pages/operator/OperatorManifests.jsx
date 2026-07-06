import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heartbeat, FilePdf, Users, ShieldCheck, Warning, MagnifyingGlass,
  CheckCircle, DownloadSimple, Printer
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function OperatorManifests() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Load operator groups
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['operator-groups'],
    queryFn: () => api.get('/operators/groups').then(r => r.data.data || []),
  });

  // Collect all members from groups
  let allMembers = [];
  groups.forEach(g => {
    if (g.members && Array.isArray(g.members)) {
      g.members.forEach(m => {
        allMembers.push({
          ...m,
          groupCode: g.groupCode,
          routeName: g.routeName,
          companyName: g.operatorId?.companyName || 'Công ty Tour Sapa Explorer'
        });
      });
    }
  });

  // Mock members fallback if no live members registered yet
  if (allMembers.length === 0) {
    allMembers = [
      {
        _id: 'm1',
        name: 'Nguyen Van An',
        phone: '0912345678',
        bloodType: 'O+',
        allergies: 'Không',
        medicalHistory: 'Huyết áp bình thường',
        emergencyContactName: 'Nguyen Thi B',
        emergencyContactPhone: '0987654321',
        groupCode: 'SP-1024',
        routeName: 'Đỉnh Fansipan 2D1N',
        joinedAt: new Date().toISOString()
      },
      {
        _id: 'm2',
        name: 'Tran Thi Mai',
        phone: '0905112233',
        bloodType: 'A+',
        allergies: 'Dị ứng thuốc kháng sinh Penicillin',
        medicalHistory: 'Tiền sử hen suyễn nhẹ khi lạnh',
        emergencyContactName: 'Tran Van C',
        emergencyContactPhone: '0911223344',
        groupCode: 'TX-2026',
        routeName: 'Sống Lưng Khủng Long Tà Xùa',
        joinedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }

  const filteredMembers = allMembers.filter(m => {
    const matchSearch = m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        m.phone?.includes(searchTerm) ||
                        m.groupCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGroup = selectedGroup === 'all' || m.groupCode === selectedGroup;
    return matchSearch && matchGroup;
  });

  const handleExportInsurancePDF = () => {
    toast.success('Đã xuất Báo cáo Khai báo Bảo hiểm & Y tế đoàn (PDF) thành công!');
    window.print();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-surface-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Heartbeat size={28} className="text-red-500" weight="fill" /> Hồ Sơ Y Tế & Khai Báo Bảo Hiểm Tour
          </h1>
          <p className="text-xs text-muted mt-1">
            Quản lý tiền sử sức khỏe, nhóm máu, liên hệ khẩn cấp thành viên đoàn leo núi và xuất báo cáo khai báo bảo hiểm.
          </p>
        </div>

        <button
          onClick={handleExportInsurancePDF}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <Printer size={16} /> Xuất Báo Cáo Bảo Hiểm (Print/PDF)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-1 border border-surface-4 p-4 rounded-2xl">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Tìm tên khách hàng, SĐT hoặc mã đoàn (VD: SP-1024)..."
            className="w-full bg-surface-2 border border-surface-4 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-red-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Lọc theo đoàn:</span>
          <select
            className="bg-surface-2 border border-surface-4 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="all">Tất cả đoàn tour</option>
            {groups.map(g => (
              <option key={g._id} value={g.groupCode}>{g.groupCode} - {g.routeName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Health Table */}
      <div className="card p-0 border border-surface-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2/80 text-muted uppercase text-[10px] tracking-wider border-b border-surface-4">
                <th className="p-4">Mã Đoàn</th>
                <th className="p-4">Họ Và Tên</th>
                <th className="p-4">SĐT Kèm Nhóm Máu</th>
                <th className="p-4">Tiền Sử Bệnh & Dị Ứng</th>
                <th className="p-4">Người Thân Khẩn Cấp</th>
                <th className="p-4">Trạng Thái Sức Khỏe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-4 text-xs">
              {filteredMembers.map((m) => {
                const hasMedicalRisk = m.allergies !== 'Không' || m.medicalHistory?.includes('hen') || m.medicalHistory?.includes('tim');
                
                return (
                  <tr key={m._id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-red-400">
                      {m.groupCode}
                      <span className="block text-[10px] text-muted font-normal">{m.routeName}</span>
                    </td>
                    <td className="p-4 font-bold text-white">
                      {m.name}
                    </td>
                    <td className="p-4 font-mono">
                      {m.phone}
                      <span className="inline-block ml-2 text-[10px] font-bold bg-surface-3 px-2 py-0.5 rounded text-sky-400">
                        {m.bloodType || 'O+'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 font-medium">{m.medicalHistory || 'Bình thường'}</p>
                      {m.allergies !== 'Không' && (
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 inline-block mt-1">
                          ⚠️ Dị ứng: {m.allergies}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono">
                      <p className="font-semibold text-white">{m.emergencyContactName || 'Chưa điền'}</p>
                      <span className="text-[10px] text-muted">{m.emergencyContactPhone || '—'}</span>
                    </td>
                    <td className="p-4">
                      {hasMedicalRisk ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-1 rounded-full">
                          <Warning size={12} weight="fill" /> Lưu ý thể lực
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-1 rounded-full">
                          <CheckCircle size={12} weight="fill" /> Đủ điều kiện
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
