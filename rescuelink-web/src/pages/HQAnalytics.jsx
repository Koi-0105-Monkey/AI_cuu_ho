import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartLine, Clock, ShieldCheck, Siren, Users } from '@phosphor-icons/react';
import api from '../services/api';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981', '#a855f7'];

const INCIDENT_LABELS = {
  CRASH: 'Chấn thương',
  LOST: 'Lạc đường',
  FIRE: 'Hỏa hoạn',
  MED: 'Y tế khẩn cấp',
  VEH: 'Sự cố xe cộ',
  MANUAL: 'Cứu hộ thủ công'
};

export default function HQAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['hq-analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data.stats)
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm bg-[#080c12] min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải phân tích hiệu suất cứu hộ...</span>
        </div>
      </div>
    );
  }

  // Format pie chart data
  const pieData = Object.keys(analytics?.typeDistribution || {}).map(key => ({
    name: INCIDENT_LABELS[key] || key,
    value: analytics.typeDistribution[key]
  })).filter(item => item.value > 0);

  // Fallback for monthly metrics if empty
  const monthlyData = analytics?.monthlyMetrics || [
    { name: 'Tháng 1', total: 5, resolved: 4, avgResponseTime: 12 },
    { name: 'Tháng 2', total: 8, resolved: 8, avgResponseTime: 15 },
    { name: 'Tháng 3', total: 12, resolved: 10, avgResponseTime: 10 },
    { name: 'Tháng 4', total: 15, resolved: 14, avgResponseTime: 8 },
    { name: 'Tháng 5', total: 9, resolved: 9, avgResponseTime: 9 },
    { name: 'Tháng 6', total: 14, resolved: 13, avgResponseTime: 11 }
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-6 p-6 bg-[#080c12]">
      {/* Title */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Phân Tích Hiệu Suất Cứu Hộ HQ</h1>
        <p className="text-xs text-muted mt-1">Đánh giá thời gian phản ứng (Response Time) và thống kê điều động cứu nạn</p>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="card flex items-center gap-4 py-4 bg-[#0d1525] border-slate-800">
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-900/30">
            <Siren size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng sự cố tiếp nhận</p>
            <p className="text-xl font-black text-white mt-0.5">{analytics?.totalCount || 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 py-4 bg-[#0d1525] border-slate-800">
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-900/30">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đã giải quyết thành công</p>
            <p className="text-xl font-black text-white mt-0.5">{analytics?.resolvedCount || 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 py-4 bg-[#0d1525] border-slate-800">
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-900/30">
            <Clock size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phản hồi trung bình (Response)</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">
              {analytics?.avgResponseTime || 0} <span className="text-xs font-normal">phút</span>
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4 py-4 bg-[#0d1525] border-slate-800">
          <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-900/30">
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thời gian cứu hộ (Resolution)</p>
            <p className="text-xl font-black text-blue-400 mt-0.5">
              {analytics?.avgResolutionTime || 0} <span className="text-xs font-normal">phút</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <div className="card bg-[#0d1525] border-slate-800 flex flex-col min-h-[350px]">
          <div className="px-5 py-4 border-b border-slate-800 shrink-0 flex items-center gap-2">
            <ChartLine size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Thời gian phản ứng cứu hộ theo tháng (Response Time)</h2>
          </div>
          <div className="flex-1 p-5 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b253b" />
                <XAxis dataKey="name" stroke="#687385" fontSize={11} />
                <YAxis stroke="#687385" fontSize={11} label={{ value: 'Phút', angle: -90, position: 'insideLeft', fill: '#687385', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: '#151922',
                    border: '1px solid #222731',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="avgResponseTime" name="Thời gian phản hồi (phút)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident Type Distribution Pie Chart */}
        <div className="card bg-[#0d1525] border-slate-800 flex flex-col min-h-[350px]">
          <div className="px-5 py-4 border-b border-slate-800 shrink-0 flex items-center gap-2">
            <Siren size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-white">Phân tích phân bố loại hình tai nạn sự cố</h2>
          </div>
          <div className="flex-1 p-5 min-h-0 flex flex-col justify-center items-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-muted italic">Chưa có sự cố cứu nạn được phân loại</p>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row justify-center items-center gap-4">
                <div className="flex-1 h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-col gap-2 max-w-[200px] text-xs">
                  {pieData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-300 font-medium">{item.name}:</span>
                      <span className="text-white font-bold">{item.value} vụ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
