'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Home, 
  CalendarCheck, 
  Users, 
  ShieldCheck, 
  CheckCircle2,
  Trees,
  ArrowRight
} from 'lucide-react';
import { setAppMode } from '@/lib/appMode';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao fazer login no sistema.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-[#060919]">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        
        {/* Left / Top Side: System Hero & Highlights */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left p-2 sm:p-4">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide w-fit">
            <Trees size={16} className="text-emerald-400" />
            <span>Sistema Administrativo de Chácaras</span>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">Chácaras</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Administração completa de reservas, equipes, serviços e propriedades em um único lugar.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <Home size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Propriedades</h2>
                <p className="text-xs text-slate-400 mt-0.5">Gestão de fotos, regras e capacidade.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <CalendarCheck size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Reservas & Agenda</h2>
                <p className="text-xs text-slate-400 mt-0.5">Check-in, check-out e bloqueios.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Equipe Operacional</h2>
                <p className="text-xs text-slate-400 mt-0.5">Escalas de limpezas e manutenção.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Controle Financeiro</h2>
                <p className="text-xs text-slate-400 mt-0.5">Relatórios de receitas e cauções.</p>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pt-1">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>Ambiente seguro e otimizado para administradores e gestores.</span>
          </div>
        </div>

        {/* Right / Bottom Side: Login Card */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl p-6 sm:p-8 lg:p-10 border border-white/10 shadow-2xl backdrop-blur-xl bg-[#0A0F2C]/80 relative overflow-hidden">
            
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Acesso ao Painel
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Faça login para acessar suas propriedades.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Footer Text */}
            <div className="mt-6 text-center border-t border-white/5 pt-4">
              <p className="text-[11px] text-slate-500 font-medium">
                Autenticação direta via Supabase Auth.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

