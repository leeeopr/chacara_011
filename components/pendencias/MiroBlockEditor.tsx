'use client';

import React from 'react';
import TaskDocumentEditor from './TaskDocumentEditor';
import { PendenciaBlock } from '@/lib/pendenciasTypes';

interface MiroBlockEditorProps {
  taskId: string;
  taskTitle: string;
  onProgressUpdate?: (percent: number, complete: boolean) => void;
  value?: PendenciaBlock[];
  onChange?: (blocks: PendenciaBlock[], percent: number, complete: boolean) => void;
}

export default function MiroBlockEditor({
  taskId,
  taskTitle,
  onProgressUpdate,
  value,
  onChange
}: MiroBlockEditorProps) {
  return (
    <TaskDocumentEditor
      taskId={taskId}
      taskTitle={taskTitle}
      value={value}
      onChange={onChange}
      onProgressUpdate={onProgressUpdate}
    />
  );
}
