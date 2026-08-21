'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070A1E] text-white p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Ocorreu um erro no sistema</h2>
        <p className="text-white/60 text-sm max-w-md mx-auto">{error?.message || 'Erro inesperado'}</p>
        <button
          onClick={() => reset()}
          className="bg-[#FFD600] text-[#0A0F2C] font-bold px-6 py-3 rounded-xl hover:bg-[#FFE500] transition-all"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
