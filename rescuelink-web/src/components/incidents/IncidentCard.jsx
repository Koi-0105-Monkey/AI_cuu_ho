import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Car, Fire, FirstAid, Tree, Wrench, Warning
} from '@phosphor-icons/react';

const TYPE_META = {
  CRASH: { label: 'Tai nạn',    icon: Car,      color: 'text-emergency-400' },
  LOST:  { label: 'Lạc đường',  icon: Tree,     color: 'text-amber-400' },
  FIRE:  { label: 'Cháy',       icon: Fire,     color: 'text-orange-400' },
  MED:   { label: 'Y tế',       icon: FirstAid, color: 'text-blue-400' },
  VEH:   { label: 'Xe hỏng',    icon: Wrench,   color: 'text-muted-light' },
  MANUAL:{ label: 'Thủ công',   icon: Warning,  color: 'text-muted-light' },
};

const severityClass = (s) => {
  if (s <= 2) return { badge: 'badge-low',  border: 'border-green-500/40'  };
  if (s === 3) return { badge: 'badge-med',  border: 'border-amber-500/40'  };
  return           { badge: 'badge-high', border: 'border-emergency-500/40' };
};

export default function IncidentCard({ incident, onClick }) {
  const navigate = useNavigate();
  const meta = TYPE_META[incident.type] || TYPE_META.MANUAL;
  const Icon = meta.icon;
  const { badge, border } = severityClass(incident.severity);
  const ago = formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true, locale: vi });

  const handleClick = () => {
    if (onClick) onClick(incident);
    else navigate(`/incidents/${incident._id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`card-hover border-l-2 ${border} animate-fade-in`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${meta.color}`}>
          <Icon size={20} weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{meta.label}</span>
            <span className={badge}>Mức {incident.severity}</span>
            {incident.severityBreakdown?.needsManualReview && (
              <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse">
                ⚠️ Review
              </span>
            )}
            {incident.source === 'sms' && (
              <span className="badge bg-purple-500/15 text-purple-400">SMS</span>
            )}
            {incident.source === 'auto' && (
              <span className="badge bg-sky-500/15 text-sky-400">Tự động</span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 truncate">
            {incident.userId?.name || 'Ẩn danh'} • {incident.userId?.phone}
          </p>
          {incident.message && (
            <p className="text-xs text-muted-light mt-1 line-clamp-2">{incident.message}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted">
            <span>
              {incident.location?.coordinates
                ? `${incident.location.coordinates[1].toFixed(5)}, ${incident.location.coordinates[0].toFixed(5)}`
                : 'N/A'}
            </span>
            {incident.batteryAtTime !== undefined && (
              <span>🔋 {incident.batteryAtTime}%</span>
            )}
            <span>{ago}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
