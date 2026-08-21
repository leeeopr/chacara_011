'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, UserCheck, Lock, Save, RefreshCw, AlertTriangle, Check, Eye, PlusSquare, Edit, Trash2, Globe, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface RolePermission {
  role: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  scope: 'all' | 'own';
}

const RESOURCES = ['appointments', 'patients', 'settings', 'rbac', 'profiles'];
const ROLES = ['SECRETARIA', 'PROFISSIONAL', 'FONO']; // DONA/OWNER/admin are hardcoded to skip matrix

export default function PermissionsPanel() {
  const { profile, refreshProfile } = useAuth();
  const { isAdmin, loading: permsLoading } = usePermissions('rbac');
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('role_permissions')
        .select('*');

      if (fetchError) throw fetchError;
      setPermissions(data || []);
      setIsDirty(false);
    } catch (err: any) {
      console.error('[RBAC] Error fetching matrix:', err);
      setError(err.message || 'Erro ao carregar matriz de permissões');
    } finally {
      setLoading(false);
    }
  };

  const findPerm = (role: string, resource: string) => {
    return permissions.find(p => p.role === role && p.resource === resource) || {
      role,
      resource,
      can_view: false,
      can_create: false,
      can_update: false,
      can_delete: false,
      scope: 'all' as const
    };
  };

  const togglePerm = (role: string, resource: string, action: keyof RolePermission) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.role === role && p.resource === resource);
      let next: RolePermission[];
      
      if (existing) {
        next = prev.map(p => {
          if (p.role === role && p.resource === resource) {
            return { ...p, [action]: !p[action] };
          }
          return p;
        });
      } else {
        const newPerm = {
          role,
          resource,
          can_view: false,
          can_create: false,
          can_update: false,
          can_delete: false,
          scope: 'all' as const,
          [action]: true
        };
        next = [...prev, newPerm];
      }
      
      setIsDirty(true);
      return next;
    });
  };

  const setScope = (role: string, resource: string, scope: 'all' | 'own') => {
    setPermissions(prev => {
      const existing = prev.find(p => p.role === role && p.resource === resource);
      let next: RolePermission[];
      
      if (existing) {
        next = prev.map(p => {
          if (p.role === role && p.resource === resource) {
            return { ...p, scope };
          }
          return p;
        });
      } else {
        const newPerm: RolePermission = {
          role,
          resource,
          can_view: false,
          can_create: false,
          can_update: false,
          can_delete: false,
          scope
        };
        next = [...prev, newPerm];
      }
      
      setIsDirty(true);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all permissions
      const { error: upsertError } = await supabase
        .from('role_permissions')
        .upsert(permissions, { onConflict: 'role,resource' });

      if (upsertError) throw upsertError;
      
      setShowSuccess(true);
      setIsDirty(false);
      await refreshProfile(); // Refresh current user's profile/cache
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('[RBAC] Save error:', err);
      alert('Erro ao salvar: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !permsLoading) {
    return (
      <div className="glass p-20 rounded-[40px] border border-rose-500/10 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
          <Lock size={40} />
        </div>
        <div className="space-y-2 max-w-md">
          <h4 className="text-xl font-black text-white uppercase tracking-wider">Acesso Restrito</h4>
          <p className="text-white/40 font-medium text-sm leading-relaxed">
            Você não tem permissão para gerenciar a matriz de acessos do sistema. Entre em contato com a administração.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 border-4 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Carregando Matriz</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass glass-reflection p-8 rounded-[40px] border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500">
          <ShieldCheck size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Gestão de Acessos</h3>
          <p className="text-white/40 font-bold text-sm mt-1 tracking-tight">
            Níveis de permissão e regras de segurança baseadas em papéis (RBAC).
          </p>
        </div>
        <button 
          onClick={fetchPermissions}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {error ? (
        <div className="p-12 glass rounded-[40px] border border-rose-500/20 text-center space-y-4">
          <AlertTriangle size={48} className="text-rose-500 mx-auto" />
          <h4 className="text-lg font-black text-white uppercase tracking-widest">{error}</h4>
          <p className="text-sm text-white/40 font-medium">Verifique se as tabelas de RBAC foram criadas no Supabase.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {ROLES.map((role) => (
            <div key={role} className="glass p-8 rounded-[40px] border border-white/5 relative overflow-hidden">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-[#FFD600]">
                    <UserCheck size={20} />
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-widest">{role}</h4>
               </div>

               <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="text-left py-4 px-4">Recurso</th>
                      <th className="py-4 px-4"><div className="flex flex-col items-center gap-1"><Eye size={14} /><span>Ver</span></div></th>
                      <th className="py-4 px-4"><div className="flex flex-col items-center gap-1"><PlusSquare size={14} /><span>Criar</span></div></th>
                      <th className="py-4 px-4"><div className="flex flex-col items-center gap-1"><Edit size={14} /><span>Editar</span></div></th>
                      <th className="py-4 px-4"><div className="flex flex-col items-center gap-1"><Trash2 size={14} /><span>Excluir</span></div></th>
                      <th className="py-4 px-4">Escopo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {RESOURCES.map(res => {
                      const p = findPerm(role, res);
                      return (
                        <tr key={res} className="group hover:bg-white/[0.02] transition-all">
                          <td className="py-6 px-4">
                            <span className="text-sm font-black text-white uppercase tracking-wider group-hover:text-[#FFD600] transition-colors">{res === 'rbac' ? 'Permissões' : res}</span>
                          </td>
                          {[
                            { act: 'can_view', color: '#FFD600' },
                            { act: 'can_create', color: '#3b82f6' },
                            { act: 'can_update', color: '#10b981' },
                            { act: 'can_delete', color: '#f43f5e' }
                          ].map(action => (
                            <td key={action.act} className="py-6 px-4 text-center">
                              <button
                                onClick={() => togglePerm(role, res, action.act as any)}
                                className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center mx-auto ${
                                  (p as any)[action.act] 
                                    ? `bg-white/10 border-white/20 text-white` 
                                    : 'bg-transparent border-white/5 text-white/10 hover:border-white/20'
                                }`}
                                style={ (p as any)[action.act] ? { color: action.color, borderColor: `${action.color}40`, backgroundColor: `${action.color}10` } : {} }
                              >
                                {(p as any)[action.act] && <Check size={16} strokeWidth={3} />}
                              </button>
                            </td>
                          ))}
                          <td className="py-6 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => setScope(role, res, 'all')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${
                                  p.scope === 'all' 
                                    ? 'bg-[#FFD600] border-[#FFD600] text-[#0A0F2C]' 
                                    : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                              >
                                <Globe size={10} />
                                Tudo
                              </button>
                              <button 
                                onClick={() => setScope(role, res, 'own')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${
                                  p.scope === 'own' 
                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                    : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                              >
                                <User size={10} />
                                Próprio
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Save Bar */}
      <AnimatePresence>
        {isDirty && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
          >
            <div className="glass glass-reflection p-6 rounded-[32px] border border-[#FFD600]/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6 backdrop-blur-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFD600]/10 flex items-center justify-center text-[#FFD600]">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h5 className="text-sm font-black text-white uppercase tracking-wider">Alterações Pendentes</h5>
                  <p className="text-[10px] text-white/40 font-bold">Você modificou a matriz de acesso.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchPermissions}
                  className="px-6 py-3 rounded-2xl text-[10px] font-black text-white/60 uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Descartar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#FFD600] text-[#0A0F2C] px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,214,0,0.3)] hover:shadow-[0_0_40px_rgba(255,214,0,0.5)] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-[#0A0F2C]/30 border-t-[#0A0F2C] rounded-full animate-spin" /> : <Save size={16} />}
                  Salvar Matriz
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 z-[60]">
            <Check size={20} /> Permissões Atualizadas com Sucesso!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass p-8 rounded-[32px] border border-white/5 flex items-start gap-4 bg-white/[0.02]">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
          <ShieldAlert size={18} className="text-amber-500" />
        </div>
        <div className="space-y-2">
          <h4 className="font-black text-white uppercase tracking-widest text-xs">Atenção Crítica</h4>
          <p className="text-sm text-white/40 font-medium leading-relaxed">
            Alterar a matriz de permissões afeta instantaneamente todos os usuários vinculados aos papéis modificados. 
            Usuários com papel <b>admin</b>, <b>DONA</b> ou <b>OWNER</b> possuem bypass total em todas as verificações de segurança.
          </p>
        </div>
      </div>
    </div>
  );
}
function ShieldAlert(props: any) {
  return <ShieldCheck {...props} className={props.className + " text-amber-500"} />
}
