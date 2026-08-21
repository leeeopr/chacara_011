'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  TreePine, 
  Users, 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  DollarSign, 
  MapPin, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Tag,
  MessageSquare,
  UserCheck
} from 'lucide-react';
import { Chacara, Client, ReservationOrigin, ChacaraPricingRule, PricingBreakdownResult, CrewMember } from '@/lib/chacaraTypes';
import { getChacaras } from '@/services/chacarasService';
import { getClients, createClient } from '@/services/clientsService';
import { createReservation, checkAvailability } from '@/services/reservationsService';
import { pricingEngineService } from '@/services/pricingEngineService';
import { getCrewMembers } from '@/services/crewService';

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialChacaraId?: string;
  initialClientId?: string;
}

export default function NewReservationModal({
  isOpen,
  onClose,
  onSuccess,
  initialChacaraId,
  initialClientId
}: NewReservationModalProps) {
  // Step state: 1. Quem (Cliente) -> 2. Quando (Datas/Horários) -> 3. Onde (Chácara) -> 4. Financeiro & Finalizar
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Loaded Data
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rules, setRules] = useState<ChacaraPricingRule[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Selected State
  const [selectedChacara, setSelectedChacara] = useState<Chacara | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Search Terms
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [chacaraSearchTerm, setChacaraSearchTerm] = useState('');

  // Quick Client Creation
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Dates & Times
  const [checkinDate, setCheckinDate] = useState('');
  const [checkinTime, setCheckinTime] = useState('14:00');
  const [checkoutDate, setCheckoutDate] = useState('');
  const [checkoutTime, setCheckoutTime] = useState('12:00');
  
  // Availability check
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{ is_available: boolean; conflict_type: string } | null>(null);

  // Guests & Options
  const [adults, setAdults] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [infantsCount, setInfantsCount] = useState<number>(0);
  const [petsCount, setPetsCount] = useState<number>(0);
  const [isEvent, setIsEvent] = useState<boolean>(false);
  const [origin, setOrigin] = useState<ReservationOrigin>('WHATSAPP');
  const [specialRequests, setSpecialRequests] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Advanced options accordion toggle (Hidden by default)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Manual Price Adjustment State
  const [showManualAdjustment, setShowManualAdjustment] = useState(false);
  const [manualAdjustmentAmount, setManualAdjustmentAmount] = useState<number | ''>('');
  const [manualAdjustmentReason, setManualAdjustmentReason] = useState('');

  // Custom Price Override State (Valor Manual por Reserva)
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setStep(1);
      setErrorMessage('');
      setAvailabilityResult(null);
      setShowAdvancedOptions(false);
      setShowManualAdjustment(false);
      setManualAdjustmentAmount('');
      setManualAdjustmentReason('');
      setUseCustomPrice(false);
      setCustomPriceInput('');

      // Set default dates: tomorrow to +2 days
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 3);

      setCheckinDate(tomorrow.toISOString().split('T')[0]);
      setCheckoutDate(dayAfter.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [chData, clData, crData] = await Promise.all([
        getChacaras({ status: 'ATIVA' }),
        getClients(),
        getCrewMembers({ activeOnly: true })
      ]);
      setChacaras(chData || []);
      setClients(clData || []);
      setCrewMembers(crData || []);

      if (initialChacaraId) {
        const foundCh = chData.find(c => c.id === initialChacaraId);
        if (foundCh) handleSelectChacara(foundCh);
      }
      if (initialClientId) {
        const foundCl = clData.find(c => c.id === initialClientId);
        if (foundCl) setSelectedClient(foundCl);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do modal de reserva:', e);
    }
  };

  const handleSelectChacara = async (chacara: Chacara) => {
    setSelectedChacara(chacara);
    // Auto-fill times from Selected Chácara
    if (chacara.checkin_time) setCheckinTime(chacara.checkin_time);
    if (chacara.checkout_time) setCheckoutTime(chacara.checkout_time);
    
    try {
      const rList = await pricingEngineService.getPricingRules(chacara.id);
      setRules(rList);
    } catch (e) {
      console.warn('Erro ao carregar regras da chácara:', e);
      setRules([]);
    }
  };

  if (!isOpen) return null;

  // Handle Quick Client Creation
  const handleCreateQuickClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) {
      setErrorMessage('Preencha o nome e o WhatsApp do cliente.');
      return;
    }

    try {
      setErrorMessage('');
      const created = await createClient({
        full_name: newClientName,
        phone: newClientPhone
      });
      const updatedList = await getClients();
      setClients(updatedList);
      setSelectedClient(created);
      setIsAddingClient(false);
      setNewClientName('');
      setNewClientPhone('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar cliente.');
    }
  };

  // Perform availability validation when dates/chacara change
  const verifyDates = async () => {
    if (!selectedChacara || !checkinDate || !checkoutDate) return;
    setIsCheckingAvailability(true);
    try {
      const result = await checkAvailability(
        selectedChacara.id,
        checkinDate,
        checkinTime,
        checkoutDate,
        checkoutTime
      );
      setAvailabilityResult(result);
    } catch (e) {
      console.warn('Erro ao verificar disponibilidade:', e);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Calculate pricing breakdown via pricing engine
  const pricingBreakdown: PricingBreakdownResult = selectedChacara
    ? pricingEngineService.calculateReservationPrice(
        {
          chacara_id: selectedChacara.id,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          guests_adults: adults,
          guests_children: childrenCount,
          guests_pets: petsCount,
          is_event: isEvent,
          manual_adjustment_amount: manualAdjustmentAmount !== '' ? Number(manualAdjustmentAmount) : 0,
          manual_adjustment_reason: manualAdjustmentReason,
          custom_price: useCustomPrice && customPriceInput !== '' ? Number(customPriceInput) : null,
          is_custom_price: useCustomPrice && customPriceInput !== ''
        },
        selectedChacara,
        rules
      )
    : pricingEngineService.emptyResult({
        chacara_id: '',
        checkin_date: checkinDate,
        checkout_date: checkoutDate,
        guests_adults: adults,
        guests_children: childrenCount,
        custom_price: useCustomPrice && customPriceInput !== '' ? Number(customPriceInput) : null,
        is_custom_price: useCustomPrice && customPriceInput !== ''
      }, {});

  const handleNextStep = async () => {
    setErrorMessage('');
    if (step === 1) {
      // Step 1: Quem (Cliente)
      if (!selectedClient) {
        setErrorMessage('Por favor, selecione ou cadastre um cliente para prosseguir.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Step 2: Quando (Datas)
      if (!checkinDate || !checkoutDate) {
        setErrorMessage('Informe a data de check-in e check-out.');
        return;
      }
      if (checkinDate >= checkoutDate) {
        setErrorMessage('A data de saída deve ser posterior à data de entrada.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Step 3: Onde (Chácara)
      if (!selectedChacara) {
        setErrorMessage('Por favor, selecione a chácara para a reserva.');
        return;
      }
      verifyDates();
      setStep(4);
    }
  };

  const handleConfirmReservation = async () => {
    if (!selectedChacara || !selectedClient) return;

    if (showManualAdjustment && manualAdjustmentAmount !== '' && !manualAdjustmentReason.trim()) {
      setErrorMessage('Informe o motivo do ajuste manual de preço.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const codeGenerated = `REC-${Math.floor(1000 + Math.random() * 9000)}`;

      await createReservation(
        {
          chacara_id: selectedChacara.id,
          client_id: selectedClient.id,
          code: codeGenerated,
          checkin_date: checkinDate,
          checkin_time: checkinTime,
          checkout_date: checkoutDate,
          checkout_time: checkoutTime,
          guests_adults: adults,
          guests_children: childrenCount,
          guests_infants: infantsCount,
          guests_pets: petsCount,
          status: 'PRE_RESERVA',
          created_by: 'Atendimento',
          origin: origin,
          special_requests: specialRequests,
          internal_notes: internalNotes,
          staff_ids: selectedStaffIds,
          primary_staff_id: selectedStaffIds[0] || undefined,
          staff_names: selectedStaffIds.map(id => {
            const m = crewMembers.find(c => c.id === id);
            return m?.nome || 'Funcionário';
          }),
          custom_price: useCustomPrice && customPriceInput !== '' ? Number(customPriceInput) : null,
          is_custom_price: useCustomPrice && customPriceInput !== '',
          financial_summary: {
            daily_rates_subtotal: pricingBreakdown.daily_rates_subtotal,
            cleaning_fee: pricingBreakdown.cleaning_fee,
            deposit_amount: pricingBreakdown.deposit_amount,
            extra_guests_total: pricingBreakdown.extra_guests_total,
            pet_fee: pricingBreakdown.pet_fee,
            energy_fee: pricingBreakdown.energy_fee,
            event_fee: pricingBreakdown.event_fee,
            rule_discounts_total: pricingBreakdown.rule_discounts_total,
            rule_surcharges_total: pricingBreakdown.rule_surcharges_total,
            manual_adjustment_amount: pricingBreakdown.manual_adjustment_amount,
            manual_adjustment_reason: pricingBreakdown.manual_adjustment_reason,
            calculated_total: pricingBreakdown.calculated_total,
            custom_price: useCustomPrice && customPriceInput !== '' ? Number(customPriceInput) : null,
            is_custom_price: useCustomPrice && customPriceInput !== '',
            total_amount: pricingBreakdown.total_amount,
            paid_amount: 0,
            payment_status: 'PENDENTE',
            nights_count: pricingBreakdown.nights_count
          }
        },
        []
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao criar reserva:', err);
      setErrorMessage(err.message || 'Erro ao criar pré-reserva.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists for live search
  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    c.phone.includes(clientSearchTerm)
  );

  const filteredChacaras = chacaras.filter(ch => 
    ch.name.toLowerCase().includes(chacaraSearchTerm.toLowerCase()) ||
    ch.city?.toLowerCase().includes(chacaraSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full sm:max-w-2xl bg-[#0A0F2C] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[100vh] sm:max-h-[85vh] flex flex-col">
        
        {/* Header with Step Progress */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD600] p-2.5 rounded-2xl text-[#0A0F2C]">
              <CalendarCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Nova Pré-Reserva</h2>
              <div className="flex items-center gap-2 text-xs text-[#FFD600] font-bold">
                <span>Passo {step} de 4</span>
                <span className="text-white/30">•</span>
                <span className="text-white/70">
                  {step === 1 && 'Etapa 1: Quem? (Cliente)'}
                  {step === 2 && 'Etapa 2: Quando? (Datas e Horários)'}
                  {step === 3 && 'Etapa 3: Onde? (Escolher Chácara)'}
                  {step === 4 && 'Etapa 4: Financeiro e Confirmar'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-1.5 shrink-0">
          <div 
            className="bg-[#FFD600] h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* STEP 1: QUEM (CLIENTE) */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <User size={18} className="text-[#FFD600]" />
                    Quem é o cliente responsável?
                  </h3>
                  <p className="text-xs text-white/50">Pesquise pelo nome/telefone ou adicione rapidamente</p>
                </div>
                {!isAddingClient && (
                  <button
                    type="button"
                    onClick={() => setIsAddingClient(true)}
                    className="px-3 py-1.5 bg-[#FFD600]/10 hover:bg-[#FFD600]/20 border border-[#FFD600]/30 text-[#FFD600] text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Plus size={14} />
                    <span>Novo Cliente</span>
                  </button>
                )}
              </div>

              {/* Quick Add Client Inline Form */}
              {isAddingClient ? (
                <div className="p-4 bg-white/5 border border-[#FFD600]/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#FFD600]">Cadastro Rápido de Cliente</span>
                    <button 
                      onClick={() => setIsAddingClient(false)}
                      className="text-xs text-white/50 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase">Nome Completo *</label>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ex: Maria Souza"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase">WhatsApp *</label>
                      <input
                        type="text"
                        placeholder="(11) 99999-8888"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] outline-none mt-1"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateQuickClient}
                    className="w-full bg-[#FFD600] text-[#0A0F2C] py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#FFE500]"
                  >
                    Salvar e Selecionar Cliente
                  </button>
                </div>
              ) : (
                <>
                  {/* Search Input */}
                  <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Pesquisar cliente por nome ou WhatsApp..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#FFD600] outline-none transition-all"
                    />
                  </div>

                  {/* Client Cards List */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {filteredClients.map(client => {
                      const isSelected = selectedClient?.id === client.id;
                      return (
                        <div
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'bg-[#FFD600]/15 border-[#FFD600] text-white shadow-lg' 
                              : 'bg-white/5 border-white/10 hover:border-white/25 text-white/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-[#FFD600] text-[#0A0F2C]' : 'bg-white/10 text-white'}`}>
                              <User size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{client.full_name}</p>
                              <p className="text-xs text-white/50">{client.phone}</p>
                            </div>
                          </div>
                          {isSelected && <Check size={20} className="text-[#FFD600]" />}
                        </div>
                      );
                    })}

                    {filteredClients.length === 0 && (
                      <div className="text-center py-8 text-white/40 text-xs">
                        Nenhum cliente encontrado. Clique em "Novo Cliente" acima para cadastrar.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: QUANDO (DATAS E HORÁRIOS) */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-[#FFD600]" />
                  Quando será a hospedagem?
                </h3>
                <p className="text-xs text-white/50">Defina as datas de check-in e check-out</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Check-in Card */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-[#FFD600] uppercase tracking-wider block">Check-in (Entrada)</span>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={checkinDate}
                      onChange={(e) => setCheckinDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#FFD600] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Horário Padrão</label>
                    <input
                      type="time"
                      value={checkinTime}
                      onChange={(e) => setCheckinTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#FFD600] outline-none"
                    />
                  </div>
                </div>

                {/* Check-out Card */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Check-out (Saída)</span>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={checkoutDate}
                      onChange={(e) => setCheckoutDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#FFD600] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Horário Padrão</label>
                    <input
                      type="time"
                      value={checkoutTime}
                      onChange={(e) => setCheckoutTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#FFD600] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Night calculation summary badge */}
              {checkinDate && checkoutDate && checkinDate < checkoutDate && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-300 text-xs font-bold">
                  🗓️ Período selecionado: {pricingBreakdown.nights_count} diária(s) / noitadas
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ONDE (CHÁCARA + AUTOPREENCHIMENTO) */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TreePine size={18} className="text-[#FFD600]" />
                  Qual chácara deseja reservar?
                </h3>
                <p className="text-xs text-white/50">Diárias, taxas e regras são carregadas automaticamente</p>
              </div>

              {/* Chácara Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Pesquisar chácara por nome..."
                  value={chacaraSearchTerm}
                  onChange={(e) => setChacaraSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#FFD600] outline-none transition-all"
                />
              </div>

              {/* Chácaras Cards List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto custom-scrollbar">
                {filteredChacaras.map(ch => {
                  const isSelected = selectedChacara?.id === ch.id;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleSelectChacara(ch)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-[#FFD600]/15 border-[#FFD600] text-white shadow-lg' 
                          : 'bg-white/5 border-white/10 hover:border-white/25 text-white/80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-black text-white">{ch.name}</p>
                          <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} /> {ch.city || 'Sem cidade'}
                          </p>
                        </div>
                        {isSelected && <Check size={18} className="text-[#FFD600]" />}
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
                        <span>Capacidade: {ch.capacity_people} pessoas</span>
                        <span className="font-bold text-[#FFD600]">R$ {ch.daily_rate_standard}/dia</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Availability check feedback */}
              {isCheckingAvailability && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300">
                  Verificando disponibilidade de agenda...
                </div>
              )}
              {availabilityResult && !availabilityResult.is_available && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Chácara indisponível nesta data ({availabilityResult.conflict_type})</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: FINANCEIRO & CONFIRMAÇÃO + CAMPOS AVANÇADOS RECOLHIDOS */}
          {step === 4 && selectedChacara && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign size={18} className="text-[#FFD600]" />
                  Resumo do Valor & Confirmação
                </h3>
                <p className="text-xs text-white/50">Cálculo automático de diárias e taxas</p>
              </div>

              {/* Financial Summary Card */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal Diárias ({pricingBreakdown.nights_count} noites)</span>
                  <span className="font-bold text-white">R$ {pricingBreakdown.daily_rates_subtotal.toFixed(2)}</span>
                </div>
                {pricingBreakdown.cleaning_fee > 0 && (
                  <div className="flex justify-between text-white/70">
                    <span>Taxa de Limpeza</span>
                    <span className="font-bold text-white">R$ {pricingBreakdown.cleaning_fee.toFixed(2)}</span>
                  </div>
                )}
                {pricingBreakdown.deposit_amount > 0 && (
                  <div className="flex justify-between text-white/70">
                    <span>Caução Reembolsável</span>
                    <span className="font-bold text-white">R$ {pricingBreakdown.deposit_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-black text-[#FFD600]">
                  <span>VALOR TOTAL ESTIMADO</span>
                  <div className="text-right">
                    <span>R$ {pricingBreakdown.total_amount.toFixed(2)}</span>
                    {useCustomPrice && (
                      <span className="block text-[10px] font-bold text-purple-300">Valor negociado / manual</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Price Override Box (Valor Manual da Reserva) */}
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-[#FFD600]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Valor Manual / Personalizado</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomPrice}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseCustomPrice(checked);
                        if (checked && customPriceInput === '') {
                          setCustomPriceInput(pricingBreakdown.calculated_total || pricingBreakdown.total_amount);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                {useCustomPrice && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2">
                    <p className="text-[11px] text-purple-200">
                      Defina o valor negociado para esta reserva. O valor padrão da chácara e de outras reservas não será alterado.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-300">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ex: 1300.00"
                        value={customPriceInput}
                        onChange={(e) => setCustomPriceInput(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full bg-black/40 border border-purple-400/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#FFD600] outline-none"
                      />
                    </div>
                    <div className="text-[10px] text-white/50 flex justify-between pt-1 border-t border-purple-500/20">
                      <span>Preço calculado: R$ {pricingBreakdown.calculated_total.toFixed(2)}</span>
                      <span className="text-purple-300 font-bold">★ Valor Manual Ativo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Seleção de Funcionários Responsáveis */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[#FFD600]" />
                    Equipe / Funcionário(s) Responsável(is)
                  </span>
                  <span className="text-[10px] text-white/50">
                    {selectedStaffIds.length === 0 ? 'Nenhum selecionado' : `${selectedStaffIds.length} selecionado(s)`}
                  </span>
                </label>
                <p className="text-[11px] text-white/50">
                  Selecione quem executará os serviços e acompanhamento desta reserva:
                </p>
                {crewMembers.length === 0 ? (
                  <p className="text-xs text-white/40 italic py-1">Nenhum funcionário ativo cadastrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {crewMembers.map(member => {
                      const isSelected = selectedStaffIds.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedStaffIds(prev => prev.filter(id => id !== member.id));
                            } else {
                              setSelectedStaffIds(prev => [...prev, member.id]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFD600] text-[#070A1E] font-bold shadow-md shadow-[#FFD600]/20'
                              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10'
                          }`}
                        >
                          <Users size={13} />
                          <span>{member.nome}</span>
                          {isSelected && <Check size={13} className="stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hóspedes Básicos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Adultos</label>
                  <input
                    type="number"
                    min="1"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:border-[#FFD600] outline-none"
                  />
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Crianças</label>
                  <input
                    type="number"
                    min="0"
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:border-[#FFD600] outline-none"
                  />
                </div>
              </div>

              {/* CAMPOS AVANÇADOS ESCONDIDOS (ACCORDION) */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-4 py-3 text-xs font-bold text-white/70 hover:text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-[#FFD600]" />
                    ▼ Mais opções (Observações, Origem, Ajuste Manual)
                  </span>
                  {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Bebês</label>
                        <input
                          type="number"
                          min="0"
                          value={infantsCount}
                          onChange={(e) => setInfantsCount(Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFD600] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Pets</label>
                        <input
                          type="number"
                          min="0"
                          value={petsCount}
                          onChange={(e) => setPetsCount(Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFD600] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Origem do Contato</label>
                      <select
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value as ReservationOrigin)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD600] outline-none"
                      >
                        <option value="WHATSAPP" className="bg-[#0A0F2C]">WhatsApp</option>
                        <option value="INSTAGRAM" className="bg-[#0A0F2C]">Instagram</option>
                        <option value="AIRBNB" className="bg-[#0A0F2C]">Airbnb</option>
                        <option value="INDICAÇÃO" className="bg-[#0A0F2C]">Indicação</option>
                        <option value="OUTRO" className="bg-[#0A0F2C]">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Pedidos Especiais / Observações</label>
                      <textarea
                        rows={2}
                        placeholder="Observações de horário, som, etc."
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD600] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Botões Grandes & Destacados) */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3 shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 max-w-[240px] bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              <span>Próximo Passo</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmReservation}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#0A0F2C] font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Salvar Pré-Reserva</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
