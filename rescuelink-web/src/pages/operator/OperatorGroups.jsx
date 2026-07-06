import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Users, QrCode, FilePdf, X, Copy, Check,
  Calendar, MapPin, UserCircle, FirstAid
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import api from '../../services/api';

// ─── Helper: Xuất PDF khai báo hành trình gửi BQL VQG ─────────────────────────
const exportManifestPDF = async (groupId) => {
  try {
    const res = await api.get(`/operators/groups/${groupId}/manifest`);
    const d = res.data.data;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Font settings (jsPDF built-in)
    const pageW = 210;
    const margin = 15;
    let y = 20;

    const line = (text, size = 10, bold = false, align = 'left', color = [30, 30, 30]) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      if (align === 'center') {
        doc.text(text, pageW / 2, y, { align: 'center' });
      } else {
        doc.text(text, margin, y);
      }
      y += size * 0.55;
    };

    const hr = (color = [200, 200, 200]) => {
      doc.setDrawColor(...color);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    };

    // ── Header ────────────────────────────────────────────────────────────────
    line('CONG HOA XA HOI CHU NGHIA VIET NAM', 9, false, 'center', [80, 80, 80]);
    y += 1;
    line('Doc lap - Tu do - Hanh phuc', 9, true, 'center', [30, 30, 30]);
    y += 1;
    line('-----------------------------', 9, false, 'center', [150, 150, 150]);
    y += 3;
    line('DON DANG KY HANH TRINH LEO NUI', 14, true, 'center', [20, 90, 50]);
    y += 1;
    line(`KINH GUI: BAN QUAN LY VUON QUOC GIA`, 9, false, 'center', [80, 80, 80]);
    y += 5;
    hr([180, 180, 180]);

    // ── Thông tin công ty tour ────────────────────────────────────────────────
    line('1. THONG TIN DON VI LU HANH', 10, true);
    y += 1;
    line(`Ten don vi: ${d.companyName || 'Chua co thong tin'}`, 10);
    if (d.companyAddress) line(`Dia chi:    ${d.companyAddress}`, 10);
    line(`Dien thoai: ${d.companyPhone || '---'}`, 10);
    if (d.companyEmail) line(`Email:      ${d.companyEmail}`, 10);
    y += 3;

    // ── Thông tin chuyến đi ───────────────────────────────────────────────────
    line('2. THONG TIN CHUYEN DI', 10, true);
    y += 1;
    line(`Ten doan:   ${d.groupName}`, 10);
    line(`Cung duong: ${d.routeName}`, 10);
    if (d.description) line(`Mo ta:      ${d.description}`, 10);
    const fmt = (dt) => dt ? new Date(dt).toLocaleDateString('vi-VN') : 'Chua xac dinh';
    line(`Ngay KH khai mac: ${fmt(d.plannedStartDate)}`, 10);
    line(`Ngay KH ket thuc: ${fmt(d.plannedEndDate)}`, 10);
    line(`Truong doan (HDV): ${d.leaderName || 'Chua gan'} - SĐT: ${d.leaderPhone || ''}`, 10);
    y += 3;

    // ── Danh sách thành viên ──────────────────────────────────────────────────
    line(`3. DANH SACH THANH VIEN (Tong: ${d.totalMembers} nguoi)`, 10, true);
    y += 2;
    hr([180, 180, 180]);

    // Table header
    doc.setFillColor(240, 250, 245);
    doc.rect(margin, y - 1, pageW - margin * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    const cols = [margin, margin + 8, margin + 50, margin + 80, margin + 110, margin + 140];
    doc.text('STT', cols[0], y + 4);
    doc.text('Ho va Ten', cols[1], y + 4);
    doc.text('So Dien Thoai', cols[2], y + 4);
    doc.text('Nhom Mau', cols[3], y + 4);
    doc.text('SĐT Nguoi Than', cols[4], y + 4);
    y += 8;
    hr();

    doc.setFont('helvetica', 'normal');
    d.members.forEach((m, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const rowColor = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...rowColor);
      doc.rect(margin, y - 1, pageW - margin * 2, 6.5, 'F');
      doc.setFontSize(8);
      doc.text(String(i + 1).padStart(2, '0'), cols[0], y + 4);
      doc.text((m.isLeader ? '(HDV) ' : '') + (m.name || ''), cols[1], y + 4);
      doc.text(m.phone || '', cols[2], y + 4);
      doc.text(m.bloodType || 'N/A', cols[3], y + 4);
      doc.text(m.emergencyContactPhone || 'N/A', cols[4], y + 4);
      y += 7;
    });

    y += 5;
    hr();

    // ── Cam kết & Chữ ký ─────────────────────────────────────────────────────
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(
      'Chung toi cam ket tuan thu day du quy dinh ve bao ve rung, da dang sinh hoc va su dung ung dung',
      margin, y
    );
    y += 5;
    doc.text('RescueLink GPS de theo doi hanh trinh va dam bao an toan tuyen vien trong suot chuyen di.', margin, y);
    y += 12;

    const dateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(`Ngay ${dateStr}`, pageW - margin - 50, y, { align: 'center' });
    y += 5;
    doc.text('Dai dien Don vi Lu hanh', pageW - margin - 50, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('(Ky, ghi ro ho ten)', pageW - margin - 50, y, { align: 'center' });

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Xuat boi RescueLink System • ${new Date().toISOString()} • ID: ${d.groupId}`,
      pageW / 2, 290, { align: 'center' }
    );

    const filename = `RescueLink_KhaiBao_${d.groupName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
    toast.success(`Đã xuất file: ${filename}`);
  } catch (err) {
    console.error(err);
    toast.error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

// ─── Component chính ───────────────────────────────────────────────────────────
export default function OperatorGroups() {
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showQRModal, setShowQRModal]     = useState(null); // group object
  const [copied, setCopied]               = useState(false);

  const [newGroupName, setNewGroupName]         = useState('');
  const [newRouteName, setNewRouteName]         = useState('');
  const [newDescription, setNewDescription]     = useState('');
  const [selectedLeader, setSelectedLeader]     = useState('');
  const [newStartDate, setNewStartDate]         = useState('');
  const [newEndDate, setNewEndDate]             = useState('');

  const queryClient = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['operator-groups-list'],
    queryFn: () => api.get('/operators/groups').then(r => r.data.groups)
  });

  const { data: guides } = useQuery({
    queryKey: ['operator-guides'],
    queryFn: () => api.get('/users').then(r => r.data.users?.filter(u => u.role === 'guide') || [])
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createGroupMutation = useMutation({
    mutationFn: (payload) => api.post('/operators/groups', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['operator-groups-list']);
      toast.success('Đã tạo đoàn trekking mới!');
      // Mở QR Modal ngay sau khi tạo thành công để lấy mã ngay
      if (res.data.group) setShowQRModal(res.data.group);
      setShowAddModal(false);
      setNewGroupName(''); setNewRouteName(''); setNewDescription('');
      setSelectedLeader(''); setNewStartDate(''); setNewEndDate('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Có lỗi xảy ra.')
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
      leaderId: selectedLeader || undefined,
      plannedStartDate: newStartDate || undefined,
      plannedEndDate: newEndDate || undefined
    });
  };

  const handleCopyPin = (pin) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Đã sao chép mã PIN!');
  };

  const statusStyle = (s) => ({
    active:    'bg-emerald-950 text-emerald-400 border-emerald-800',
    planned:   'bg-amber-950 text-amber-400 border-amber-800',
    completed: 'bg-slate-900 text-slate-400 border-slate-700',
    emergency: 'bg-red-950 text-red-400 border-red-800',
  }[s] || 'bg-slate-900 text-slate-400 border-slate-700');

  const statusLabel = (s) => ({ active: 'Đang đi', planned: 'Chuẩn bị', completed: 'Xong', emergency: '🚨 Khẩn Cấp' }[s] || s);

  const fmt = (dt) => dt ? new Date(dt).toLocaleDateString('vi-VN') : '---';

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-6 p-6">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Quản lý Đoàn Trekking</h1>
          <p className="text-xs text-muted">Tạo đoàn, phát mã QR ghép đoàn và xuất danh sách cấp phép VQG</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Plus size={16} />
          Tạo đoàn mới
        </button>
      </div>

      {/* ── Danh sách Đoàn ── */}
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
                {/* Card Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-white leading-tight">{g.groupName}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${statusStyle(g.status)}`}>
                      {statusLabel(g.status)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={10} className="text-emerald-500" />
                      {g.routeName}
                    </p>
                    {g.leaderId && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <UserCircle size={10} className="text-blue-400" />
                        HDV: <span className="font-semibold text-blue-300">{g.leaderId.name}</span>
                      </p>
                    )}
                    {g.plannedStartDate && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={10} className="text-slate-500" />
                        {fmt(g.plannedStartDate)} → {fmt(g.plannedEndDate)}
                      </p>
                    )}
                  </div>

                  {/* PIN Badge */}
                  {g.joinCode && (
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">PIN:</span>
                      <span className="font-mono font-bold text-sm text-emerald-400 tracking-widest">{g.joinCode}</span>
                    </div>
                  )}
                </div>

                {/* Thành viên */}
                <div className="border-t border-surface-4 pt-3 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Users size={10} />
                    Thành viên ({g.memberTripIds?.length || 0})
                  </h4>
                  {g.memberTripIds?.length > 0 && (
                    <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                      {g.memberTripIds.map(m => (
                        <div key={m._id || m} className="flex items-center justify-between text-[11px] bg-surface-3 px-2 py-1 rounded-lg border border-surface-4">
                          <span className="font-medium text-slate-200">{m.userId?.name || '---'}</span>
                          {m.lastBattery != null && (
                            <span className={`text-[10px] font-bold ${m.lastBattery < 20 ? 'text-red-400' : 'text-slate-400'}`}>
                              {m.lastBattery}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setShowQRModal(g)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-colors border border-emerald-800/50"
                  >
                    <QrCode size={13} />
                    Mã QR
                  </button>
                  <button
                    onClick={() => exportManifestPDF(g._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-colors border border-blue-800/50"
                  >
                    <FilePdf size={13} />
                    Xuất PDF VQG
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal 1: Tạo Đoàn Mới
      ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Tạo đoàn trekking mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tên đoàn *</label>
                  <input type="text" required placeholder="VD: Hoàng Liên Sơn 08"
                    value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                    className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Cung đường *</label>
                  <input type="text" required placeholder="VD: Trạm Tôn - Fansipan"
                    value={newRouteName} onChange={e => setNewRouteName(e.target.value)}
                    className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar size={10}/>Ngày khởi hành</label>
                  <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                    className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar size={10}/>Ngày kết thúc</label>
                  <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                    className="input-field" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hướng dẫn viên phụ trách</label>
                <select value={selectedLeader} onChange={e => setSelectedLeader(e.target.value)} className="input-field">
                  <option value="">-- Chọn hướng dẫn viên --</option>
                  {guides?.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.phone})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú / Mô tả</label>
                <textarea rows={2} value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  placeholder="Thông tin đặc biệt, yêu cầu sức khoẻ, điểm tập kết..."
                  className="input-field resize-none" />
              </div>

              <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-[10px] text-slate-400">
                💡 Sau khi tạo, hệ thống sẽ tự động sinh <strong className="text-emerald-400">Mã PIN 6 số</strong> và <strong className="text-emerald-400">QR Code</strong> để du khách quét ghép đoàn.
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary text-xs px-4 py-2">Hủy</button>
                <button type="submit" disabled={createGroupMutation.isLoading}
                  className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                  {createGroupMutation.isLoading ? 'Đang tạo...' : <><Plus size={14}/> Tạo đoàn</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal 2: QR Code & PIN hiển thị lớn
      ══════════════════════════════════════════════════════════════════════ */}
      {showQRModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card w-full max-w-sm space-y-5 animate-fade-in text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Mã Ghép Đoàn</h2>
              <button onClick={() => setShowQRModal(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">{showQRModal.groupName}</p>
              <p className="text-[10px] text-slate-500">{showQRModal.routeName}</p>
            </div>

            {/* QR Code Image */}
            {showQRModal.qrCodeDataUrl ? (
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-2xl shadow-lg">
                  <img
                    src={showQRModal.qrCodeDataUrl}
                    alt="QR Code ghép đoàn"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center">
                <QrCode size={40} className="text-slate-600" />
              </div>
            )}

            {/* PIN Code */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Hoặc nhập Mã PIN</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono font-black text-3xl tracking-[0.3em] text-emerald-400">
                  {showQRModal.joinCode || '------'}
                </span>
                <button
                  onClick={() => handleCopyPin(showQRModal.joinCode)}
                  className={`p-2 rounded-lg transition-colors ${copied ? 'bg-emerald-800 text-emerald-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 px-4">
              Du khách mở ứng dụng RescueLink → "Tham gia Tour" → Quét mã QR hoặc nhập PIN 6 số để gia nhập đoàn tự động.
            </p>

            {/* Export PDF button in modal too */}
            <button
              onClick={() => exportManifestPDF(showQRModal._id)}
              className="w-full flex items-center justify-center gap-2 bg-blue-900/50 hover:bg-blue-800/70 text-blue-300 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors border border-blue-800/50"
            >
              <FilePdf size={14} />
              Xuất Danh Sách Khai Báo VQG (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
