import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070A1E] text-white p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404 - Página Não Encontrada</h1>
        <p className="text-white/60">A página que você procura não existe ou foi movida.</p>
        <Link
          href="/"
          className="inline-block bg-[#FFD600] text-[#0A0F2C] font-bold px-6 py-3 rounded-xl hover:bg-[#FFE500] transition-all"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
