'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Star,
  Image as ImageIcon,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  UploadCloud
} from 'lucide-react';
import { PurchaseImage } from '@/lib/purchasesTypes';
import {
  uploadPurchasePhoto,
  deletePurchasePhoto,
  setPrimaryPurchasePhoto,
  getPurchaseImages
} from '@/services/purchasesService';

interface PurchaseImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId?: string;
  images: (PurchaseImage | { id?: string; public_url: string; file_name?: string; is_primary?: boolean })[];
  initialIndex?: number;
  productName?: string;
  title?: string;
  onImagesChange?: (updatedImages: PurchaseImage[]) => void;
  onImagesUpdated?: (updatedImages: PurchaseImage[]) => void;
}

export default function PurchaseImageLightbox({
  isOpen,
  onClose,
  purchaseId,
  images: initialImages = [],
  initialIndex = 0,
  productName,
  title,
  onImagesChange,
  onImagesUpdated
}: PurchaseImageLightboxProps) {
  const resolvedProductName = title || productName || 'Fotos do Produto';
  const [images, setImages] = useState(initialImages);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isUploading, setIsUploading] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, (images.length || 1) - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Direct Photo Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !purchaseId) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadPurchasePhoto(purchaseId, files[i], images.length === 0 && i === 0);
      }
      const updated = await getPurchaseImages(purchaseId);
      setImages(updated);
      onImagesChange?.(updated);
      onImagesUpdated?.(updated);
      setCurrentIndex(updated.length - 1);
      window.dispatchEvent(new CustomEvent('purchases-updated'));
      showToast('Foto adicionada com sucesso!');
    } catch (err) {
      console.error('Erro ao enviar foto:', err);
      showToast('Erro ao enviar foto.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Set Primary Photo
  const handleSetPrimary = async () => {
    if (!purchaseId || images.length === 0) return;
    const currentImg = images[currentIndex];
    if (!currentImg?.id || !currentImg?.public_url) return;

    setIsSettingPrimary(true);
    try {
      await setPrimaryPurchasePhoto(purchaseId, currentImg.id, currentImg.public_url);
      const updated = await getPurchaseImages(purchaseId);
      setImages(updated);
      onImagesChange?.(updated);
      onImagesUpdated?.(updated);
      window.dispatchEvent(new CustomEvent('purchases-updated'));
      showToast('Foto definida como principal!');
    } catch (err) {
      console.error('Erro ao definir foto principal:', err);
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // Delete Photo
  const handleDeletePhoto = async () => {
    if (!purchaseId || images.length === 0) return;
    const currentImg = images[currentIndex];
    if (!currentImg?.id) return;

    if (!confirm('Deseja realmente remover esta foto?')) return;

    setIsDeleting(true);
    try {
      await deletePurchasePhoto(currentImg.id, purchaseId);
      const updated = await getPurchaseImages(purchaseId);
      setImages(updated);
      onImagesChange?.(updated);
      onImagesUpdated?.(updated);
      setCurrentIndex((prev) => Math.max(0, Math.min(prev, updated.length - 1)));
      window.dispatchEvent(new CustomEvent('purchases-updated'));
      showToast('Foto removida com sucesso!');
      if (updated.length === 0) {
        onClose();
      }
    } catch (err) {
      console.error('Erro ao excluir foto:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl p-4 sm:p-6 select-none animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#FFD600] text-zinc-950 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 border border-black/20 animate-bounce">
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* Hidden file input for direct upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between z-10 py-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-white/10 text-[#FFD600] border border-white/10 shrink-0">
            <ImageIcon size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate max-w-md">
              {resolvedProductName}
            </h3>
            <p className="text-[11px] text-white/50 flex items-center gap-2">
              {images.length > 0 ? (
                <>
                  <span>Imagem {currentIndex + 1} de {images.length}</span>
                  {currentImage?.is_primary && (
                    <span className="inline-flex items-center gap-1 text-[#FFD600] font-bold text-[10px] bg-[#FFD600]/10 px-1.5 py-0.5 rounded border border-[#FFD600]/20">
                      <Star size={10} className="fill-[#FFD600]" />
                      Principal
                    </span>
                  )}
                </>
              ) : (
                <span>Nenhuma foto cadastrada</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Add Photo Button */}
          {purchaseId && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-2 rounded-xl bg-[#FFD600] hover:bg-[#FFD600]/90 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              <span>Adicionar Foto</span>
            </button>
          )}

          {/* Set Primary Button */}
          {purchaseId && currentImage && !currentImage.is_primary && (
            <button
              onClick={handleSetPrimary}
              disabled={isSettingPrimary}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-[#FFD600] hover:text-zinc-950 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/15 cursor-pointer disabled:opacity-50"
              title="Tornar esta a foto principal exibida na listagem"
            >
              {isSettingPrimary ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Star size={14} />
              )}
              <span>Tornar Principal</span>
            </button>
          )}

          {/* Delete Button */}
          {purchaseId && currentImage && (
            <button
              onClick={handleDeletePhoto}
              disabled={isDeleting}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white transition-all border border-rose-500/20 cursor-pointer disabled:opacity-50"
              title="Excluir esta foto"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          )}

          {/* Download & External Link */}
          {currentImage?.public_url && (
            <>
              <a
                href={currentImage.public_url}
                target="_blank"
                rel="noreferrer noopener"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all border border-white/10"
                title="Abrir imagem original em nova aba"
              >
                <ExternalLink size={16} />
              </a>
              <a
                href={currentImage.public_url}
                download={currentImage.file_name || `foto-compra-${currentIndex + 1}.jpg`}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all border border-white/10"
                title="Baixar imagem"
              >
                <Download size={16} />
              </a>
            </>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all border border-white/10 cursor-pointer ml-1"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div className="relative flex-1 w-full max-w-6xl flex items-center justify-center min-h-0 my-4">
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 hover:scale-110 transition-all shadow-2xl cursor-pointer"
            title="Imagem Anterior (Seta Esquerda)"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <div className="relative w-full h-full flex items-center justify-center p-2">
          {images.length > 0 && currentImage ? (
            <img
              src={currentImage.public_url}
              alt={currentImage.file_name || resolvedProductName}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300 select-none border border-white/10"
            />
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-md p-10 rounded-3xl border-2 border-dashed border-white/20 hover:border-[#FFD600] bg-white/5 hover:bg-[#FFD600]/5 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white/50">
                <UploadCloud size={32} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Nenhuma foto adicionada ainda</h4>
                <p className="text-xs text-white/50 mt-1">
                  Clique aqui para carregar a primeira foto deste produto.
                </p>
              </div>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 hover:scale-110 transition-all shadow-2xl cursor-pointer"
            title="Próxima Imagem (Seta Direita)"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 bg-zinc-950/80 rounded-2xl border border-white/10 shrink-0 z-10 scrollbar-thin">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                currentIndex === idx
                  ? 'border-[#FFD600] scale-105 shadow-lg shadow-[#FFD600]/20 ring-2 ring-[#FFD600]/40'
                  : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/30'
              }`}
            >
              <img
                src={img.public_url}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {img.is_primary && (
                <div className="absolute top-1 right-1 p-0.5 rounded-full bg-[#FFD600] text-black">
                  <Star size={8} className="fill-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
