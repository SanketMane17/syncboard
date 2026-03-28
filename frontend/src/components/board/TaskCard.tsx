'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Avatar } from '@/components/ui/Avatar';
import type { Task } from '@/types';

interface Props {
  task: Task;
  isOverlay?: boolean;
}

export function TaskCard({ task, isOverlay = false }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging}
      className={cn(
        'group relative rounded-card border border-[#e8e7ed] bg-white p-3.5',
        'cursor-grab select-none',
        'transition-shadow duration-150',
        isDragging
          ? 'opacity-40 shadow-none'
          : 'shadow-card hover:shadow-md hover:border-gray-300',
        isOverlay && 'rotate-[1.5deg] shadow-card-drag cursor-grabbing',
      )}
      {...attributes}
      {...listeners}
    >
      {/* Title row */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <h3 className="text-[13.5px] font-semibold leading-snug text-[#1a1a2e]">
          {task.title}
        </h3>
        <Avatar
          initials={task.assignee_initials}
          color={task.assignee_color}
          size="md"
          className="mt-0.5 shrink-0"
        />
      </div>

      {/* Priority badge */}
      <PriorityBadge priority={task.priority} className="mb-2.5" />

      {/* Description */}
      {task.description && (
        <p className="text-[12px] leading-relaxed text-[#6b6b80] line-clamp-2">
          {task.description}
        </p>
      )}
    </div>
  );
}

/**
 * A static (non-sortable) version of the card used as the drag overlay.
 * Renders the same visual but without dnd-kit hooks.
 */
export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div
      className={cn(
        'relative rounded-card border border-[#e8e7ed] bg-white p-3.5',
        'rotate-[1.5deg] cursor-grabbing shadow-card-drag',
        'select-none',
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <h3 className="text-[13.5px] font-semibold leading-snug text-[#1a1a2e]">
          {task.title}
        </h3>
        <Avatar
          initials={task.assignee_initials}
          color={task.assignee_color}
          size="md"
          className="mt-0.5 shrink-0"
        />
      </div>
      <PriorityBadge priority={task.priority} className="mb-2.5" />
      {task.description && (
        <p className="text-[12px] leading-relaxed text-[#6b6b80] line-clamp-2">
          {task.description}
        </p>
      )}
    </div>
  );
}
