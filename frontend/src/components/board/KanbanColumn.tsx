'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { AddTaskModal } from './AddTaskModal';
import { api } from '@/lib/api';
import { useBoardStore } from '@/store/board.store';
import { toast } from 'sonner';
import type { Column, Priority } from '@/types';

interface Props {
  column: Column;
}

export function KanbanColumn({ column }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { applyRemoteCreate } = useBoardStore();

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const taskIds = column.tasks.map((t) => t.id);

  const handleAddTask = async (data: {
    title: string;
    description: string;
    priority: Priority;
    assigneeInitials: string;
    assigneeColor: string;
  }) => {
    try {
      const task = await api.createTask({
        columnId: column.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeInitials: data.assigneeInitials,
        assigneeColor: data.assigneeColor,
      }) as Awaited<ReturnType<typeof api.createTask>>;

      // Optimistically add to our own store
      // (server will also broadcast to other clients via WS)
      applyRemoteCreate({ task: task as Parameters<typeof applyRemoteCreate>[0]['task'] });
      toast.success(`"${data.title}" added to ${column.title}`);
    } catch (e) {
      toast.error(`Failed to create task: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <div className="flex flex-1 min-w-[280px] max-w-[350px] shrink-0 flex-col rounded-column border border-[#e8e7ed] bg-white shadow-sm">
        {/* Column header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-[14px] font-semibold text-[#1a1a2e]">{column.title}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-[#9999aa]">
            {column.tasks.length}
          </span>
        </div>

        {/* Task list — droppable + sortable zone */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            data-over={isOver}
            className={cn(
              'flex min-h-[120px] flex-1 flex-col gap-2.5 px-3 pb-2 transition-colors duration-150',
              isOver && 'rounded-xl bg-blue-50/60',
            )}
          >
            {column.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}

            {/* Empty state drop hint */}
            {column.tasks.length === 0 && (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 py-8">
                <p className="text-[12px] text-[#c0bfca]">Drop tasks here</p>
              </div>
            )}
          </div>
        </SortableContext>

        <div className='flex items-end justify-end'>{/* Add task button */}
        <button
          onClick={() => setShowModal(true)}
          className="mx-3 mb-3 mt-1 flex w-12 h-12 items-center justify-center rounded-xl border border-dashed border-gray-200 text-[13px] text-[#c0bfca] transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-[#9999aa]"
        >
          <span className="text-base leading-none">+</span>
        </button></div>
      </div>

      {showModal && (
        <AddTaskModal
          columnId={column.id}
          onAdd={handleAddTask}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
