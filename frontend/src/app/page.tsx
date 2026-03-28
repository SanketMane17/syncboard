'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useBoardStore } from '@/store/board.store';
import { useSocket } from '@/hooks/useSocket';
import { BoardShell } from '@/components/board/BoardShell';

export default function Home() {
  const { setBoard, setLoading, setError, isLoading, error, board } = useBoardStore();

  // Wire up WebSocket listeners
  useSocket();

  useEffect(() => {
    setLoading(true);
    api
      .getBoard()
      .then((b) => setBoard(b))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [setBoard, setLoading, setError]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-violet-500" />
          <p className="text-sm text-gray-400">Loading board…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-red-500">Failed to load board</p>
          <p className="mt-1 text-xs text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!board) return null;

  return <BoardShell />;
}
