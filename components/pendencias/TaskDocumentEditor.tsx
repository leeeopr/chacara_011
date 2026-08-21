'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Plus, Trash2, Check, Type, Table as TableIcon,
  CheckSquare, CheckCircle2, Heading, Minus, Rows, Columns,
  CornerDownLeft, GripVertical, AlertCircle
} from 'lucide-react';
import {
  PendenciaBlock,
  PendenciaBlockType,
  TextBlockContent,
  HeadingBlockContent,
  TableBlockContent,
  ChecklistBlockContent,
  ChecklistItem,
  DividerBlockContent
} from '@/lib/pendenciasTypes';
import {
  getTaskBlocks,
  saveTaskBlocks,
  deleteTaskBlock
} from '@/services/pendenciasService';

interface TaskDocumentEditorProps {
  taskId?: string;
  taskTitle?: string;
  value?: PendenciaBlock[];
  onChange?: (blocks: PendenciaBlock[], progressPercent: number, isComplete: boolean) => void;
  onProgressUpdate?: (percent: number, complete: boolean) => void;
  readOnly?: boolean;
}

export default function TaskDocumentEditor({
  taskId,
  taskTitle,
  value,
  onChange,
  onProgressUpdate,
  readOnly = false
}: TaskDocumentEditorProps) {
  const [internalBlocks, setInternalBlocks] = useState<PendenciaBlock[]>([]);
  const [loading, setLoading] = useState(!!taskId && !value);
  const [savingState, setSavingState] = useState<'saved' | 'saving'>('saved');

  // Active Slash Command state
  const [activeSlashBlockId, setActiveSlashBlockId] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const slashMenuRef = useRef<HTMLDivElement>(null);

  // Debounce save ref for task-bound mode
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadedRef = useRef(false);

  // Sync / Load blocks
  useEffect(() => {
    if (value) {
      setInternalBlocks(value);
      setLoading(false);
      initialLoadedRef.current = true;
      return;
    }

    if (taskId) {
      let isMounted = true;
      async function load() {
        setLoading(true);
        const fetchedBlocks = await getTaskBlocks(taskId!);
        if (isMounted) {
          if (fetchedBlocks.length === 0) {
            // Default initial block if empty
            const initBlock: PendenciaBlock = {
              id: `blk-${Date.now()}`,
              task_id: taskId!,
              order_index: 0,
              type: 'TEXT',
              content: { text: '' }
            };
            setInternalBlocks([initBlock]);
          } else {
            setInternalBlocks(fetchedBlocks);
          }
          setLoading(false);
          initialLoadedRef.current = true;
        }
      }
      load();
      return () => {
        isMounted = false;
      };
    }
  }, [taskId, value]);

  // Compute Checklist Progress & Completion
  let totalChecklistItems = 0;
  let checkedChecklistItems = 0;

  const currentBlocks = value || internalBlocks;

  currentBlocks.forEach(b => {
    if (b.type === 'CHECKLIST') {
      const content = b.content as ChecklistBlockContent;
      if (content?.items) {
        totalChecklistItems += content.items.length;
        checkedChecklistItems += content.items.filter(i => i.checked).length;
      }
    }
  });

  const progressPercent = totalChecklistItems > 0
    ? Math.round((checkedChecklistItems / totalChecklistItems) * 100)
    : 0;

  const isComplete = totalChecklistItems > 0 && progressPercent === 100;

  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(progressPercent, isComplete);
    }
  }, [progressPercent, isComplete, onProgressUpdate]);

  // Auto-Save or Trigger Parent Callback
  const updateBlocks = useCallback((newBlocks: PendenciaBlock[]) => {
    setInternalBlocks(newBlocks);

    // Calculate progress for callback
    let total = 0;
    let checked = 0;
    newBlocks.forEach(b => {
      if (b.type === 'CHECKLIST') {
        const content = b.content as ChecklistBlockContent;
        if (content?.items) {
          total += content.items.length;
          checked += content.items.filter(i => i.checked).length;
        }
      }
    });
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const complete = total > 0 && pct === 100;

    if (onChange) {
      onChange(newBlocks, pct, complete);
    }

    if (taskId && initialLoadedRef.current) {
      setSavingState('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await saveTaskBlocks(taskId, newBlocks);
        setSavingState('saved');
      }, 400);
    }
  }, [taskId, onChange]);

  // Close slash menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setActiveSlashBlockId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========================================================
  // DOCUMENT BLOCK MANIPULATION
  // ========================================================

  const handleAddBlock = (type: PendenciaBlockType, afterIndex?: number) => {
    const newBlockId = `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let initialContent: any = { text: '' };

    if (type === 'TABLE') {
      initialContent = {
        rows: [
          ['Item / Material', 'Quantidade', 'Observações'],
          ['', '', ''],
          ['', '', '']
        ]
      };
    } else if (type === 'CHECKLIST') {
      initialContent = {
        items: [
          { id: `chk-${Date.now()}-1`, text: '', checked: false }
        ]
      };
    } else if (type === 'HEADING') {
      initialContent = { text: '', level: 1 };
    } else if (type === 'DIVIDER') {
      initialContent = { style: 'solid' };
    }

    const newBlock: PendenciaBlock = {
      id: newBlockId,
      task_id: taskId || 'draft',
      order_index: afterIndex !== undefined ? afterIndex + 1 : currentBlocks.length,
      type,
      content: initialContent
    };

    let nextBlocks = [...currentBlocks];
    if (afterIndex !== undefined) {
      nextBlocks.splice(afterIndex + 1, 0, newBlock);
    } else {
      nextBlocks.push(newBlock);
    }

    nextBlocks = nextBlocks.map((b, idx) => ({ ...b, order_index: idx }));
    updateBlocks(nextBlocks);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (currentBlocks.length <= 1) {
      // Reset last remaining block to empty text
      const resetBlocks: PendenciaBlock[] = [{
        id: `blk-${Date.now()}`,
        task_id: taskId || 'draft',
        order_index: 0,
        type: 'TEXT',
        content: { text: '' }
      }];
      updateBlocks(resetBlocks);
      return;
    }

    const nextBlocks = currentBlocks.filter(b => b.id !== blockId).map((b, idx) => ({ ...b, order_index: idx }));
    if (taskId) {
      await deleteTaskBlock(blockId, taskId);
    }
    updateBlocks(nextBlocks);
  };

  const handleChangeBlockType = (blockId: string, newType: PendenciaBlockType) => {
    let newContent: any = { text: '' };
    if (newType === 'TABLE') {
      newContent = {
        rows: [
          ['Coluna 1', 'Coluna 2', 'Coluna 3'],
          ['', '', ''],
          ['', '', '']
        ]
      };
    } else if (newType === 'CHECKLIST') {
      newContent = {
        items: [
          { id: `chk-${Date.now()}`, text: '', checked: false }
        ]
      };
    } else if (newType === 'HEADING') {
      newContent = { text: '', level: 1 };
    } else if (newType === 'DIVIDER') {
      newContent = { style: 'solid' };
    }

    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId) {
        return { ...b, type: newType, content: newContent };
      }
      return b;
    });

    setActiveSlashBlockId(null);
    setSlashQuery('');
    updateBlocks(nextBlocks);
  };

  // ========================================================
  // TEXT & SLASH COMMAND HANDLERS
  // ========================================================

  const handleTextChange = (blockId: string, value: string) => {
    // Slash command triggering
    if (value.includes('/')) {
      const parts = value.split('/');
      const queryAfterSlash = parts[parts.length - 1].toLowerCase().trim();
      setActiveSlashBlockId(blockId);
      setSlashQuery(queryAfterSlash);

      // Auto-match exact slash keywords
      if (queryAfterSlash === 'checkbox' || queryAfterSlash === 'checklist' || queryAfterSlash === 'check') {
        handleChangeBlockType(blockId, 'CHECKLIST');
        return;
      }
      if (queryAfterSlash === 'tabela' || queryAfterSlash === 'table') {
        handleChangeBlockType(blockId, 'TABLE');
        return;
      }
      if (queryAfterSlash === 'divider' || queryAfterSlash === 'divisor' || queryAfterSlash === 'linha') {
        handleChangeBlockType(blockId, 'DIVIDER');
        return;
      }
      if (queryAfterSlash === 'heading' || queryAfterSlash === 'titulo' || queryAfterSlash === 'h1') {
        handleChangeBlockType(blockId, 'HEADING');
        return;
      }
    } else {
      if (activeSlashBlockId === blockId) {
        setActiveSlashBlockId(null);
      }
    }

    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId) {
        if (b.type === 'HEADING') {
          return { ...b, content: { ...b.content, text: value } };
        }
        return { ...b, content: { text: value } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent, blockId: string, index: number, value: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddBlock('TEXT', index);
    } else if (e.key === 'Backspace' && value === '' && currentBlocks.length > 1) {
      e.preventDefault();
      handleDeleteBlock(blockId);
    }
  };

  // ========================================================
  // CHECKLIST HANDLERS
  // ========================================================

  const handleToggleCheckitem = (blockId: string, itemId: string) => {
    if (readOnly) return;
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'CHECKLIST') {
        const content = b.content as ChecklistBlockContent;
        const newItems = content.items.map(i => {
          if (i.id === itemId) return { ...i, checked: !i.checked };
          return i;
        });
        return { ...b, content: { items: newItems } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleCheckitemTextChange = (blockId: string, itemId: string, text: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'CHECKLIST') {
        const content = b.content as ChecklistBlockContent;
        const newItems = content.items.map(i => {
          if (i.id === itemId) return { ...i, text };
          return i;
        });
        return { ...b, content: { items: newItems } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleAddCheckitem = (blockId: string, afterItemId?: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'CHECKLIST') {
        const content = b.content as ChecklistBlockContent;
        const newItem: ChecklistItem = {
          id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          text: '',
          checked: false
        };

        let newItems = [...content.items];
        if (afterItemId) {
          const idx = newItems.findIndex(i => i.id === afterItemId);
          if (idx !== -1) newItems.splice(idx + 1, 0, newItem);
          else newItems.push(newItem);
        } else {
          newItems.push(newItem);
        }

        return { ...b, content: { items: newItems } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleDeleteCheckitem = (blockId: string, itemId: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'CHECKLIST') {
        const content = b.content as ChecklistBlockContent;
        if (content.items.length <= 1) return b; // Keep at least 1 item
        return { ...b, content: { items: content.items.filter(i => i.id !== itemId) } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  // ========================================================
  // TABLE HANDLERS
  // ========================================================

  const handleCellChange = (blockId: string, rowIndex: number, colIndex: number, value: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'TABLE') {
        const content = b.content as TableBlockContent;
        const newRows = content.rows.map((r, rIdx) => {
          if (rIdx === rowIndex) {
            const newCols = [...r];
            newCols[colIndex] = value;
            return newCols;
          }
          return r;
        });
        return { ...b, content: { rows: newRows } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleAddTableRow = (blockId: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'TABLE') {
        const content = b.content as TableBlockContent;
        const colCount = content.rows[0]?.length || 3;
        const newRow = new Array(colCount).fill('');
        return { ...b, content: { rows: [...content.rows, newRow] } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleRemoveTableRow = (blockId: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'TABLE') {
        const content = b.content as TableBlockContent;
        if (content.rows.length <= 1) return b;
        return { ...b, content: { rows: content.rows.slice(0, -1) } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleAddTableCol = (blockId: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'TABLE') {
        const content = b.content as TableBlockContent;
        const newRows = content.rows.map(r => [...r, '']);
        return { ...b, content: { rows: newRows } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handleRemoveTableCol = (blockId: string) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'TABLE') {
        const content = b.content as TableBlockContent;
        if ((content.rows[0]?.length || 0) <= 1) return b;
        const newRows = content.rows.map(r => r.slice(0, -1));
        return { ...b, content: { rows: newRows } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  const handlePasteExcel = (e: React.ClipboardEvent, blockId: string, startRow: number, startCol: number) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || (!pasteData.includes('\t') && !pasteData.includes('\n'))) return;

    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).filter(r => r.trim().length > 0).map(r => r.split('\t'));

    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId && b.type === 'TABLE') {
        const content = b.content as TableBlockContent;
        const newRows = content.rows.map(r => [...r]);

        rows.forEach((pRow, rOffset) => {
          const targetR = startRow + rOffset;
          if (!newRows[targetR]) {
            newRows[targetR] = new Array(newRows[0]?.length || 3).fill('');
          }
          pRow.forEach((val, cOffset) => {
            const targetC = startCol + cOffset;
            if (targetC < newRows[targetR].length) {
              newRows[targetR][targetC] = val;
            }
          });
        });

        return { ...b, content: { rows: newRows } };
      }
      return b;
    });
    updateBlocks(nextBlocks);
  };

  if (loading) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-white/50 font-bold">Carregando documento da pendência...</p>
      </div>
    );
  }

  return (
    <div className="relative p-5 sm:p-7 bg-[#090D28]/95 border border-white/15 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
      
      {/* ========================================================
          DOCUMENT HEADER (PROGRESS BAR & STAMP "COMPLETE!")
         ======================================================== */}
      <div className="relative pb-5 border-b border-white/10">
        
        {/* CARIMBO DIAGOMAL COMPLETE! (SE 100% CHECKLIST CONCLUÍDO) */}
        {isComplete && (
          <div className="absolute -top-2 right-2 z-20 pointer-events-none select-none transform rotate-[-10deg] animate-in zoom-in-75 duration-300">
            <div className="px-5 py-1.5 border-4 border-emerald-400 bg-emerald-950/90 text-emerald-400 font-black text-base sm:text-xl uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.6)] flex items-center gap-2 backdrop-blur-md">
              <CheckCircle2 size={22} className="shrink-0 text-emerald-400 stroke-[3]" />
              <span>COMPLETE!</span>
            </div>
          </div>
        )}

        {/* Informações de estado */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD600] flex items-center gap-1 bg-[#FFD600]/10 px-2.5 py-1 rounded-lg border border-[#FFD600]/20">
              <Sparkles size={12} /> Documento da Pendência
            </span>
            <span className="text-white/20 hidden sm:inline">•</span>
            <span className="text-[11px] font-bold text-white/60">
              {totalChecklistItems > 0
                ? `${checkedChecklistItems} de ${totalChecklistItems} itens concluídos`
                : 'Digite /checkbox no documento para criar lista de checagem'}
            </span>
          </div>

          {!readOnly && taskId && (
            <div className="text-[10px] font-bold flex items-center gap-1.5 shrink-0">
              {savingState === 'saving' ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Salvando...
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Salvo em tempo real
                </span>
              )}
            </div>
          )}
        </div>

        {/* Título da Pendência */}
        {taskTitle && (
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mb-3 pr-24">
            {taskTitle}
          </h2>
        )}

        {/* Barra de Progresso Única */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-white/70">Progresso dos Checkboxes</span>
            <span className={isComplete ? 'text-emerald-400' : 'text-[#FFD600]'}>
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-black/50 border border-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
                  : 'bg-gradient-to-r from-[#FFD600] to-amber-400 shadow-[0_0_12px_rgba(255,214,0,0.4)]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          ÁREA ÚNICA DO DOCUMENTO (FLUXO CONTÍNUO)
         ======================================================== */}
      <div className="space-y-3 min-h-[180px]">
        {currentBlocks.map((block, index) => (
          <div
            key={block.id}
            className="group relative flex items-start gap-2 pt-1 transition-all"
          >
            {/* Controles discretos na margem esquerda ao passar o mouse */}
            {!readOnly && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pt-1 -ml-6 sm:-ml-8 pr-1">
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-1 text-white/30 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                  title="Remover elemento"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {/* Conteúdo do Elemento do Documento */}
            <div className="flex-1 min-w-0">

              {/* ----------------------------------------------------
                  1. ELEMENTO: TEXTO COMUM
                 ---------------------------------------------------- */}
              {block.type === 'TEXT' && (
                <div className="relative">
                  <textarea
                    rows={1}
                    disabled={readOnly}
                    value={(block.content as TextBlockContent)?.text || ''}
                    onChange={(e) => {
                      handleTextChange(block.id, e.target.value);
                      // Auto height
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => handleTextKeyDown(e, block.id, index, (block.content as TextBlockContent)?.text || '')}
                    placeholder={readOnly ? '' : "Escreva seu texto aqui... (digite '/' para comandos)"}
                    className="w-full bg-transparent text-sm font-medium text-white/90 placeholder-white/20 outline-none resize-none leading-relaxed border-none focus:ring-0 p-0"
                  />

                  {/* MENU COMANDOS SLASH (INLINE POPUP) */}
                  {activeSlashBlockId === block.id && !readOnly && (
                    <div
                      ref={slashMenuRef}
                      className="absolute left-0 top-full mt-1 z-50 w-64 bg-[#0F143C] border border-[#FFD600]/40 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2"
                    >
                      <p className="px-2.5 py-1 text-[10px] font-black uppercase text-[#FFD600] tracking-wider">
                        Inserir Elemento
                      </p>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleChangeBlockType(block.id, 'CHECKLIST')}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-xs font-bold text-white transition-colors"
                        >
                          <CheckSquare size={15} className="text-emerald-400" />
                          <div>
                            <div>/checkbox</div>
                            <div className="text-[10px] text-white/40 font-normal">Lista de checagem interativa</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeBlockType(block.id, 'TABLE')}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-xs font-bold text-white transition-colors"
                        >
                          <TableIcon size={15} className="text-sky-400" />
                          <div>
                            <div>/table</div>
                            <div className="text-[10px] text-white/40 font-normal">Tabela editável com linhas/colunas</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeBlockType(block.id, 'HEADING')}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-xs font-bold text-white transition-colors"
                        >
                          <Heading size={15} className="text-[#FFD600]" />
                          <div>
                            <div>/heading</div>
                            <div className="text-[10px] text-white/40 font-normal">Título interno de seção</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeBlockType(block.id, 'DIVIDER')}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-xs font-bold text-white transition-colors"
                        >
                          <Minus size={15} className="text-purple-400" />
                          <div>
                            <div>/divider</div>
                            <div className="text-[10px] text-white/40 font-normal">Linha divisória de assuntos</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------
                  2. ELEMENTO: TÍTULO INTERNO (HEADING)
                 ---------------------------------------------------- */}
              {block.type === 'HEADING' && (
                <div className="relative pt-2 pb-1">
                  <input
                    type="text"
                    disabled={readOnly}
                    value={(block.content as HeadingBlockContent)?.text || ''}
                    onChange={(e) => handleTextChange(block.id, e.target.value)}
                    onKeyDown={(e) => handleTextKeyDown(e, block.id, index, (block.content as HeadingBlockContent)?.text || '')}
                    placeholder={readOnly ? '' : 'Título de Seção...'}
                    className="w-full bg-transparent text-base sm:text-lg font-black text-[#FFD600] placeholder-white/30 outline-none border-b border-white/10 pb-1"
                  />
                </div>
              )}

              {/* ----------------------------------------------------
                  3. ELEMENTO: DIVISOR VISUAL (DIVIDER)
                 ---------------------------------------------------- */}
              {block.type === 'DIVIDER' && (
                <div className="py-2">
                  <hr className="border-t border-white/20" />
                </div>
              )}

              {/* ----------------------------------------------------
                  4. ELEMENTO: CHECKLIST INTERATIVO
                 ---------------------------------------------------- */}
              {block.type === 'CHECKLIST' && (
                <div className="space-y-2 py-1">
                  {((block.content as ChecklistBlockContent)?.items || []).map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl transition-all ${
                        item.checked
                          ? 'bg-emerald-500/10 text-white/50 border border-emerald-500/20'
                          : 'bg-black/30 text-white border border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleToggleCheckitem(block.id, item.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          item.checked
                            ? 'bg-emerald-500 border-emerald-400 text-[#0A0F2C]'
                            : 'bg-white/5 border-white/30 hover:border-[#FFD600]'
                        }`}
                      >
                        {item.checked && <Check size={14} className="stroke-[3]" />}
                      </button>

                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.text}
                        onChange={(e) => handleCheckitemTextChange(block.id, item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCheckitem(block.id, item.id);
                          } else if (e.key === 'Backspace' && item.text === '') {
                            handleDeleteCheckitem(block.id, item.id);
                          }
                        }}
                        placeholder={readOnly ? '' : 'Item do checklist... (tecle Enter para próximo item)'}
                        className={`flex-1 bg-transparent text-xs font-bold outline-none ${
                          item.checked ? 'line-through text-white/40' : 'text-white'
                        }`}
                      />

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCheckitem(block.id, item.id)}
                          className="p-1 text-white/20 hover:text-red-400 transition-colors"
                          title="Remover Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleAddCheckitem(block.id)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-[11px] rounded-lg border border-white/10 transition-colors inline-flex items-center gap-1"
                    >
                      <Plus size={13} className="text-emerald-400" /> + Item no checklist
                    </button>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------
                  5. ELEMENTO: TABELA EDITÁVEL (INTEGRADA AO CONTEÚDO)
                 ---------------------------------------------------- */}
              {block.type === 'TABLE' && (
                <div className="my-2 space-y-2">
                  {!readOnly && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-white/70">
                      <button
                        type="button"
                        onClick={() => handleAddTableRow(block.id)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white flex items-center gap-1 transition-colors"
                      >
                        <Rows size={12} className="text-sky-400" /> + Linha
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTableRow(block.id)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white flex items-center gap-1 transition-colors"
                      >
                        - Linha
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddTableCol(block.id)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white flex items-center gap-1 transition-colors"
                      >
                        <Columns size={12} className="text-sky-400" /> + Coluna
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTableCol(block.id)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white flex items-center gap-1 transition-colors"
                      >
                        - Coluna
                      </button>
                      <span className="text-[10px] text-white/40 ml-auto hidden sm:inline">
                        Cole do Excel ou tecle Tab para navegar
                      </span>
                    </div>
                  )}

                  <div className="overflow-x-auto border border-white/15 rounded-2xl bg-black/40 p-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[320px]">
                      <tbody>
                        {((block.content as TableBlockContent)?.rows || []).map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx === 0 ? 'bg-white/10 font-black text-white' : 'border-t border-white/10'}>
                            {row.map((cellVal, cIdx) => (
                              <td key={cIdx} className="p-1 border-r border-white/10 last:border-r-0 min-w-[110px]">
                                <input
                                  type="text"
                                  disabled={readOnly}
                                  value={cellVal}
                                  onChange={(e) => handleCellChange(block.id, rIdx, cIdx, e.target.value)}
                                  onPaste={(e) => handlePasteExcel(e, block.id, rIdx, cIdx)}
                                  placeholder={rIdx === 0 ? `Coluna ${cIdx + 1}` : ''}
                                  className="w-full px-2.5 py-1.5 bg-transparent text-xs font-medium text-white outline-none focus:bg-white/10 rounded-lg transition-colors"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* ========================================================
          BARRA DE INSERÇÃO DE COMANDOS RÁPIDOS NO RODAPÉ DO EDITOR
         ======================================================== */}
      {!readOnly && (
        <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-white/40 mr-1 uppercase tracking-wider">
            Inserir:
          </span>
          <button
            type="button"
            onClick={() => handleAddBlock('TEXT')}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 hover:border-[#FFD600]"
          >
            <Type size={13} className="text-[#FFD600]" /> Texto
          </button>

          <button
            type="button"
            onClick={() => handleAddBlock('CHECKLIST')}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 hover:border-emerald-400"
          >
            <CheckSquare size={13} className="text-emerald-400" /> Checkbox
          </button>

          <button
            type="button"
            onClick={() => handleAddBlock('TABLE')}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 hover:border-sky-400"
          >
            <TableIcon size={13} className="text-sky-400" /> Tabela
          </button>

          <button
            type="button"
            onClick={() => handleAddBlock('HEADING')}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 hover:border-[#FFD600]"
          >
            <Heading size={13} className="text-[#FFD600]" /> Título
          </button>

          <button
            type="button"
            onClick={() => handleAddBlock('DIVIDER')}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 hover:border-purple-400"
          >
            <Minus size={13} className="text-purple-400" /> Divisor
          </button>
        </div>
      )}

    </div>
  );
}
