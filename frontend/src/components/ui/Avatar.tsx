import { cn } from '@/lib/utils';

const colorMap: Record<string, string> = {
  purple: 'bg-violet-100 text-violet-600',
  teal:   'bg-teal-100   text-teal-700',
  orange: 'bg-orange-100 text-orange-600',
  blue:   'bg-blue-100   text-blue-600',
  pink:   'bg-pink-100   text-pink-600',
  green:  'bg-green-100  text-green-700',
};

interface Props {
  initials: string;
  color?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Avatar({ initials, color = 'purple', size = 'md', className }: Props) {
  const colorClass = colorMap[color] ?? colorMap.purple;
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold',
        size === 'md' ? 'h-8 w-8 text-xs' : 'h-6 w-6 text-[10px]',
        colorClass,
        className,
      )}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
