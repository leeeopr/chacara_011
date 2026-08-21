'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
  Loader2,
  Building2,
  Receipt,
  FileCheck
} from 'lucide-react';
import { FiscalReservationItem, PaymentDocument } from '@/lib/fiscalTypes';
import {
  uploadPaymentDocument,
  getPaymentDocumentsForReservation,
  deletePaymentDocument,
  deriveCompetencia
} from '@/services/fiscalService';
import { useAuth } from '@/contexts/AuthContext';

interface UploadPaymentDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: FiscalReservationItem | null;
  onSuccess: () => void;
}

export default function UploadPaymentDocumentModal({
  isOpen,
  onClose,
  reservation,
  onSuccess
}: UploadPaymentDocumentModalProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || 'usr-atual';

  const [documents, setDocuments] = useState<PaymentDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [competencia, setCompetencia] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  const validateFile = (file: File): boolean => {
    setFeedbackMsg(null);
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|png|jpe?g|webp)$/i)) {
      setFeedbackMsg({
        type: 'error',
        text: 'Formato de arquivo não permitido. Utilize PDF, PNG, JPG ou WEBP.'
      });
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFeedbackMsg({
        type: 'error',
        text: `O arquivo é muito grande (${(file.size / (1024 * 1024)).toFixed(1)}MB). Tamanho máximo permitido: 15MB.`
      });
      return false;
    }
    return true;
  };

  const lastLoadedResIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && reservation) {
      // Only initialize form fields if opening for a new reservation
      if (lastLoadedResIdRef.current !== reservation.reservation_id) {
        lastLoadedResIdRef.current = reservation.reservation_id;
        loadDocs();
        const defaultDate = reservation.checkin_date || new Date().toISOString().substring(0, 10);
        setPaymentDate(defaultDate);
        setCompetencia(deriveCompetencia(defaultDate));
        setAmount(reservation.total_price ? String(reservation.total_price) : '');
        setDescription(`Comprovante de pagamento - ${reservation.code}`);
        setObservacoes('');
        setSelectedFile(null);
        setFeedbackMsg(null);
      }
    } else if (!isOpen) {
      lastLoadedResIdRef.current = null;
    }
  }, [isOpen, reservation?.reservation_id]);

  const loadDocs = async () => {
    if (!reservation) return;
    setLoadingDocs(true);
    try {
      const docs = await getPaymentDocumentsForReservation(reservation.reservation_id);
      setDocuments(docs);
    } catch (err) {
      console.error('Erro ao carregar comprovantes da reserva:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDateChange = (val: string) => {
    setPaymentDate(val);
    setCompetencia(deriveCompetencia(val));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (validateFile(f)) {
        setSelectedFile(f);
      } else {
        setSelectedFile(null);
        e.target.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      if (validateFile(f)) {
        setSelectedFile(f);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (!reservation) return;
    if (!selectedFile) {
      setFeedbackMsg({ type: 'error', text: 'Por favor, selecione um arquivo de comprovante.' });
      return;
    }
    if (!paymentDate) {
      setFeedbackMsg({ type: 'error', text: 'Por favor, informe a data do recebimento.' });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Por favor, informe um valor de recebimento válido.' });
      return;
    }

    setUploading(true);
    setFeedbackMsg({ type: 'info', text: 'Enviando comprovante para o servidor...' });

    try {
      await uploadPaymentDocument({
        reservation_id: reservation.reservation_id,
        chacara_id: reservation.chacara_id,
        file: selectedFile,
        payment_date: paymentDate,
        amount: Number(amount),
        description: description || 'Comprovante de Recebimento',
        competencia: competencia || deriveCompetencia(paymentDate),
        observacoes,
        uploaded_by: currentUserId
      });

      setSelectedFile(null);
      setDescription(`Comprovante adicional - ${reservation.code}`);
      setObservacoes('');
      setFeedbackMsg({ type: 'success', text: 'Comprovante adicionado com sucesso!' });
      await loadDocs();
      onSuccess();
    } catch (err: any) {
      console.error('[UploadModal] Erro:', err);
      setFeedbackMsg({
        type: 'error',
        text: `Não foi possível adicionar o comprovante. ${err.message || 'Tente novamente.'}`
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: PaymentDocument) => {
    if (!confirm(`Tem certeza que deseja excluir o comprovante "${doc.file_name}"?`)) return;

    setDeletingId(doc.id);
    setFeedbackMsg(null);
    try {
      await deletePaymentDocument(doc.id, doc.file_path);
      setFeedbackMsg({ type: 'success', text: 'Comprovante excluído com sucesso.' });
      await loadDocs();
      onSuccess();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Erro ao excluir comprovante: ${err.message}` });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen || !reservation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-[#0A0F2C] via-[#12193E] to-[#0A0F2C]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FFD600] text-[#0A0F2C] rounded-2xl shadow-[0_0_15px_rgba(255,214,0,0.3)] shrink-0">
              <Receipt size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Anexar Comprovantes Fiscais
              </h3>
              <p className="text-xs text-white/60">
                {reservation.chacara_nome} • Reserva {reservation.code}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Feedback Banner */}
          {feedbackMsg && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : feedbackMsg.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
              }`}
            >
              {feedbackMsg.type === 'success' && <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />}
              {feedbackMsg.type === 'error' && <AlertCircle size={18} className="shrink-0 text-rose-400" />}
              {feedbackMsg.type === 'info' && <Loader2 size={18} className="shrink-0 text-sky-400 animate-spin" />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Stay Info Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white">
            <div>
              <span className="text-[10px] text-white/40 uppercase font-black block">Hóspede / Cliente</span>
              <p className="font-bold text-white truncate">{reservation.client_nome}</p>
              <p className="text-[10px] text-white/50 truncate">Doc: {reservation.client_document}</p>
            </div>

            <div>
              <span className="text-[10px] text-white/40 uppercase font-black block">Período da Estadia</span>
              <p className="font-bold text-white flex items-center gap-1 mt-0.5">
                <Calendar size={13} className="text-[#FFD600]" />
                {reservation.checkin_date} até {reservation.checkout_date}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-white/40 uppercase font-black block">Valor Total da Reserva</span>
              <p className="font-black text-[#FFD600] text-sm">
                R$ {reservation.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-400 font-bold">
                Comprovado: R$ {documents.reduce((s, d) => s + (Number(d.amount) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Section 1: Upload Form */}
          <form onSubmit={handleUploadSubmit} className="space-y-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-xs font-black text-[#FFD600] uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} />
                Adicionar Novo Comprovante
              </h4>
              <span className="text-[10px] text-white/40 font-semibold">
                Múltiplos comprovantes permitidos por estadia
              </span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
                dragOver
                  ? 'border-[#FFD600] bg-[#FFD600]/10'
                  : selectedFile
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/20 hover:border-white/40 bg-black/30'
              }`}
            >
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2 text-emerald-400">
                  <FileCheck size={32} />
                  <div>
                    <p className="text-xs font-black text-white">{selectedFile.name}</p>
                    <p className="text-[10px] text-white/50">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Clique ou arraste outro para alterar
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/60">
                  <UploadCloud size={32} className="text-[#FFD600]" />
                  <div>
                    <p className="text-xs font-bold text-white">
                      Arraste e solte o comprovante aqui ou <span className="text-[#FFD600] underline">Procure no seu dispositivo</span>
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">
                      Formatos aceitos: PDF, PNG, JPG, WEBP (Sem limite de quantidade de arquivos)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-white/70 uppercase block mb-1">
                  Data do Recebimento *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-[#FFD600]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/70 uppercase block mb-1">
                  Valor Recebido (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs font-bold text-[#FFD600] outline-none focus:border-[#FFD600]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/70 uppercase block mb-1">
                  Competência Fiscal
                </label>
                <input
                  type="text"
                  placeholder="YYYY-MM"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-[#FFD600]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-white/70 uppercase block mb-1">
                  Descrição / Categoria do Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sinal 50%, Quitação, Pix Caixa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-[#FFD600]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/70 uppercase block mb-1">
                  Observações para o Carnê-Leão
                </label>
                <input
                  type="text"
                  placeholder="Ex: Recebido por transferência Pix..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-[#FFD600]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-6 py-2.5 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Enviando Comprovante...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>Anexar Comprovante à Estadia</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Section 2: Existing Documents List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-[#FFD600]" />
              Comprovantes Já Anexados a esta Estadia ({documents.length})
            </h4>

            {loadingDocs ? (
              <div className="py-6 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#FFD600]" />
                Carregando comprovantes...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-6 text-center bg-white/5 border border-white/10 rounded-2xl space-y-1">
                <p className="text-xs text-white/60 font-bold">Nenhum comprovante anexado até o momento.</p>
                <p className="text-[11px] text-white/40">
                  Faça o upload do primeiro comprovante para organizar no Carnê-Leão.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-white flex items-center gap-2">
                          <span>{doc.file_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70 font-semibold">
                            {doc.competencia}
                          </span>
                        </p>
                        <p className="text-[11px] text-white/60 mt-0.5">
                          {doc.description || 'Comprovante'} • Pagamento: {doc.payment_date}
                        </p>
                        {doc.observacoes && (
                          <p className="text-[10px] text-white/40 italic mt-0.5">
                            Obs: {doc.observacoes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                      <span className="font-black text-[#FFD600] text-sm">
                        R$ {Number(doc.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>

                      <div className="flex items-center gap-2">
                        {doc.public_url && (
                          <a
                            href={doc.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all"
                            title="Visualizar / Baixar arquivo"
                          >
                            <ExternalLink size={14} />
                            <span className="hidden sm:inline">Abrir</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl transition-all cursor-pointer"
                          title="Excluir comprovante"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-5 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Concluir / Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
