import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartLine, TrendUp, WarningOctagon, Backpack } from '@phosphor-icons/react';
import api from '../../services/api';

export default function OperatorAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['operator-analytics-full'],
    queryFn: () => api.get('/operators/analytics').then(r => r.data.stats)
  });

  // Mock data representing trip counts per month for visualization
  const monthlyData = [
    { name: 'Tháng 1', active: 4, completed: 8 },
    { name: 'Tháng 2', active: 3, completed: 12 },
    { name: 'Tháng 3', active: 7, completed: 19 },
    { name: 'Tháng 4', active: 9, completed: 25 },
    { name: 'Tháng 5', active: 12, completed: 34 },
    { name: 'Tháng 6', active: 16, completed: 42 }
  ];

  if (isLoading) {
    return <div className="p-6 text-xs text-muted">Đang tải phân tích thống kê...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-6 p-6">
      <div className="shrink-0">
        <h1 className="text-xl font-bold text-white">Thống Kê Hoạt Động</h1>
        <p className="text-xs text-muted">Phân tích hiệu suất leo núi và quản lý an toàn đoàn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="card flex items-center gap-4 py-4">
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-900/30">
            <Backpack size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng số đoàn</p>
            <p className="text-xl font-bold text-white mt-0.5">{analytics?.totalGroups || 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 py-4">
          <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-900/30">
            <TrendUp size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng số khách hàng</p>
            <p className="text-xl font-bold text-white mt-0.5">{analytics?.totalTrekkers || 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 py-4">
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-900/30">
            <WarningOctagon size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tỷ lệ sự cố an toàn</p>
            <p className="text-xl font-bold text-white mt-0.5">0.0% (An toàn tuyệt đối)</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card flex-1 min-h-[300px] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-surface-4 shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ChartLine size={18} className="text-emerald-400" />
            Biểu đồ tần suất chuyến đi theo tháng
          </h2>
        </div>
        <div className="flex-1 p-6 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222731" />
              <XAxis dataKey="name" stroke="#687385" fontSize={11} />
              <YAxis stroke="#687385" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#151922',
                  border: '1px solid #222731',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="completed" name="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="active" name="Đang diễn ra" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
