import { useState } from 'react';
import { useRecentsStore } from '../store/recentsStore';

interface RecentsPanelProps {
  onCall: (userId: string, name: string) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function RecentsPanel({ onCall }: RecentsPanelProps) {
  const recents = useRecentsStore((s) => s.recents);
  const [filter, setFilter] = useState<'all' | 'missed'>('all');

  const filteredRecents = recents.filter((r) => {
    if (filter === 'missed') {
      return r.direction === 'in' && (r as any).status === 'missed';
    }
    return true;
  });

  return (
    <div className="flex-1 w-full max-w-md mx-auto pt-6 pb-32 px-container-margin-mobile">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
          Recents
        </h2>
        <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-white/5 text-xs">
          <button
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'missed'
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setFilter('missed')}
          >
            Missed
          </button>
        </div>
      </div>
      {filteredRecents.length === 0 && (
        <p className="text-body-md text-on-surface-variant">
          {filter === 'missed' ? 'No missed calls.' : 'No recent calls yet.'}
        </p>
      )}
      <ul className="bg-surface-container-low/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
        {filteredRecents.map((r) => (
          <li
            key={`${r.id}-${r.ts}`}
            className="flex items-center gap-3 p-4 border-b border-white/5 last:border-b-0"
          >
            <span
              className={`material-symbols-outlined text-xl ${
                r.direction === 'out' ? 'text-primary' : 'text-secondary'
              }`}
            >
              {r.direction === 'out' ? 'call_made' : 'call_received'}
            </span>
            <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {r.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-md text-on-surface truncate">{r.name}</p>
              <p className="font-label-sm text-label-sm text-outline">{timeAgo(r.ts)}</p>
            </div>
            <button
              className="w-11 h-11 rounded-full bg-secondary text-on-secondary flex items-center justify-center active:scale-90 transition-transform"
              onClick={() => onCall(r.id, r.name)}
              aria-label="Call"
            >
              <span className="material-symbols-outlined fill-icon">call</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}