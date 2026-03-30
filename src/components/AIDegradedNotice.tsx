import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface AIDegradedNoticeProps {
  reason?: string | null;
  compact?: boolean;
  className?: string;
}

const defaultReason =
  'AI-enhanced analysis is temporarily limited, so you are seeing live CRM data with rule-based fallbacks.';

export function AIDegradedNotice({
  reason,
  compact = false,
  className,
}: AIDegradedNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100',
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn('shrink-0 text-amber-600', compact ? 'mt-0 h-4 w-4' : 'mt-0.5 h-4 w-4')} />
        <div>
          <p className="font-medium">AI fallback mode</p>
          <p className="mt-1 opacity-90">{reason || defaultReason}</p>
        </div>
      </div>
    </div>
  );
}
