import { cn } from '@/lib/utils';
import type { Priority } from '@/types';

const config: Record<Priority, { label: string; className: string }> = {
  high:   { label: 'High',   className: 'bg-red-50    text-red-500   border-red-100'    },
  medium: { label: 'Medium', className: 'bg-amber-50  text-amber-500 border-amber-100'  },
  low:    { label: 'Low',    className: 'bg-green-50  text-green-600 border-green-100'  },
};

interface Props {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: Props) {
  const { label, className: base } = config[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        base,
        className,
      )}
    >
      {label}
    </span>
  );
}
