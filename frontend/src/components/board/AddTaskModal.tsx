'use client';

import { useState } from 'react';
import type { ColumnId, Priority } from '@/types';

interface Props {
  columnId: ColumnId;
  onAdd: (data: {
    title: string;
    description: string;
    priority: Priority;
    assigneeInitials: string;
    assigneeColor: string;
  }) => void;
  onClose: () => void;
}

const COLORS = ['purple', 'teal', 'orange', 'blue', 'pink', 'green'];

export function AddTaskModal({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [initials, setInitials] = useState('');
  const [color, setColor] = useState('purple');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim().slice(0, 100),
      description: description.trim(),
      priority,
      assigneeInitials: initials.trim().toUpperCase().slice(0, 2) || '?',
      assigneeColor: color,
    });
    onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm max-w-[20rem] rounded-2xl border border-[#e8e7ed] bg-white p-5 shadow-xl">
        <h2 className="mb-4 text-sm font-semibold text-[#1a1a2e]">New Task</h2>

        {/* Title */}
        <label className="mb-1 block text-xs text-[#6b6b80]">Title</label>
        <input
          autoFocus
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title…"
          className="mb-3 w-full rounded-lg border border-[#e8e7ed] bg-gray-50 px-3 py-2 text-sm text-[#1a1a2e] outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {/* Description */}
        <label className="mb-1 block text-xs text-[#6b6b80]">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description…"
          rows={2}
          className="mb-3 w-full resize-none rounded-lg border border-[#e8e7ed] bg-gray-50 px-3 py-2 text-sm text-[#1a1a2e] outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
        />

        {/* Priority */}
        <label className="mb-1 block text-xs text-[#6b6b80]">Priority</label>
        <div className="mb-3 flex gap-2">
          {(['low', 'medium', 'high'] as Priority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`rounded-md border px-3 py-1 text-xs font-medium capitalize transition-all ${
                priority === p
                  ? p === 'high'
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : p === 'medium'
                    ? 'border-amber-200 bg-amber-50 text-amber-500'
                    : 'border-green-200 bg-green-50 text-green-600'
                  : 'border-[#e8e7ed] bg-white text-[#9999aa] hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Assignee */}
        <label className="mb-1 block text-xs text-[#6b6b80]">Assignee initials</label>
        <div className="mb-3 flex gap-2">
          <input
            maxLength={2}
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase())}
            placeholder="e.g. JD"
            className="w-20 rounded-lg border border-[#e8e7ed] bg-gray-50 px-3 py-2 text-sm uppercase text-[#1a1a2e] outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                  color === c ? 'ring-2 ring-offset-1 ring-violet-400' : ''
                } ${
                  c === 'purple' ? 'bg-violet-200'
                  : c === 'teal'   ? 'bg-teal-200'
                  : c === 'orange' ? 'bg-orange-200'
                  : c === 'blue'   ? 'bg-blue-200'
                  : c === 'pink'   ? 'bg-pink-200'
                  : 'bg-green-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#6b6b80] hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!title.trim()}
            onClick={handleSubmit}
            className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  );
}
