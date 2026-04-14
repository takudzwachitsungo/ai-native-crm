import { cn } from '../lib/utils';

interface InsightBadgeProps {
  type: 'overdue' | 'hot' | 'stuck' | 'inactive' | 'closing_soon' | 'at_risk';
  label?: string;
  className?: string;
}

export function InsightBadge({ type, label, className }: InsightBadgeProps) {
  const config = {
    overdue: {
      label: label || 'Overdue',
      colors: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900',
    },
    hot: {
      label: label || 'Hot',
      colors: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900',
    },
    stuck: {
      label: label || 'Stuck',
      colors: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900',
    },
    inactive: {
      label: label || 'Inactive',
      colors: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-900',
    },
    closing_soon: {
      label: label || 'Closing Soon',
      colors: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900',
    },
    at_risk: {
      label: label || 'At Risk',
      colors: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900',
    },
  };

  const { label: displayLabel, colors } = config[type];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        colors,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
