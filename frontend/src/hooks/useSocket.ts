'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useBoardStore } from '@/store/board.store';
import type {
  TaskMovedPayload,
  TaskCreatedPayload,
  TaskDeletedPayload,
} from '@/types';

export function useSocket() {
  const { applyRemoteMove, applyRemoteCreate, applyRemoteDelete } = useBoardStore();

  useEffect(() => {
    const socket = getSocket();

    const onMove = (payload: TaskMovedPayload) => applyRemoteMove(payload);
    const onCreate = (payload: TaskCreatedPayload) => applyRemoteCreate(payload);
    const onDelete = (payload: TaskDeletedPayload) => applyRemoteDelete(payload);

    socket.on('task:moved', onMove);
    socket.on('task:created', onCreate);
    socket.on('task:deleted', onDelete);

    return () => {
      socket.off('task:moved', onMove);
      socket.off('task:created', onCreate);
      socket.off('task:deleted', onDelete);
    };
  }, [applyRemoteMove, applyRemoteCreate, applyRemoteDelete]);
}
