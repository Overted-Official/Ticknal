'use client';

import { useState } from 'react';
import { setProprietaryStrategyAccessAction } from '@/lib/server/console-actions';

export default function ProprietaryAccessToggle({
  userId, enabled, canManage, onChanged, compact = false, isOwner = false,
}: {
  userId: string;
  enabled: boolean;
  canManage: boolean;
  isOwner?: boolean;
  onChanged: (userId: string, enabled: boolean) => void;
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = enabled ? 'Access on' : 'Access off';
  if (isOwner) return <span className="text-xs text-plt-muted">Owner access</span>;
  if (!canManage) return <span className="text-xs text-plt-muted">{label}</span>;

  return (
    <div className="inline-flex flex-col items-start gap-1" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? 'Revoke Typhon, Cerberus and Hydra access' : 'Grant Typhon, Cerberus and Hydra access'}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const result = await setProprietaryStrategyAccessAction({ targetUserId: userId, enabled: !enabled });
            if (!result.success) throw new Error(result.error);
            onChanged(userId, !enabled);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Access update failed.');
          } finally { setPending(false); }
        }}
        className={`inline-flex items-center gap-2 text-xs font-medium text-white disabled:opacity-50 ${compact ? 'min-h-9' : 'min-h-10'}`}
      >
        <span className={`relative h-5 w-9 rounded-full border transition-colors ${enabled ? 'border-tv-blue-500 bg-tv-blue-500' : 'border-white/25 bg-black'}`}>
          <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${enabled ? 'start-[17px]' : 'start-0.5'}`} />
        </span>
        <span>{pending ? 'Updating…' : label}</span>
      </button>
      {error && <span role="alert" className="max-w-52 text-[10px] text-plt-risk">{error}</span>}
    </div>
  );
}
