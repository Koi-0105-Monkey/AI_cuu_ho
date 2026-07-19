import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartLine, Clock, ShieldCheck, Siren, Users, Eye, ShieldWarning } from '@phosphor-icons/react';
import api from '../services/api';

// Giữ nguyên COLORS cho Recharts — đây là data, không phải UI chrome
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

  const { data: auditLogs } = useQuery({
    queryKey: ['hq-medical-logs'],
    queryFn: () => api.get('/admin/medical-logs').then(r => r.data.data),
    refetchInterval: 15_000
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4 bg-[#080c12]">
        <div className="shrink-0 space-y-2">
          <div className="h-5 bg-surface-3 animate-pulse w-72" />
          <div className="h-3 bg-surface-3 animate-pulse w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-2 border border-slate-700 flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-surface-3 animate-pulse" />
              <div className="space-y-2">
                <div className="h-2.5 bg-surface-3 animate-pulse w-24" />
                <div className="h-5 bg-surface-3 animate-pulse w-12" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface-2 border border-slate-700 h-[350px] animate-pulse" />
          <div className="bg-surface-2 border border-slate-700 h-[350px] animate-pulse" />
        </div>
      </div>
    );
  }

  const pieData = Object.keys(analytics?.typeDistribution || {}).map(key => ({
    name: INCIDENT_LABELS[key] || key,
    value: analytics.typeDistribution[key]
  })).filter(item => item.value > 0);

  const isUsingFallbackData = !analytics?.monthlyMetrics;
  const monthlyData = analytics?.monthlyMetrics || [
    { name: 'Tháng 1', total: 5, resolved: 4, avgResponseTime: 12 },
    { name: 'Tháng 2', total: 8, resolved: 8, avgResponseTime: 15 },
    { name: 'Tháng 3', total: 12, resolved: 10, avgResponseTime: 10 },
    { name: 'Tháng 4', total: 15, resolved: 14, avgResponseTime: 8 },
    { name: 'Tháng 5', total: 9, resolved: 9, avgResponseTime: 9 },
    { name: 'Tháng 6', total: 14, resolved: 13, avgResponseTime: 11 }
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4 bg-[#080c12]">

      {/* ── Title ────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-slate-700 pb-3">
        <h1 className="text-sm font-mono font-black text-white uppercase tracking-widest">
          [ PHÂN TÍCH HIỆU SUẤT CỨU HỘ HQ ]
        </h1>
        <p className="text-[10px] text-muted font-mono mt-1 tracking-wide">
          // Đánh giá thời gian phản ứng (Response Time) và thống kê điều động cứu nạn
        </p>
      </div>

      {/* ── Stat cards — gap:1px Tactical Compartments ───── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-700 shrink-0">

        {/* Tổng sự cố */}
        <div className="bg-surface-1 border-l-2 border-l-emergency-500 p-4 flex items-center gap-3">
          <div className="p-2 bg-red-950/60 border border-red-900/30">
            <Siren size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest">TỔNG SỰ CỐ TIẾP NHẬN</p>
            <p className="text-2xl font-mono font-black text-white mt-0.5 tabular-nums">{analytics?.totalCount || 0}</p>
          </div>
        </div>

        {/* Đã giải quyết */}
        <div className="bg-surface-1 border-l-2 border-l-sky-500 p-4 flex items-center gap-3">
          <div className="p-2 bg-sky-950/60 border border-sky-900/30">
            <ShieldCheck size={18} className="text-sky-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest">ĐÃ GIẢI QUYẾT THÀNH CÔNG</p>
            <p className="text-2xl font-mono font-black text-white mt-0.5 tabular-nums">{analytics?.resolvedCount || 0}</p>
          </div>
        </div>

        {/* Response time */}
        <div className="bg-surface-1 border-l-2 border-l-amber-500 p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-950/60 border border-amber-900/30">
            <Clock size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest">PHẢN HỒI TRUNG BÌNH (RESPONSE)</p>
            <p className="text-2xl font-mono font-black text-amber-400 mt-0.5 tabular-nums">
              {analytics?.avgResponseTime || 0}<span className="text-xs font-normal text-slate-400 ml-1">phút</span>
            </p>
          </div>
        </div>

        {/* Resolution time */}
        <div className="bg-surface-1 border-l-2 border-l-blue-500 p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-950/60 border border-blue-900/30">
            <Users size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest">THỜI GIAN CỨU HỘ (RESOLUTION)</p>
            <p className="text-2xl font-mono font-black text-blue-400 mt-0.5 tabular-nums">
              {analytics?.avgResolutionTime || 0}<span className="text-xs font-normal text-slate-400 ml-1">phút</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Charts Section ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Response Time Bar Chart */}
        <div className="bg-surface-1 border border-slate-700 flex flex-col min-h-[350px]">
          <div className="px-4 py-3 border-b border-slate-700 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChartLine size={14} className="text-amber-400" />
              <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">
                [ THỜI GIAN PHẢN ỨNG CỨU HỘ THEO THÁNG ]
              </h2>
            </div>
            {isUsingFallbackData && (
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 font-mono uppercase tracking-wide">
                DỮ LIỆU MẪU
              </span>
            )}
          </div>
          <div className="flex-1 p-4 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b253b" />
                <XAxis dataKey="name" stroke="#687385" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#687385" fontSize={10} fontFamily="monospace" label={{ value: 'Phút', angle: -90, position: 'insideLeft', fill: '#687385', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: '#0d1525',
                    border: '1px solid #334155',
                    borderRadius: 0,
                    color: '#fff',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                />
                <Bar dataKey="avgResponseTime" name="Thời gian phản hồi (phút)" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart — Incident Type Distribution */}
        <div className="bg-surface-1 border border-slate-700 flex flex-col min-h-[350px]">
          <div className="px-4 py-3 border-b border-slate-700 shrink-0 flex items-center gap-2">
            <Siren size={14} className="text-red-400" />
            <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">
              [ PHÂN BỐ LOẠI HÌNH TAI NẠN SỰ CỐ ]
            </h2>
          </div>
          <div className="flex-1 p-4 min-h-0 flex flex-col justify-center items-center">
            {pieData.length === 0 ? (
              <p className="text-[10px] text-muted font-mono italic tracking-wide">
                // Chưa có sự cố cứu nạn được phân loại
              </p>
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

                {/* Legend — dùng ô vuông thay chấm tròn */}
                <div className="flex flex-col gap-2 max-w-[200px]">
                  {pieData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-400 font-mono text-[10px]">{item.name}:</span>
                      <span className="text-white font-mono font-bold text-[10px]">{item.value} vụ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Security Audit Log Table ───────────────────────── */}
      <div className="bg-surface-1 border border-slate-700 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldWarning size={14} className="text-sky-400" />
            <h2 className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">
              [ NHẬT KÝ BẢO MẬT TRUY CẬP Y TẾ — NGHỊ ĐỊNH 13/2023 ]
            </h2>
          </div>
          <span className="text-[9px] text-sky-400 bg-sky-500/10 px-2 py-0.5 border border-sky-500/30 font-mono font-bold uppercase tracking-widest">
            ✓ AUDIT TRAIL ACTIVE
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-surface-2 border-b border-slate-700 text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">
              <tr>
                <th scope="col" className="px-4 py-3">NGƯỜI TRUY CẬP</th>
                <th scope="col" className="px-4 py-3">VAI TRÒ</th>
                <th scope="col" className="px-4 py-3">BỆNH NHÂN (TREKKER)</th>
                <th scope="col" className="px-4 py-3">SỰ CỐ LIÊN QUAN</th>
                <th scope="col" className="px-4 py-3">HÀNH ĐỘNG</th>
                <th scope="col" className="px-4 py-3">THỜI GIAN TRUY CẬP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {!auditLogs || auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 font-mono text-[10px] text-muted uppercase tracking-widest">
                    // Chưa có lượt truy cập dữ liệu y tế nhạy cảm nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white text-[10px]">
                      {log.viewerId?.name}
                      <span className="block text-[9px] text-muted font-normal tracking-wide">{log.viewerId?.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest border rounded-none ${
                        log.viewerId?.role === 'admin'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {log.viewerId?.role === 'admin' ? 'CHỈ HUY HQ' : 'CỨU HỘ THỰC ĐỊA'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-slate-200 text-[10px]">{log.targetUserId?.name}</span>
                      <span className="block text-[9px] text-muted font-mono">{log.targetUserId?.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {log.incidentId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-med py-0 px-1.5 rounded-none font-mono text-[9px] uppercase">{log.incidentId.type}</span>
                          <span className="text-[9px] text-muted font-mono">({log.incidentId.status})</span>
                        </div>
                      ) : (
                        <span className="text-muted font-mono text-[10px] italic">Không liên quan sự cố</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sky-400 font-mono text-[10px] font-bold uppercase tracking-wide">
                        <Eye size={11} /> {log.action === 'view' ? 'GIẢI MÃ & XEM' : 'CẬP NHẬT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[10px] tracking-wide">
                      {new Date(log.accessedAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
