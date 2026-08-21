'use client';

import React, { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PatientImportProps {
  onSuccess: () => void;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export default function PatientImport({ onSuccess }: PatientImportProps) {
  const { profile } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const excelDateToISO = (value: any): string | null => {
    if (!value) return null;

    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      return value.toISOString().split('T')[0];
    }

    if (typeof value === 'object' && value.result) {
      return excelDateToISO(value.result);
    }

    // Handle serial numbers (Excel numeric format)
    if (typeof value === 'number') {
      const date = new Date(Math.round((value - (25567 + 2)) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Handle strings
    const dateStr = String(value).trim();
    if (!dateStr) return null;

    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Try parsing common formats
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setError('Por favor, selecione um arquivo .xlsx');
      return;
    }

    setIsImporting(true);
    setResult(null);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('O arquivo está vazio.');
      }

      const data: any[][] = [];
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const rowValues: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let val = cell.value;
          if (val && typeof val === 'object') {
            if ('result' in val && val.result !== undefined) val = val.result;
            else if ('text' in val && val.text !== undefined) val = val.text;
          }
          rowValues[colNumber - 1] = val;
        });
        data.push(rowValues);
      });

      if (!data || data.length === 0) {
        throw new Error('O arquivo está vazio.');
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process each row
      // Column A = Name, B = Birth Date, C = Record Number
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const rawName = row[0];
        const rawBirthDate = row[1];
        const rawRecord = row[2];

        // Basic check for empty rows or headers
        if (i === 0 && String(rawName).toLowerCase().includes('nome')) continue;

        // Validation
        const name = rawName ? String(rawName).trim() : '';
        const record = rawRecord ? String(rawRecord).trim() : '';
        const birthDateISO = excelDateToISO(rawBirthDate);

        if (!name || !record || !birthDateISO) {
          const missing = [];
          if (!name) missing.push('nome');
          if (!record) missing.push('registro');
          if (!birthDateISO) missing.push('data de nascimento (formato inválido ou vazio)');
          
          if (name || record || rawBirthDate) {
            failedCount++;
            errors.push(`Linha ${i + 1}: Faltando ou inválido: ${missing.join(', ')}.`);
          }
          continue;
        }

        // Data Transformation
        const formattedName = `${name} - ${record}`;

        try {
          // Database Integration
          const { error: insertError } = await supabase
            .from('patients')
            .insert({
              full_name: formattedName,
              birth_date: birthDateISO,
              whatsapp: '', 
              fono_id: profile?.role === 'FONO' ? profile.id : null
            });

          if (insertError) {
            console.error(`Erro na linha ${i + 1}:`, insertError);
            failedCount++;
            errors.push(`Linha ${i + 1}: ${insertError.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.error(`Exceção na linha ${i + 1}:`, err);
          failedCount++;
          errors.push(`Linha ${i + 1}: Erro inesperado.`);
        }
      }

      setResult({
        total: successCount + failedCount,
        success: successCount,
        failed: failedCount,
        errors: errors
      });

      if (successCount > 0) {
        onSuccess();
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <label 
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer border ${
            isImporting 
              ? 'bg-white/5 border-white/5 text-white/20 cursor-wait' 
              : 'bg-[#FFD600] border-[#FFD600] text-[#0A0F2C] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#FFD600]/20'
          }`}
        >
          {isImporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={18} />
          )}
          <span>{isImporting ? 'Importando...' : 'Importar Excel'}</span>
          <input 
            type="file" 
            className="hidden" 
            accept=".xlsx" 
            onChange={handleFileUpload}
            disabled={isImporting}
            ref={fileInputRef}
          />
        </label>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
              <AlertCircle size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass glass-reflection rounded-3xl border border-white/5 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#FFD600]" />
                  Resultado da Importação
                </h3>
                <button onClick={() => setResult(null)} className="text-white/20 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black text-white">{result.total}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <p className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest mb-1">Sucesso</p>
                  <p className="text-2xl font-black text-emerald-400">{result.success}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-center">
                  <p className="text-[10px] font-black text-rose-400/40 uppercase tracking-widest mb-1">Falhas</p>
                  <p className="text-2xl font-black text-rose-400">{result.failed}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Logs de Erros</p>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {result.errors.map((err, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-bold text-white/60 flex items-start gap-2">
                        <ChevronRight size={12} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
