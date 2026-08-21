'use client';

import React, { useState, useEffect } from 'react';
import { Save, MessageSquare, Info, CheckCircle2, XCircle, Database, RefreshCw, Landmark, HelpCircle, Gift, Copy, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_TOMORROW_REQ = `Olá {name}, você tem uma consulta amanhã às {time}. Confirma presença?`;
const DEFAULT_TOMORROW_SUCCESS = `Perfeito, {name}! Sua consulta de amanhã às {time} está confirmada.`;
const DEFAULT_TODAY_REMINDER = `Olá {name}, lembrando da sua consulta hoje às {time} com {professional_name}.`;

const DEFAULT_BIRTHDAY_TEMPLATE = `Olá {primeiro_nome}! 🎉

Toda a equipe da clínica deseja um feliz aniversário!

Que seu novo ciclo seja repleto de saúde, felicidade e realizações.

Parabéns pelo seu dia! 🎂`;

const DEFAULT_FRIENDLY_COLLECTION = `Olá {name}, tudo bem?

Estamos entrando em contato para lembrar que existe um pagamento pendente referente ao seu atendimento.

Qualquer dúvida estamos à disposição.`;

const DEFAULT_BILLING_DUE = `Olá {name}.

Passando para lembrar que seu pagamento vence em {data_vencimento}.`;

const DEFAULT_PAYMENT_CONFIRMATION = `Pagamento recebido com sucesso.

Agradecemos pela confiança.`;

const DEFAULT_PROLONGED_REQUEST = `Olá {name}, tudo bem? Percebemos que sua consulta recente com {professional_name} necessita de um tempo adicional de atendimento para sua conclusão. Gostaríamos de solicitar sua disponibilidade de data e horário para agendarmos essa continuação clínica.`;

const DEFAULT_PROLONGED_CONFIRMED = `Olá {name}, tudo bem? Confirmamos o agendamento da continuação do seu atendimento para o dia {DATA} às {HORÁRIO} com {professional_name}. Até lá!`;

type TemplateTab = 'patients' | 'financial';

export default function ReminderSettingsPanel() {
  const { profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<TemplateTab>('patients');

  // Patient Templates
  const [tomorrowReq, setTomorrowReq] = useState('');
  const [tomorrowSuccess, setTomorrowSuccess] = useState('');
  const [todayReminder, setTodayReminder] = useState('');
  const [birthdayTemplate, setBirthdayTemplate] = useState('');
  const [prolongedRequest, setProlongedRequest] = useState('');
  const [prolongedConfirmed, setProlongedConfirmed] = useState('');
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  // Financial Templates
  const [friendlyCollection, setFriendlyCollection] = useState('');
  const [billingDueReminder, setBillingDueReminder] = useState('');
  const [paymentReceivedConfirmation, setPaymentReceivedConfirmation] = useState('');

  const [loading, setLoading] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Load custom financial templates from localStorage first as local defaults
        const localFriendly = localStorage.getItem('friendly_collection_template');
        const localDue = localStorage.getItem('billing_due_reminder_template');
        const localReceived = localStorage.getItem('payment_received_confirmation_template');
        const localBirthday = localStorage.getItem('birthday_template');
        const localProlongedRequest = localStorage.getItem('prolonged_request_template');
        const localProlongedConfirmed = localStorage.getItem('prolonged_confirmed_template');

        setFriendlyCollection(localFriendly || DEFAULT_FRIENDLY_COLLECTION);
        setBillingDueReminder(localDue || DEFAULT_BILLING_DUE);
        setPaymentReceivedConfirmation(localReceived || DEFAULT_PAYMENT_CONFIRMATION);
        setBirthdayTemplate(localBirthday || DEFAULT_BIRTHDAY_TEMPLATE);
        setProlongedRequest(localProlongedRequest || DEFAULT_PROLONGED_REQUEST);
        setProlongedConfirmed(localProlongedConfirmed || DEFAULT_PROLONGED_CONFIRMED);

        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .limit(1);

        if (error) {
          if (error.code === '42703') {
            setIsSchemaMissing(true);
            setDbError(true);
          } else {
            throw error;
          }
        }

        if (data && data.length > 0) {
          const settings = data[0];
          
          if (!('friendly_collection_template' in settings) || !('birthday_template' in settings)) {
            setIsSchemaMissing(true);
          }
          setTomorrowReq(settings.tomorrow_confirmation_request_template || settings.tomorrow_message_template || '');
          setTomorrowSuccess(settings.tomorrow_confirmation_success_template || '');
          setTodayReminder(settings.today_reminder_template || settings.today_message_template || '');
          if (settings.birthday_template) setBirthdayTemplate(settings.birthday_template);
          if (settings.prolonged_request_template) setProlongedRequest(settings.prolonged_request_template);
          if (settings.prolonged_confirmed_template) setProlongedConfirmed(settings.prolonged_confirmed_template);
          
          // If stored in database, let's use them
          if (settings.friendly_collection_template) setFriendlyCollection(settings.friendly_collection_template);
          if (settings.billing_due_reminder_template) setBillingDueReminder(settings.billing_due_reminder_template);
          if (settings.payment_received_confirmation_template) setPaymentReceivedConfirmation(settings.payment_received_confirmation_template);
        }
      } catch (error: any) {
        console.warn('Busca de configurações finalizada:', error?.message || error);
        if (error.message?.includes('API key') || error.code === 'PGRST111') {
          setApiKeyError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!profile || (profile.role !== 'DONA' && profile.role !== 'admin' && profile.role !== 'SECRETARIA')) {
      alert('Acesso negado: Somente administradores ou secretárias podem alterar configurações.');
      return;
    }
    
    setSaving(true);
    try {
      // 1. Always protect local storage save so they are preserved
      localStorage.setItem('friendly_collection_template', friendlyCollection);
      localStorage.setItem('billing_due_reminder_template', billingDueReminder);
      localStorage.setItem('payment_received_confirmation_template', paymentReceivedConfirmation);
      localStorage.setItem('birthday_template', birthdayTemplate);
      localStorage.setItem('prolonged_request_template', prolongedRequest);
      localStorage.setItem('prolonged_confirmed_template', prolongedConfirmed);

      const payload: any = {
        id: 1,
        tomorrow_confirmation_request_template: tomorrowReq,
        tomorrow_confirmation_success_template: tomorrowSuccess,
        today_reminder_template: todayReminder,
        today_message_template: todayReminder,
        tomorrow_message_template: tomorrowReq,
        friendly_collection_template: friendlyCollection,
        billing_due_reminder_template: billingDueReminder,
        payment_received_confirmation_template: paymentReceivedConfirmation,
        birthday_template: birthdayTemplate,
        prolonged_request_template: prolongedRequest,
        prolonged_confirmed_template: prolongedConfirmed,
        updated_at: new Date().toISOString()
      };

      const { data: updateData, error: updateError } = await supabase
        .from('settings')
        .update(payload)
        .eq('id', 1)
        .select();

      const noRowsUpdated = !updateData || updateData.length === 0;

      if (noRowsUpdated && !updateError) {
        await supabase.from('settings').insert(payload);
      } else if (updateError) {
        if (updateError.code === '42703' || updateError.message?.includes('column')) {
           setIsSchemaMissing(true);
           throw new Error('Colunas ausentes no banco de dados. Atualize o banco primeiro.');
        }
        throw updateError;
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Settings save error:', error);
      alert('Erro ao salvar no banco (as alterações locais foram preservadas): ' + (error.message || JSON.stringify(error)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-12 h-12 border-4 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (apiKeyError) return <div className="p-8 glass rounded-3xl border border-rose-500/20 text-center uppercase tracking-widest text-white/60 font-black">Chave de API Inválida</div>;
  if (dbError) return <div className="p-8 glass rounded-3xl border border-rose-500/20 text-center uppercase tracking-widest text-white/60 font-black">Estrutura do Banco Desatualizada</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Migration Warning */}
      {isSchemaMissing && (
        <div className="glass p-8 md:p-10 rounded-[32px] border border-sky-500/20 w-full space-y-6 relative overflow-hidden text-left mb-8">
          <div className="absolute top-0 right-0 w-40 h-40 bg-sky-600/10 rounded-full blur-3xl -z-10" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Atualização Necessária</h3>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Configuração de Banco de Dados</p>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-transparent" />

          <p className="text-sm text-white/70 leading-relaxed font-medium">
            Para que os novos templates (Aniversário, Cobranças Financeiras e Prolongamentos) sejam salvos corretamente, é necessário adicionar as novas colunas na tabela de configurações.
          </p>

          <div className="space-y-3">
            <h4 className="text-white/90 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
              <span>Passo a Passo para Ativação:</span>
            </h4>
            <ol className="list-decimal list-inside text-white/50 text-xs space-y-2 pl-1 leading-relaxed">
              <li>Copie o script SQL abaixo.</li>
              <li>Abra o <strong>Painel do Supabase</strong> do seu projeto e vá em <strong>SQL Editor</strong>.</li>
              <li>Crie uma nova query, cole o código e clique em <strong>Run</strong>.</li>
              <li>Recarregue esta página após aplicar a alteração!</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Script SQL de Migração</span>
              <button
                type="button"
                onClick={() => {
                  const sql = `-- Adicionar colunas de templates financeiros e de aniversário\nALTER TABLE public.settings ADD COLUMN IF NOT EXISTS friendly_collection_template TEXT;\nALTER TABLE public.settings ADD COLUMN IF NOT EXISTS billing_due_reminder_template TEXT;\nALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_received_confirmation_template TEXT;\nALTER TABLE public.settings ADD COLUMN IF NOT EXISTS birthday_template TEXT;`;
                  navigator.clipboard.writeText(sql);
                  alert('SQL copiado para a área de transferência!');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <Copy size={12} />
                <span>Copiar SQL</span>
              </button>
            </div>
            <div className="bg-[#0A0F2C] border border-white/5 rounded-xl p-4 font-mono text-[10px] text-sky-200/70 overflow-x-auto">
              <pre className="whitespace-pre-wrap">{`ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS friendly_collection_template TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS billing_due_reminder_template TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_received_confirmation_template TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS birthday_template TEXT;`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Sub tabs selector */}
      <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('patients')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'patients'
              ? 'bg-[#FFD600] text-[#0A0F2C] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare size={16} />
          <span>Mensagens de Pacientes</span>
        </button>
        <button
          onClick={() => setActiveSubTab('financial')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'financial'
              ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Landmark size={16} />
          <span>Mensagens Financeiras</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="wait">
          {activeSubTab === 'patients' ? (
            <motion.div 
              key="patients-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {[
                { label: 'Confirmação (1 dia antes)', value: tomorrowReq, setter: setTomorrowReq, placeholder: DEFAULT_TOMORROW_REQ, icon: MessageSquare, color: '#FFD600', vars: ['{name}', '{time}', '{date}', '{professional_name}', '{DIA_INTELIGENTE}'] },
                { label: 'Confirmação recebida (1 dia antes)', value: tomorrowSuccess, setter: setTomorrowSuccess, placeholder: DEFAULT_TOMORROW_SUCCESS, icon: CheckCircle2, color: '#10b981', vars: ['{name}', '{time}', '{date}'] },
                { label: 'Lembrete no dia', value: todayReminder, setter: setTodayReminder, placeholder: DEFAULT_TODAY_REMINDER, icon: Info, color: '#6366f1', vars: ['{name}', '{time}', '{date}', '{professional_name}'] },
                { label: 'Aniversário', value: birthdayTemplate, setter: setBirthdayTemplate, placeholder: DEFAULT_BIRTHDAY_TEMPLATE, icon: Gift, color: '#ec4899', vars: ['{nome}', '{primeiro_nome}'] },
                { label: 'Consulta Prolongada (Solicitação de Data)', value: prolongedRequest, setter: setProlongedRequest, placeholder: DEFAULT_PROLONGED_REQUEST, icon: MessageSquare, color: '#0ea5e9', vars: ['{name}', '{professional_name}'] },
                { label: 'Consulta Prolongada Confirmada', value: prolongedConfirmed, setter: setProlongedConfirmed, placeholder: DEFAULT_PROLONGED_CONFIRMED, icon: CheckCircle2, color: '#3b82f6', vars: ['{name}', '{DATA}', '{HORÁRIO}', '{professional_name}'] }
              ].map((item, idx) => (
                <div key={idx} className="glass glass-reflection p-8 rounded-[40px] border border-white/5 relative overflow-hidden group">
                  <div 
                    className="absolute -right-10 -top-10 w-40 h-40 blur-[80px] opacity-10 transition-all group-hover:opacity-20"
                    style={{ backgroundColor: item.color }}
                  />
                  
                  <div className="flex items-center gap-5 mb-8 relative z-10">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-all group-hover:scale-110"
                      style={{ backgroundColor: `${item.color}10`, borderColor: `${item.color}20`, color: item.color }}
                    >
                      <item.icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-wider">{item.label}</h3>
                      <p className="text-white/40 font-bold text-xs mt-0.5 tracking-tight">Template da mensagem de paciente.</p>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <textarea
                      value={item.value}
                      onChange={(e) => item.setter(e.target.value)}
                      placeholder={item.placeholder}
                      className="w-full h-40 p-6 bg-white/5 border border-white/10 rounded-[24px] focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all resize-none font-bold text-white leading-relaxed placeholder:text-white/10"
                    />
                    
                    <div className="flex flex-wrap gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      {item.vars.map((v) => (
                        <button 
                          key={v} 
                          onClick={() => item.setter(item.value + v)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-black text-[#FFD600] text-[10px] tracking-wider transition-all hover:bg-[#FFD600] hover:text-[#0A0F2C]"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="financial-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {[
                { label: 'Cobrança amigável', value: friendlyCollection, setter: setFriendlyCollection, placeholder: DEFAULT_FRIENDLY_COLLECTION, icon: Landmark, color: '#10b981', desc: 'Enviada para avisar de cobranças e receber de forma tranquila.', vars: ['{name}', '{value}'] },
                { label: 'Lembrete de vencimento', value: billingDueReminder, setter: setBillingDueReminder, placeholder: DEFAULT_BILLING_DUE, icon: Info, color: '#f59e0b', desc: 'Lembrar o vencimento que está próximo/amanhã.', vars: ['{name}', '{data_vencimento}', '{value}'] },
                { label: 'Confirmação de recebimento', value: paymentReceivedConfirmation, setter: setPaymentReceivedConfirmation, placeholder: DEFAULT_PAYMENT_CONFIRMATION, icon: CheckCircle2, color: '#3b82f6', desc: 'Agradecimento e recibo de quitação.', vars: ['{name}', '{value}'] }
              ].map((item, idx) => (
                <div key={idx} className="glass glass-reflection p-8 rounded-[40px] border border-emerald-500/10 bg-emerald-500/[0.01] relative overflow-hidden group">
                  <div 
                    className="absolute -right-10 -top-10 w-40 h-40 blur-[80px] opacity-10 transition-all group-hover:opacity-20"
                    style={{ backgroundColor: item.color }}
                  />
                  
                  <div className="flex items-center gap-5 mb-8 relative z-10">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-all group-hover:scale-110"
                      style={{ backgroundColor: `${item.color}10`, borderColor: `${item.color}20`, color: item.color }}
                    >
                      <item.icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-wider">{item.label}</h3>
                      <p className="text-white/40 font-bold text-xs mt-0.5 tracking-tight">{item.desc}</p>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <textarea
                      value={item.value}
                      onChange={(e) => item.setter(e.target.value)}
                      placeholder={item.placeholder}
                      className="w-full h-40 p-6 bg-white/5 border border-white/10 rounded-[24px] focus:ring-2 focus:ring-emerald-500/55 focus:border-emerald-500/55 outline-none transition-all resize-none font-bold text-white leading-relaxed placeholder:text-white/10"
                    />
                    
                    <div className="flex flex-wrap gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      {item.vars.map((v) => (
                        <button 
                          key={v} 
                          onClick={() => item.setter(item.value + v)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-black text-emerald-400 text-[10px] tracking-wider transition-all hover:bg-emerald-500 hover:text-white"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between p-8 glass rounded-[32px] border border-white/5 sticky bottom-4 z-20 backdrop-blur-3xl shadow-2xl">
        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.15em] max-w-xs">
          Dica: Se deixar os campos vazios, o sistema usará as mensagens padrão.
        </p>
        <div className="flex items-center gap-5">
          <AnimatePresence>
            {showSuccess && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                <CheckCircle2 size={16} /> Configurações Salvas!
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-4 px-12 rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.2)] hover:shadow-[0_0_30px_rgba(255,214,0,0.4)] transition-all active:scale-[0.98] flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0A0F2C]/30 border-t-[#0A0F2C]"></div>
            ) : (
              <>
                <Save size={20} />
                <span>Salvar Tudo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
