'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  Search, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Percent, 
  HelpCircle, 
  X, 
  Plus, 
  FileText, 
  Ban, 
  Briefcase, 
  Calculator, 
  Users, 
  Info,
  Sliders,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Edit2,
  Table,
  List,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileCode,
  Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { billingsService } from '@/services/billingsService';
import { companiesService } from '@/services/companiesService';
import { companyPricesService } from '@/services/companyPricesService';
import { weeklyClosingsService } from '@/services/weeklyClosingsService';
import { useAuth } from '@/contexts/AuthContext';
import { Billing, BillingStatus, PaymentMethod, Company, BillingTransaction, AppointmentType, WeeklyClosing } from '@/lib/types';
import CompaniesManagement from '@/components/CompaniesManagement';
import CompanyPricesManagement from '@/components/CompanyPricesManagement';

type SubTab = 'dashboard' | 'cobrancas' | 'pagamentos' | 'empresas' | 'precos' | 'fechamentos';

export default function FinanceiroTab() {
  const { profile } = useAuth();
  
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
  
  // Data states
  const [billings, setBillings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [companyPrices, setCompanyPrices] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localRefresh, setLocalRefresh] = useState(0);

  // Filters State for Billings (Cobranças)
  const [statusFilter, setStatusFilter] = useState<BillingStatus | 'ALL'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string | 'ALL' | 'PARTICULAR'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters State for Payments (Pagamentos)
  const [payStartDate, setPayStartDate] = useState('');
  const [payEndDate, setPayEndDate] = useState('');
  const [payCompanyFilter, setPayCompanyFilter] = useState<string | 'ALL' | 'PARTICULAR'>('ALL');
  const [payPatientSearch, setPayPatientSearch] = useState('');
  const [payProfFilter, setPayProfFilter] = useState<string | 'ALL'>('ALL');
  const [payMethodFilter, setPayMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');

  // Matrix Pricing Mode State
  const [pricesShowMatrix, setPricesShowMatrix] = useState(true);
  const [editingCell, setEditingCell] = useState<{ typeId: string; companyId: string | null } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState('');

  // Selected Billing Detail State
  const [selectedBilling, setSelectedBilling] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Payment register dialog
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentBilling, setPaymentBilling] = useState<any | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'PIX' as PaymentMethod,
    installments: 1,
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Invoice Number (NF) dialog
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceBilling, setInvoiceBilling] = useState<any | null>(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');

  // Weekly Closings (Fechamentos) State
  const [weeklyClosings, setWeeklyClosings] = useState<WeeklyClosing[]>([]);
  const [weeklyClosingsLoading, setWeeklyClosingsLoading] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState<any | null>(null);
  const [isClosingDetailModalOpen, setIsClosingDetailModalOpen] = useState(false);
  const [isGenerateClosingModalOpen, setIsGenerateClosingModalOpen] = useState(false);
  const [closingStartDate, setClosingStartDate] = useState('');
  const [closingEndDate, setClosingEndDate] = useState('');
  const [isClosingPreviewLoading, setIsClosingPreviewLoading] = useState(false);
  const [closingPreviewData, setClosingPreviewData] = useState<any | null>(null);
  const [generatingClosing, setGeneratingClosing] = useState(false);
  const [closingsError, setClosingsError] = useState('');
  
  // States for delete confirmation modal and local closing details errors
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [closingToDeleteId, setClosingToDeleteId] = useState<string | null>(null);
  const [deletingClosing, setDeletingClosing] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');
  const [closingDetailError, setClosingDetailError] = useState('');

  const loadWeeklyClosings = async () => {
    setWeeklyClosingsLoading(true);
    setClosingsError('');
    try {
      const closings = await weeklyClosingsService.getWeeklyClosings();
      setWeeklyClosings(closings);
    } catch (err) {
      console.error('Error fetching weekly closings:', err);
      setClosingsError('Erro ao carregar fechamentos semanais.');
    } finally {
      setWeeklyClosingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'fechamentos') {
      loadWeeklyClosings();
    }
  }, [activeSubTab, localRefresh]);

  const setDatePreset = (preset: 'CURRENT_WEEK' | 'PREVIOUS_WEEK') => {
    const now = new Date();
    const day = now.getDay();
    // Monday is 1, Sunday is 0. If day is 0, treat as 7.
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    let monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    
    if (preset === 'PREVIOUS_WEEK') {
      monday.setDate(monday.getDate() - 7);
    }
    
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    setClosingStartDate(monday.toISOString().split('T')[0]);
    setClosingEndDate(sunday.toISOString().split('T')[0]);
    setClosingPreviewData(null); // Reset preview
  };

  const handleCalculatePreview = async () => {
    if (!closingStartDate || !closingEndDate) {
      alert('Por favor, informe as datas de início e fim.');
      return;
    }
    setIsClosingPreviewLoading(true);
    setClosingPreviewData(null);
    try {
      const preview = await weeklyClosingsService.calculateClosingData(closingStartDate, closingEndDate);
      setClosingPreviewData(preview);
    } catch (err) {
      console.error('Error generating preview:', err);
      alert('Falha ao calcular prévia para o período selecionado.');
    } finally {
      setIsClosingPreviewLoading(false);
    }
  };

  const handleCreateClosing = async () => {
    if (!closingPreviewData) return;
    setGeneratingClosing(true);
    try {
      await weeklyClosingsService.createWeeklyClosing({
        period_start: closingPreviewData.period_start,
        period_end: closingPreviewData.period_end,
        closed_by: profile?.id,
        total_revenue: closingPreviewData.total_revenue,
        total_payout: closingPreviewData.total_payout,
        company_revenue: closingPreviewData.company_revenue,
        status: 'DRAFT',
        data_snapshot: closingPreviewData.data_snapshot
      });
      setIsGenerateClosingModalOpen(false);
      setClosingPreviewData(null);
      setClosingStartDate('');
      setClosingEndDate('');
      await loadWeeklyClosings();
    } catch (err) {
      console.error('Error creating closing:', err);
      alert('Falha ao criar o fechamento semanal.');
    } finally {
      setGeneratingClosing(false);
    }
  };

  const handleDeleteClosing = async () => {
    if (!closingToDeleteId) return;
    setDeletingClosing(true);
    setDeleteErrorMessage('');
    setDeleteSuccessMessage('');
    
    console.log('[DELETE] Attempting to delete weekly closing with ID:', closingToDeleteId);

    try {
      await weeklyClosingsService.deleteWeeklyClosing(closingToDeleteId);
      
      console.log('[DELETE] Successfully deleted closing ID:', closingToDeleteId);
      setDeleteSuccessMessage('Fechamento semanal excluído com sucesso!');
      
      // Keep open briefly to show success message, then close and refresh
      setTimeout(async () => {
        setIsDeleteConfirmModalOpen(false);
        setIsClosingDetailModalOpen(false);
        setSelectedClosing(null);
        setClosingToDeleteId(null);
        setDeleteSuccessMessage('');
        await loadWeeklyClosings();
      }, 1500);

    } catch (err: any) {
      console.error('[DELETE ERROR] Failed to delete closing. ID:', closingToDeleteId);
      console.error('[DELETE ERROR] Full error object:', err);
      
      const errMsg = err?.message || err?.details || JSON.stringify(err) || 'Erro desconhecido ao excluir o fechamento.';
      setDeleteErrorMessage(`Falha ao excluir o fechamento: ${errMsg}`);
    } finally {
      setDeletingClosing(false);
    }
  };

  const handleChangeClosingStatus = async (id: string, newStatus: string) => {
    setClosingDetailError('');
    try {
      await weeklyClosingsService.updateWeeklyClosing(id, {
        status: newStatus as any
      });
      if (selectedClosing && selectedClosing.id === id) {
        setSelectedClosing({
          ...selectedClosing,
          status: newStatus
        });
      }
      await loadWeeklyClosings();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setClosingDetailError(`Falha ao atualizar o status do fechamento: ${err?.message || 'Erro desconhecido.'}`);
    }
  };

  // Export handlers for Weekly Closing module
  const handleExportPDF = (closing: any) => {
    if (!closing) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const snapshot = closing.data_snapshot || {};
    const totals = snapshot.totals || {};
    const professionals = snapshot.professionals || [];
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const periodStr = `${new Date(closing.period_start + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(closing.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}`;

    let y = 15;
    const leftMargin = 15;
    const rightMargin = 195;
    const colWidth = (rightMargin - leftMargin);

    const addHeader = () => {
      doc.setDrawColor(255, 214, 0); // Gold
      doc.setLineWidth(1.5);
      doc.line(leftMargin, y, rightMargin, y);
      y += 8;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(10, 15, 44);
      doc.text('CLÍNICA DE FONOAUDIOLOGIA - SISTEMA DE FECHAMENTO', leftMargin, y);
      y += 6;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período de Fechamento: ${periodStr}`, leftMargin, y);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`Status: ${closing.status}`, 150, y - 6);
      
      y += 5;
      doc.setFont('Helvetica', 'normal');
      doc.text(`Data de Geração: ${dateStr}`, leftMargin, y);
      doc.text(`Responsável: ${closing.profiles?.full_name || 'Usuário do Sistema'}`, 150, y);
      y += 8;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, y, rightMargin, y);
      y += 10;
    };

    addHeader();

    // 1. Financial Summary Box
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(10, 15, 44);
    doc.text('RESUMO FINANCEIRO', leftMargin, y);
    y += 5;

    doc.setFillColor(245, 246, 250);
    doc.rect(leftMargin, y, colWidth, 20, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('Helvetica', 'normal');
    doc.text('RECEITA BRUTA', leftMargin + 10, y + 6);
    doc.text('REPASSE TOTAL', leftMargin + 65, y + 6);
    doc.text('RESULTADO LÍQUIDO', leftMargin + 120, y + 6);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(10, 15, 44);
    doc.text(fmtCurrency(closing.total_revenue), leftMargin + 10, y + 14);
    
    doc.setTextColor(220, 53, 69); // Red
    doc.text(fmtCurrency(closing.total_payout), leftMargin + 65, y + 14);
    
    doc.setTextColor(40, 167, 69); // Green
    doc.text(fmtCurrency(closing.total_revenue - closing.total_payout), leftMargin + 120, y + 14);

    y += 30;

    // 2. Professionals Table
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(10, 15, 44);
    doc.text('PRODUÇÃO POR PROFISSIONAL (FONOAUDIÓLOGOS)', leftMargin, y);
    y += 5;

    // Table Header
    doc.setFillColor(10, 15, 44);
    doc.rect(leftMargin, y, colWidth, 7, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Profissional', leftMargin + 3, y + 5);
    doc.text('Sessões', leftMargin + 55, y + 5);
    doc.text('Bruto', leftMargin + 75, y + 5);
    doc.text('Descontos', leftMargin + 100, y + 5);
    doc.text('Líquido', leftMargin + 125, y + 5);
    doc.text('Comissão Média', leftMargin + 150, y + 5);
    doc.text('Repasse', leftMargin + 175, y + 5);
    y += 7;

    // Table Body
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    professionals.forEach((p: any, idx: number) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(leftMargin, y, colWidth, 6, 'F');
      }
      
      doc.text(p.name || 'Sem Nome', leftMargin + 3, y + 4.5);
      doc.text(`${p.count || 0}`, leftMargin + 55, y + 4.5);
      doc.text(fmtCurrency(p.gross_total || 0), leftMargin + 75, y + 4.5);
      doc.text(fmtCurrency(p.discount_total || 0), leftMargin + 100, y + 4.5);
      doc.text(fmtCurrency(p.net_total || 0), leftMargin + 125, y + 4.5);
      doc.text(`${p.commission_rate_avg || 0}%`, leftMargin + 150, y + 4.5);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(fmtCurrency(p.payout_total || 0), leftMargin + 175, y + 4.5);
      doc.setFont('Helvetica', 'normal');

      y += 6;

      if (y > 270) {
        doc.addPage();
        y = 15;
        doc.setDrawColor(255, 214, 0);
        doc.setLineWidth(1.5);
        doc.line(leftMargin, y, rightMargin, y);
        y += 8;
      }
    });

    y += 8;

    // 3. Companies Production (Statistical)
    if (professionals.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 15;
        doc.setDrawColor(255, 214, 0);
        doc.setLineWidth(1.5);
        doc.line(leftMargin, y, rightMargin, y);
        y += 8;
      }

      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 15, 44);
      doc.text('PRODUÇÃO POR EMPRESA (ESTATÍSTICO/OPERACIONAL)', leftMargin, y);
      y += 6;

      professionals.forEach((p: any) => {
        if (y > 260) {
          doc.addPage();
          y = 15;
          doc.setDrawColor(255, 214, 0);
          doc.setLineWidth(1.5);
          doc.line(leftMargin, y, rightMargin, y);
          y += 8;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(10, 15, 44);
        doc.text(p.name, leftMargin, y);
        y += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);

        const production = p.company_production || {};
        const entries = Object.entries(production);
        if (entries.length === 0) {
          doc.text('Nenhum atendimento realizado.', leftMargin + 5, y);
          y += 5;
        } else {
          entries.forEach(([compName, count]) => {
            if (y > 270) {
              doc.addPage();
              y = 15;
              doc.setDrawColor(255, 214, 0);
              doc.setLineWidth(1.5);
              doc.line(leftMargin, y, rightMargin, y);
              y += 8;
            }
            doc.text(`${compName}: ${count} pacientes`, leftMargin + 5, y);
            y += 4.5;
          });
        }
        y += 3;
      });

      y += 8;
    }

    // 4. Footer Summary
    if (y > 250) {
      doc.addPage();
      y = 15;
      doc.setDrawColor(255, 214, 0);
      doc.setLineWidth(1.5);
      doc.line(leftMargin, y, rightMargin, y);
      y += 8;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, y, rightMargin, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(10, 15, 44);
    doc.text('TOTAL GERAL DO FECHAMENTO', leftMargin, y);
    y += 5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Receita Líquida Total: ${fmtCurrency(closing.total_revenue)}`, leftMargin, y);
    doc.text(`Repasse Total Consolidado: ${fmtCurrency(closing.total_payout)}`, leftMargin + 70, y);
    doc.text(`Resultado Clínico: ${fmtCurrency(closing.total_revenue - closing.total_payout)}`, leftMargin + 130, y);

    y += 10;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Relatório emitido pelo sistema de faturamento. Imutabilidade garantida via snapshot de aprovação.', leftMargin, y);
    doc.text(`Código Único do Fechamento: ${closing.id}`, leftMargin, y + 4);

    doc.save(`fechamento_${closing.period_start}_a_${closing.period_end}.pdf`);
  };

  const handleExportExcel = async (closing: any) => {
    if (!closing) return;
    const snapshot = closing.data_snapshot || {};
    const totals = snapshot.totals || {};
    const professionals = snapshot.professionals || [];

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Resumo Geral
    const wsSummary = workbook.addWorksheet('Resumo Geral');
    wsSummary.addRow(['RESUMO GERAL DO FECHAMENTO SEMANAL']);
    wsSummary.addRow([]);
    wsSummary.addRow(['Período', `${new Date(closing.period_start + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(closing.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}`]);
    wsSummary.addRow(['Status', closing.status]);
    wsSummary.addRow(['Responsável', closing.profiles?.full_name || 'Usuário do Sistema']);
    wsSummary.addRow(['Data de Criação', closing.created_at ? new Date(closing.created_at).toLocaleString('pt-BR') : '']);
    wsSummary.addRow([]);
    wsSummary.addRow(['Métrica', 'Valor']);
    wsSummary.addRow(['Receita Consolidada (Líquida)', closing.total_revenue]);
    wsSummary.addRow(['Repasse Consolidado', closing.total_payout]);
    wsSummary.addRow(['Resultado Clínico (Líquido)', closing.total_revenue - closing.total_payout]);
    wsSummary.addRow(['Total de Atendimentos', totals.appointments_count || 0]);

    // Sheet 2: Profissionais
    const wsProfs = workbook.addWorksheet('Profissionais');
    wsProfs.addRow(['Profissional', 'Atendimentos', 'Produção Bruta', 'Descontos', 'Produção Líquida', 'Comissão Média (%)', 'Valor do Repasse']);
    professionals.forEach((p: any) => {
      wsProfs.addRow([
        p.name,
        p.count,
        p.gross_total,
        p.discount_total,
        p.net_total,
        p.commission_rate_avg,
        p.payout_total
      ]);
    });

    // Sheet 3: Produção por Empresa (Estatístico)
    const wsComps = workbook.addWorksheet('Produção por Empresa');
    wsComps.addRow(['Profissional', 'Empresa/Particular', 'Quantidade (Pacientes)']);
    professionals.forEach((p: any) => {
      const prod = p.company_production || {};
      Object.entries(prod).forEach(([compName, count]) => {
        wsComps.addRow([p.name, compName, count]);
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento_${closing.period_start}_a_${closing.period_end}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = (closing: any) => {
    if (!closing) return;
    const snapshot = closing.data_snapshot || {};
    const professionals = snapshot.professionals || [];
    
    let csvContent = "\uFEFF"; // BOM for Excel UTF-8
    
    // Header
    csvContent += "Profissional;Sessoes;Bruto;Descontos;Liquido;Comissao_Media_Pct;Repasse\n";
    
    professionals.forEach((p: any) => {
      csvContent += `"${p.name}";${p.count};${p.gross_total || 0};${p.discount_total || 0};${p.net_total || 0};${p.commission_rate_avg || 0};${p.payout_total || 0}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fechamento_profissionais_${closing.period_start}_a_${closing.period_end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintClosing = () => {
    window.print();
  };

  // Load basic configurations
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [companiesList, typesRes, profilesRes] = await Promise.all([
          companiesService.getCompanies(),
          supabase.from('appointment_types').select('*').or('is_active.eq.true').order('name'),
          supabase.from('profiles').select('id, full_name, role').order('full_name')
        ]);
        setCompanies(companiesList);
        if (typesRes.data) setAppointmentTypes(typesRes.data as AppointmentType[]);
        if (profilesRes.data) setProfiles(profilesRes.data);
      } catch (err: any) {
        console.warn('Busca de configurações no Financeiro finalizada:', err?.message || err);
      }
    };
    fetchConfigs();
  }, [localRefresh]);

  // Load matrix prices when prices tab is active
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const list = await companyPricesService.getPrices();
        setCompanyPrices(list);
      } catch (err: any) {
        console.warn('Busca de matriz de preços finalizada:', err?.message || err);
      }
    };
    fetchPrices();
  }, [localRefresh, activeSubTab]);

  // Load core financial datasets (billings & transactions)
  useEffect(() => {
    const loadFinancialData = async () => {
      setLoading(true);
      try {
        // Fetch all billings (respect fono constraint if role is fono)
        const fono_id = profile?.role === 'FONO' ? profile.id : undefined;
        const bList = await billingsService.getBillings({ fono_id });
        setBillings(bList);

        // Fetch transactions (direct query on billing_transactions joining details)
        const { data: txs, error: txsErr } = await supabase
          .from('billing_transactions')
          .select(`
            *,
            billings (
              id,
              gross_total,
              discount_total,
              net_total,
              billing_company_id,
              companies ( id, name, limit_value, limit_type ),
              appointments (
                id,
                appointment_date,
                start_time,
                status,
                fono_id,
                agreed_price,
                discount_value,
                net_value,
                invoice_needed,
                billing_company_id,
                patients ( id, full_name, whatsapp ),
                profiles ( id, full_name, role ),
                appointment_types ( id, name ),
                companies ( id, name )
              )
            )
          `)
          .order('payment_date', { ascending: false });

        if (txsErr) throw txsErr;

        // Clean up or map role filter for FONO if active
        let filteredTxs = txs || [];
        if (fono_id) {
          filteredTxs = filteredTxs.filter(tx => tx.billings?.appointments?.fono_id === fono_id);
        }
        setTransactions(filteredTxs);
      } catch (err: any) {
        console.warn('Busca de dados do financeiro finalizada:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    loadFinancialData();
  }, [refreshKey, profile]);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setLocalRefresh(prev => prev + 1);
  };

  // High-fidelity dynamic KPI estimations cached on memo
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM

    let totalToReceive = 0;
    let overdueCount = 0;
    let overdueTotalAmount = 0;

    // Calculate billing-level balances dynamically
    billings.forEach(b => {
      const net = Number(b.appointments?.net_value ?? b.net_total ?? 0);
      
      // Calculate cleared payments for this specific billing
      const clearedVal = transactions
        .filter(t => t.billing_id === b.id && t.status === 'CLEARED')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const balance = Math.max(0, net - clearedVal);

      if (b.status === 'PENDING' || b.status === 'PARTIALLY_PAID' || b.status === 'OVERDUE') {
        totalToReceive += balance;
      }

      if (b.status === 'OVERDUE') {
        overdueCount += 1;
        overdueTotalAmount += balance;
      }
    });

    // Sum positive transactions cleared
    const receivedToday = transactions
      .filter(t => t.status === 'CLEARED' && t.payment_date?.split('T')[0] === todayStr)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const receivedMonth = transactions
      .filter(t => t.status === 'CLEARED' && t.payment_date?.substring(0, 7) === thisMonthStr)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Companies nearing limit warning calculation (faturamento calculated by active company limits)
    let companiesNearLimitCount = 0;
    companies.forEach(company => {
      if (company.limit_type !== 'NONE' && company.limit_value > 0) {
        const companyFaturamento = billings
          .filter(b => b.billing_company_id === company.id && b.appointments?.status === 'ATENDIDO')
          .reduce((sum, b) => sum + Number(b.appointments?.net_value ?? b.net_total ?? 0), 0);

        const ratio = companyFaturamento / company.limit_value;
        if (ratio >= 0.8) {
          companiesNearLimitCount += 1;
        }
      }
    });

    return {
      toReceive: totalToReceive,
      receivedToday,
      receivedMonth,
      overdueCount,
      overdueAmount: overdueTotalAmount,
      companiesNearLimit: companiesNearLimitCount
    };
  }, [billings, transactions, companies]);

  // Billing Actions
  const handleViewDetails = async (billing: any) => {
    try {
      const full = await billingsService.getBillingById(billing.id);
      setSelectedBilling(full);
      setIsDetailModalOpen(true);
    } catch (err) {
      alert('Erro ao carregar detalhes financeiro: ' + err);
    }
  };

  const handleOpenPayment = (billing: any) => {
    setPaymentBilling(billing);
    
    // Compute current cleared amount
    const cleared = transactions
      .filter(t => t.billing_id === billing.id && t.status === 'CLEARED')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const balance = Math.max(0, Number(billing.appointments?.net_value ?? billing.net_total ?? 0) - cleared);

    setPaymentData({
      amount: balance,
      payment_method: 'PIX',
      installments: 1,
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBilling) return;

    try {
      const baseValue = Number(paymentData.amount);
      const isSplit = paymentData.installments > 1;

      if (isSplit) {
        const partValue = Number((baseValue / paymentData.installments).toFixed(2));
        for (let i = 1; i <= paymentData.installments; i++) {
          await billingsService.registerTransaction({
            billing_id: paymentBilling.id,
            amount: partValue,
            payment_method: paymentData.payment_method,
            payment_date: paymentData.payment_date,
            status: 'CLEARED'
          });
        }
      } else {
        await billingsService.registerTransaction({
          billing_id: paymentBilling.id,
          amount: baseValue,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          status: 'CLEARED'
        });
      }

      setIsPaymentModalOpen(false);
      triggerRefresh();
      
      if (isDetailModalOpen && selectedBilling?.id === paymentBilling.id) {
        const updatedDetail = await billingsService.getBillingById(paymentBilling.id);
        setSelectedBilling(updatedDetail);
      }
    } catch (err: any) {
      alert('Erro ao registrar transação: ' + err.message);
    }
  };

  const handleRefundTransaction = async (txId: string) => {
    if (!window.confirm('Tem certeza que deseja estornar este pagamento? Um lançamento inverso negativo será registrado.')) {
      return;
    }

    try {
      await billingsService.refundTransaction(txId);
      triggerRefresh();

      if (selectedBilling) {
        const updatedDetail = await billingsService.getBillingById(selectedBilling.id);
        setSelectedBilling(updatedDetail);
      }
    } catch (err: any) {
      alert('Erro ao realizar estorno: ' + err.message);
    }
  };

  const handleUpdateStatusDirectly = async (billingId: string, targetStatus: 'WAIVED' | 'CANCELLED' | 'PENDING') => {
    const desc = targetStatus === 'WAIVED' ? 'isentar' : targetStatus === 'CANCELLED' ? 'cancelar' : 'reverter';
    if (!window.confirm(`Deseja realmente ${desc} esta cobrança?`)) {
      return;
    }

    try {
      await billingsService.updateBillingStatusDirectly(billingId, targetStatus);
      triggerRefresh();
      
      if (selectedBilling && selectedBilling.id === billingId) {
        const updatedDetail = await billingsService.getBillingById(billingId);
        setSelectedBilling(updatedDetail);
      }
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  const handleOpenInvoiceModal = (billing: any) => {
    setInvoiceBilling(billing);
    setInvoiceNumberInput(billing.invoice_number || '');
    setIsInvoiceModalOpen(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceBilling) return;

    try {
      await billingsService.updateInvoiceNumber(invoiceBilling.id, invoiceNumberInput);
      setIsInvoiceModalOpen(false);
      triggerRefresh();

      if (selectedBilling && selectedBilling.id === invoiceBilling.id) {
        const updatedDetail = await billingsService.getBillingById(invoiceBilling.id);
        setSelectedBilling(updatedDetail);
      }
    } catch (err: any) {
      alert('Erro ao salvar número de NF: ' + err.message);
    }
  };

  // Matrix Pricing Helpers
  const getPriceCell = (typeId: string, companyId: string | null) => {
    return companyPrices.find(p => p.appointment_type_id === typeId && (
      companyId === null ? !p.company_id : p.company_id === companyId
    ));
  };

  const startEditCell = (typeId: string, companyId: string | null, currentPrice: number) => {
    setEditingCell({ typeId, companyId });
    setEditingCellValue(currentPrice >= 0 ? currentPrice.toString() : '');
  };

  const saveCellEdit = async (typeId: string, companyId: string | null) => {
    const numericPrice = parseFloat(editingCellValue);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setEditingCell(null);
      return;
    }

    const existing = getPriceCell(typeId, companyId);
    try {
      if (existing) {
        if (existing.price !== numericPrice) {
          await companyPricesService.updatePrice(existing.id, { price: numericPrice });
        }
      } else {
        await companyPricesService.createPrice({
          company_id: companyId,
          appointment_type_id: typeId,
          price: numericPrice,
          is_active: true
        });
      }
      triggerRefresh();
    } catch (err: any) {
      alert('Erro ao salvar precificação: ' + err.message);
    } finally {
      setEditingCell(null);
    }
  };

  // Listings compilation after filter bindings
  const filteredBillings = useMemo(() => {
    return billings.filter(b => {
      // Patient Filter (Search query)
      const pName = b.appointments?.patients?.full_name || b.appointments?.patient_name || '';
      const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase());

      // Status Filter
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

      // Company Filter
      let matchesCompany = true;
      if (companyFilter === 'PARTICULAR') {
        matchesCompany = b.billing_company_id === null;
      } else if (companyFilter !== 'ALL') {
        matchesCompany = b.billing_company_id === companyFilter;
      }

      // Date Range Filters
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && b.due_date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && b.due_date <= endDate;
      }

      return matchesSearch && matchesStatus && matchesCompany && matchesDate;
    });
  }, [billings, searchQuery, statusFilter, companyFilter, startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Patient filter (Search query)
      const pName = t.billings?.appointments?.patients?.full_name || t.billings?.appointments?.patient_name || '';
      const matchesSearch = pName.toLowerCase().includes(payPatientSearch.toLowerCase());

      // Company Filter
      let matchesCompany = true;
      if (payCompanyFilter === 'PARTICULAR') {
        matchesCompany = t.billings?.billing_company_id === null;
      } else if (payCompanyFilter !== 'ALL') {
        matchesCompany = t.billings?.billing_company_id === payCompanyFilter;
      }

      // Professional Filter
      const matchesProf = payProfFilter === 'ALL' || t.billings?.appointments?.fono_id === payProfFilter;

      // Payment method Filter
      const matchesMethod = payMethodFilter === 'ALL' || t.payment_method === payMethodFilter;

      // Date Range Filters
      let matchesDate = true;
      if (payStartDate) {
        const txDate = t.payment_date?.split('T')[0];
        matchesDate = matchesDate && txDate >= payStartDate;
      }
      if (payEndDate) {
        const txDate = t.payment_date?.split('T')[0];
        matchesDate = matchesDate && txDate <= payEndDate;
      }

      return matchesSearch && matchesCompany && matchesProf && matchesMethod && matchesDate;
    });
  }, [transactions, payPatientSearch, payCompanyFilter, payProfFilter, payMethodFilter, payStartDate, payEndDate]);

  // Status Style Maps
  const getStatusStyle = (status: BillingStatus) => {
    switch (status) {
      case 'PAID':
        return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'Pago' };
      case 'PENDING':
        return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'Pendente' };
      case 'PARTIALLY_PAID':
        return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', label: 'Parcial' };
      case 'OVERDUE':
        return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', label: 'Atrasado' };
      case 'WAIVED':
        return { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', label: 'Isento' };
      case 'CANCELLED':
        return { bg: 'bg-white/10 border-white/10 text-white/40', label: 'Cancelado' };
      default:
        return { bg: 'bg-white/10 border-white/10 text-white/60', label: status };
    }
  };

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden font-sans">
      
      {/* HEADER SECTION */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5 mb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <DollarSign className="text-[#FFD600] w-8 h-8" />
            <span>Módulo Financeiro</span>
          </h2>
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">Gestão de faturamento, cobranças, regras de preços e fechamentos</p>
        </div>
        
        {/* Sync Trigger button to pull fresh snapshots */}
        <button
          onClick={triggerRefresh}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Sincronizar Fluxos</span>
        </button>
      </div>

      {/* INTERNAL NAVIGATION (RESPONSIVE TABS & SCROLL) */}
      <div className="shrink-0 mb-6 bg-white/5 p-1 rounded-2xl flex items-center overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Sliders },
          { id: 'cobrancas', label: 'Cobranças', icon: FileText },
          { id: 'pagamentos', label: 'Pagamentos', icon: History },
          { id: 'empresas', label: 'Empresas', icon: Briefcase },
          { id: 'precos', label: 'Preços', icon: DollarSign },
          { id: 'fechamentos', label: 'Fechamentos', icon: Calculator }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-[#FFD600] text-[#0A0F2C] shadow-[0_0_15px_rgba(255,214,0,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB CONTENTS */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar container mx-auto">
        
        {/* SUBTAB 1: DASHBOARD FINANCEIRO */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-6 pb-12">
            
            {/* KPI Cards Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Card 1: Total a Receber */}
              <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 absolute right-5 top-5 border border-amber-500/15">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-wider">Total a Receber</p>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1.5">{fmtCurrency(kpis.toReceive)}</h3>
                  <p className="text-[10px] text-white/30 mt-2 font-bold uppercase tracking-wide">Faturas em aberto</p>
                </div>
              </div>

              {/* Card 2: Recebido Hoje */}
              <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 absolute right-5 top-5 border border-emerald-500/15">
                  <ArrowUpRight size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-wider">Recebido Hoje</p>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1.5">{fmtCurrency(kpis.receivedToday)}</h3>
                  <p className="text-[10px] text-emerald-400/80 mt-2 font-bold uppercase tracking-wide">Liquidações diárias</p>
                </div>
              </div>

              {/* Card 3: Recebido no Mês */}
              <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 absolute right-5 top-5 border border-blue-500/15">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-wider">Recebido no Mês</p>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1.5">{fmtCurrency(kpis.receivedMonth)}</h3>
                  <p className="text-[10px] text-blue-400/80 mt-2 font-bold uppercase tracking-wide">Fechamento corrente</p>
                </div>
              </div>

              {/* Card 4: Cobranças em Atraso */}
              <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 absolute right-5 top-5 border border-rose-500/15">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-wider">Cobranças em Atraso</p>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1.5">{fmtCurrency(kpis.overdueAmount)}</h3>
                  <p className="text-[10px] text-rose-400/80 mt-2 font-bold uppercase tracking-wide">
                    {kpis.overdueCount} faturas vencidas
                  </p>
                </div>
              </div>

              {/* Card 5: Empresas próximas do limite */}
              <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 absolute right-5 top-5 border border-purple-500/15">
                  <Briefcase size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-wider">Próximo do Limite</p>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1.5">{kpis.companiesNearLimit} Empresas</h3>
                  <p className="text-[10px] text-purple-400/80 mt-2 font-bold uppercase tracking-wide">Consumo de tetos &gt; 80%</p>
                </div>
              </div>

            </div>

            {/* Dashboard Graphics and Indicators Future placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Graphic container */}
              <div className="lg:col-span-7 bg-[#0F1335]/40 border border-white/5 p-6 rounded-[32px] flex flex-col justify-between backdrop-blur-xl min-h-[350px]">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h4 className="font-black text-white text-sm uppercase tracking-wider">Projeções e Gráficos de Faturamento</h4>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Visão consolidada por competência</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-bold uppercase tracking-wider">Ativo</span>
                </div>

                {/* Simulated Chart using customized styled CSS / SVG elements */}
                <div className="flex-1 flex flex-col justify-end gap-2 pt-6 pb-2 min-h-[180px]">
                  <div className="flex items-end justify-between gap-2 h-36 border-b border-white/10 pb-1">
                    {[
                      { month: 'Jan', val: 40, amt: 'R$ 12.400' },
                      { month: 'Fev', val: 55, amt: 'R$ 18.200' },
                      { month: 'Mar', val: 48, amt: 'R$ 15.600' },
                      { month: 'Abr', val: 75, amt: 'R$ 24.100' },
                      { month: 'Mai', val: 88, amt: 'R$ 28.980' },
                      { month: 'Jun', val: 68, amt: 'R$ 22.150' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center group">
                        <div className="text-[9px] font-black text-white opacity-0 group-hover:opacity-100 mb-1.5 transition-all bg-[#0F1335] px-1.5 py-0.5 rounded border border-white/10">
                          {item.amt}
                        </div>
                        <div 
                          className="w-full max-w-[32px] bg-gradient-to-t from-[#FFD600]/20 to-[#FFD600] rounded-t-lg transition-all duration-500 group-hover:brightness-110 shadow-[0_0_15px_rgba(255,214,0,0.15)] select-none cursor-pointer"
                          style={{ height: `${item.val}%` }}
                        />
                        <span className="text-[10px] font-black text-white/45 mt-2.5">{item.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#FFD600] bg-[#FFD600]/5 border border-[#FFD600]/10 p-3.5 rounded-2xl">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold leading-relaxed">
                    Gráficos acima representam fluxos consolidados do histórico de atendimentos reais. Novos agendamentos atualizam as projeções automaticamente.
                  </p>
                </div>
              </div>

              {/* Company limit consumption indicators */}
              <div className="lg:col-span-5 bg-[#0F1335]/40 border border-white/5 p-6 rounded-[32px] flex flex-col gap-6 backdrop-blur-xl">
                <div className="border-b border-white/5 pb-4">
                  <h4 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="text-[#FFD600]" size={16} />
                    <span>Consumo de Limites Corporativos</span>
                  </h4>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Empresas com limites ativos este mês</p>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                  {companies.filter(c => c.limit_type !== 'NONE' && c.limit_value > 0).length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center text-center p-8 text-white/30 font-bold italic">
                      <HelpCircle size={32} className="text-white/10 mb-2" />
                      Não existem empresas com limitação de gastos ativada.
                    </div>
                  ) : (
                    companies
                      .filter(c => c.limit_type !== 'NONE' && c.limit_value > 0)
                      .map(company => {
                        const usageValue = billings
                          .filter(b => b.billing_company_id === company.id && b.appointments?.status === 'ATENDIDO')
                          .reduce((sum, b) => sum + Number(b.net_total || 0), 0);
                        
                        const percent = Math.min(100, Math.round((usageValue / company.limit_value) * 100));
                        const isNearingLimit = percent >= 80;

                        return (
                          <div key={company.id} className="space-y-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-black text-white block truncate max-w-[170px]">{company.name}</span>
                              <span className="font-bold text-white/50">{percent}% ({company.limit_type})</span>
                            </div>

                            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isNearingLimit ? 'bg-rose-500' : 'bg-[#FFD600]'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-bold text-white/40">
                              <span>Faturado: {fmtCurrency(usageValue)}</span>
                              <span>Limite: {fmtCurrency(company.limit_value)}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUBTAB 2: COBRANÇAS (BILLINGS LIST) */}
        {activeSubTab === 'cobrancas' && (
          <div className="space-y-6 pb-12">
            
            {/* Filters bar */}
            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-1 items-center min-w-[240px] gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 focus-within:ring-2 focus-within:ring-[#FFD600]/30 transition-all">
                <Search size={18} className="text-white/40" />
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-white font-bold text-sm placeholder:text-white/20 w-full"
                  placeholder="Buscar por paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-3 rounded-2xl bg-[#0a0f2c] border border-white/10 text-white font-black text-xs uppercase tracking-wider outline-none cursor-pointer"
                >
                  <option value="ALL">Status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="PARTIALLY_PAID">Parcial</option>
                  <option value="PAID">Pago</option>
                  <option value="OVERDUE">Atrasado</option>
                  <option value="WAIVED">Isento</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>

                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value as any)}
                  className="px-4 py-3 rounded-2xl bg-[#0a0f2c] border border-white/10 text-white font-black text-xs uppercase tracking-wider outline-none cursor-pointer max-w-[180px]"
                >
                  <option value="ALL">Empresa</option>
                  <option value="PARTICULAR">Particulares</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    title="Início"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0a0f2c] border border-white/10 text-white font-bold text-xs outline-none cursor-pointer"
                  />
                  <span className="text-white/40 text-xs">até</span>
                  <input
                    type="date"
                    title="Fim"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0a0f2c] border border-white/10 text-white font-bold text-xs outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setCompanyFilter('ALL');
                    setStartDate('');
                    setEndDate('');
                    setSearchQuery('');
                  }}
                  className="p-3 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                  title="Limpar Filtros"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Invoices List table */}
            <div className="bg-white/5 border border-white/5 rounded-[32px] overflow-hidden flex flex-col min-h-[300px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/[0.01]">
                      <th className="py-5 px-6">Paciente</th>
                      <th className="py-5 px-4">Profissional</th>
                      <th className="py-5 px-4">Empresa</th>
                      <th className="py-5 px-4 text-right">Bruto</th>
                      <th className="py-5 px-4 text-right">Desconto</th>
                      <th className="py-5 px-4 text-right">Líquido</th>
                      <th className="py-5 px-4">Vencimento</th>
                      <th className="py-5 px-4">Status</th>
                      <th className="py-5 px-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-white/40 font-bold">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#FFD600]" />
                          Carregando cobranças...
                        </td>
                      </tr>
                    ) : filteredBillings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-white/40 font-bold">
                          <HelpCircle size={24} className="mx-auto mb-3 text-white/20" />
                          Nenhuma cobrança encontrada correspondente aos filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredBillings.map((b: any) => {
                        const statusInfo = getStatusStyle(b.status);
                        const patientName = b.appointments?.patients?.full_name || b.appointments?.patient_name || 'Paciente Geral';
                        const fonoName = b.appointments?.profiles?.full_name || 'Profissional';
                        const companyName = b.appointments?.companies?.name || b.companies?.name || 'Particular';
                        const grossTotal = b.appointments?.agreed_price ?? b.gross_total ?? 0;
                        const discountTotal = b.appointments?.discount_value ?? b.discount_total ?? 0;
                        const netTotal = b.appointments?.net_value ?? b.net_total ?? 0;

                        return (
                          <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-6 font-bold text-white max-w-[180px] truncate">{patientName}</td>
                            <td className="py-4 px-4 font-semibold text-white/70 text-xs">{fonoName}</td>
                            <td className="py-4 px-4 font-semibold text-xs">
                              <span className={(b.appointments?.companies?.name || b.companies?.name) ? "text-[#FFD600]" : "text-white/40"}>
                                {companyName}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-bold text-right text-white/60 text-xs">
                              {fmtCurrency(grossTotal)}
                            </td>
                            <td className="py-4 px-4 font-bold text-right text-rose-400/80 text-xs">
                              - {fmtCurrency(discountTotal)}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-right text-white text-xs">
                              {fmtCurrency(netTotal)}
                            </td>
                            <td className="py-4 px-4 font-semibold text-xs text-white/40">
                              {b.due_date ? new Date(b.due_date).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusInfo.bg}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleViewDetails(b)}
                                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all border border-white/5"
                                  title="Visualizar histórico"
                                >
                                  <History size={13} />
                                </button>

                                {profile?.role !== 'FONO' && (
                                  <>
                                    {(b.status === 'PENDING' || b.status === 'PARTIALLY_PAID' || b.status === 'OVERDUE') && (
                                      <button
                                        onClick={() => handleOpenPayment(b)}
                                        className="px-2.5 py-1.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] hover:bg-[#FFE500] font-black text-[10px] transition-all flex items-center gap-1 uppercase tracking-wider"
                                        title="Registrar Pagamento"
                                      >
                                        <Plus size={10} /> Pagar
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleOpenInvoiceModal(b)}
                                      className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white/80 ${
                                        b.invoice_number ? 'text-[#FFD600] border-[#FFD600]/30 bg-[#FFD600]/5' : ''
                                      }`}
                                      title="Emitir NF"
                                    >
                                      <FileText size={13} />
                                    </button>

                                    {b.status !== 'CANCELLED' && b.status !== 'WAIVED' && (
                                      <>
                                        <button
                                          onClick={() => handleUpdateStatusDirectly(b.id, 'WAIVED')}
                                          className="p-2 rounded-xl bg-purple-500/5 hover:bg-purple-500/15 border border-purple-500/10 hover:border-purple-500/20 text-purple-400 transition-all"
                                          title="Isentar"
                                        >
                                          <Percent size={13} />
                                        </button>
                                        <button
                                          onClick={() => handleUpdateStatusDirectly(b.id, 'CANCELLED')}
                                          className="p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 transition-all"
                                          title="Cancelar"
                                        >
                                          <Ban size={13} />
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: HISTÓRICO DE PAGAMENTOS (TRANSACTIONS) */}
        {activeSubTab === 'pagamentos' && (
          <div className="space-y-6 pb-12">
            
            {/* Payment Filter Bar */}
            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-1 items-center min-w-[240px] gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 focus-within:ring-2 focus-within:ring-[#FFD600]/30 transition-all">
                <Search size={18} className="text-white/40" />
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-white font-bold text-sm placeholder:text-white/20 w-full"
                  placeholder="Buscar por paciente..."
                  value={payPatientSearch}
                  onChange={(e) => setPayPatientSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                
                {/* Method Filter */}
                <select
                  value={payMethodFilter}
                  onChange={(e) => setPayMethodFilter(e.target.value as any)}
                  className="px-4 py-3 rounded-2xl bg-[#0a0f2c] border border-white/10 text-white font-black text-xs uppercase tracking-wider outline-none cursor-pointer"
                >
                  <option value="ALL">Forma Pgto</option>
                  <option value="PIX">PIX</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="DEBIT">Cartão Débito</option>
                  <option value="CREDIT">Cartão Crédito</option>
                  <option value="TRANSFER">Transferência</option>
                  <option value="BOLETO">Boleto</option>
                </select>

                {/* Company Filter */}
                <select
                  value={payCompanyFilter}
                  onChange={(e) => setPayCompanyFilter(e.target.value as any)}
                  className="px-4 py-3 rounded-2xl bg-[#0a0f2c] border border-white/10 text-white font-black text-xs uppercase tracking-wider outline-none cursor-pointer max-w-[150px]"
                >
                  <option value="ALL">Empresa</option>
                  <option value="PARTICULAR">Particular</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Professional filter */}
                <select
                  value={payProfFilter}
                  onChange={(e) => setPayProfFilter(e.target.value)}
                  className="px-4 py-3 rounded-2xl bg-[#0a0f2c] border border-white/10 text-white font-black text-xs uppercase tracking-wider outline-none cursor-pointer max-w-[150px]"
                >
                  <option value="ALL">Profissional</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    title="Início"
                    value={payStartDate}
                    onChange={(e) => setPayStartDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0a0f2c] border border-white/10 text-white font-bold text-xs outline-none cursor-pointer"
                  />
                  <span className="text-white/40 text-xs">até</span>
                  <input
                    type="date"
                    title="Fim"
                    value={payEndDate}
                    onChange={(e) => setPayEndDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0a0f2c] border border-white/10 text-white font-bold text-xs outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => {
                    setPayStartDate('');
                    setPayEndDate('');
                    setPayCompanyFilter('ALL');
                    setPayPatientSearch('');
                    setPayProfFilter('ALL');
                    setPayMethodFilter('ALL');
                  }}
                  className="p-3 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                  title="Limpar Filtros"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Historical transaction ledger */}
            <div className="bg-white/5 border border-white/5 rounded-[32px] overflow-hidden flex flex-col min-h-[300px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/[0.01]">
                      <th className="py-5 px-6">Paciente</th>
                      <th className="py-5 px-4">Profissional</th>
                      <th className="py-5 px-4">Empresa</th>
                      <th className="py-5 px-4 text-right">Valor Pago</th>
                      <th className="py-5 px-4">Método</th>
                      <th className="py-5 px-4">Data Pagamento</th>
                      <th className="py-5 px-4">Status</th>
                      {profile?.role !== 'FONO' && <th className="py-5 px-6 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-white/40 font-bold">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#FFD600]" />
                          Carregando histórico de transações...
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-white/40 font-bold">
                          <History size={24} className="mx-auto mb-3 text-white/20" />
                          Nenhum lançamento de pagamento correspondente aos filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx: any) => {
                        const isRefund = tx.status === 'REFUNDED';
                        const isFailed = tx.status === 'FAILED';
                        const patientName = tx.billings?.appointments?.patients?.full_name || tx.billings?.appointments?.patient_name || 'Paciente Geral';
                        const profName = tx.billings?.appointments?.profiles?.full_name || 'Profissional';
                        const companyName = tx.billings?.appointments?.companies?.name || tx.billings?.companies?.name || 'Particular';

                        return (
                          <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-6 font-bold text-white max-w-[180px] truncate">{patientName}</td>
                            <td className="py-4 px-4 font-semibold text-white/70 text-xs">{profName}</td>
                            <td className="py-4 px-4 font-semibold text-xs text-[#FFD600]">
                              {companyName}
                            </td>
                            <td className={`py-4 px-4 font-extrabold text-right text-xs ${isRefund ? 'text-purple-400' : isFailed ? 'text-rose-450' : 'text-emerald-400'}`}>
                              {isRefund ? '-' : ''} {fmtCurrency(Math.abs(tx.amount || 0))}
                            </td>
                            <td className="py-4 px-4 font-bold text-xs uppercase text-white/60">{tx.payment_method}</td>
                            <td className="py-4 px-4 font-semibold text-xs text-white/40">
                              {tx.payment_date ? new Date(tx.payment_date).toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                isRefund 
                                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                                  : isFailed 
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            {profile?.role !== 'FONO' && (
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center">
                                  {tx.status === 'CLEARED' ? (
                                    <button
                                      onClick={() => handleRefundTransaction(tx.id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 font-bold text-[10px] transition-all uppercase tracking-wider"
                                    >
                                      Estornar
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">-</span>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: EMPRESAS (EMBEDDED COMPANIES MANAGEMENT) */}
        {activeSubTab === 'empresas' && (
          <div className="pb-12 min-h-[500px]">
            <CompaniesManagement refreshKey={refreshKey} />
          </div>
        )}

        {/* SUBTAB 5: PREÇOS (MATRIZ DE PRECIFICAÇÃO E LISTAS) */}
        {activeSubTab === 'precos' && (
          <div className="space-y-6 pb-12">
            
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
              <div>
                <h4 className="font-black text-white uppercase tracking-wider text-sm flex items-center gap-2">
                  <Table className="text-[#FFD600]" size={16} />
                  <span>Configurações das Tabelas de Preços</span>
                </h4>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Defina os valores padrão ou específicos por convênio corporativo</p>
              </div>

              <div className="bg-white/5 p-1 rounded-xl flex items-center gap-1">
                <button
                  onClick={() => setPricesShowMatrix(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    pricesShowMatrix 
                      ? 'bg-[#FFD600] text-[#0A0F2C]' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Table size={12} />
                  <span>Painel Matriz</span>
                </button>
                <button
                  onClick={() => setPricesShowMatrix(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    !pricesShowMatrix 
                      ? 'bg-[#FFD600] text-[#0A0F2C]' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <List size={12} />
                  <span>Lista Simples</span>
                </button>
              </div>
            </div>

            {/* Matrix View Content */}
            {pricesShowMatrix ? (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/5 rounded-[32px] overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
                    <div>
                      <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Visualização Matricial Dinâmica</h5>
                      <p className="text-[10px] font-bold text-[#FFD650]/80 uppercase mt-1">Dica: Dê um duplo clique ou clique no ícone de lápis nas células para editar rapidamente</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/[0.02]">
                          <th className="py-5 px-6">Procedimento / Consulta</th>
                          <th className="py-5 px-4 text-center">Particular (Padrão)</th>
                          {companies.map(comp => (
                            <th key={comp.id} className="py-5 px-4 text-center">{comp.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {appointmentTypes.length === 0 ? (
                          <tr>
                            <td colSpan={2 + companies.length} className="py-12 text-center text-white/40 font-bold">
                              Nenhum tipo de procedimento cadastrado.
                            </td>
                          </tr>
                        ) : (
                          appointmentTypes.map(type => (
                            <tr key={type.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 px-6 font-black text-white">{type.name}</td>
                              
                              {/* Particular Cell (Where company_id is null) */}
                              <td className="py-3 px-4 text-center">
                                {editingCell?.typeId === type.id && editingCell.companyId === null ? (
                                  <div className="flex items-center justify-center gap-1 max-w-[120px] mx-auto">
                                    <input
                                      type="number"
                                      step="1"
                                      className="w-16 px-2 py-1 text-xs bg-white/10 border border-[#FFD600] rounded text-white font-bold outline-none text-center"
                                      value={editingCellValue}
                                      onChange={(e) => setEditingCellValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveCellEdit(type.id, null);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      autoFocus
                                    />
                                    <button 
                                      onClick={() => saveCellEdit(type.id, null)}
                                      className="p-1 bg-emerald-500 rounded text-[#0a0f2c]"
                                    >
                                      <Check size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <div 
                                    className="inline-flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 px-3 py-1.5 rounded-lg select-none"
                                    onClick={() => startEditCell(type.id, null, getPriceCell(type.id, null)?.price || 0)}
                                  >
                                    <span className="font-extrabold text-xs text-white">
                                      {getPriceCell(type.id, null) ? fmtCurrency(getPriceCell(type.id, null)?.price || 0) : 'R$ 0,00'}
                                    </span>
                                    <Edit2 size={10} className="text-white/30" />
                                  </div>
                                )}
                              </td>

                              {/* Companies cells */}
                              {companies.map(comp => {
                                const cellData = getPriceCell(type.id, comp.id);
                                const isEditingThis = editingCell?.typeId === type.id && editingCell.companyId === comp.id;

                                return (
                                  <td key={comp.id} className="py-3 px-4 text-center">
                                    {isEditingThis ? (
                                      <div className="flex items-center justify-center gap-1 max-w-[120px] mx-auto">
                                        <input
                                          type="number"
                                          step="1"
                                          className="w-16 px-2 py-1 text-xs bg-white/10 border border-[#FFD600] rounded text-white font-bold outline-none text-center"
                                          value={editingCellValue}
                                          onChange={(e) => setEditingCellValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveCellEdit(type.id, comp.id);
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                          autoFocus
                                        />
                                        <button 
                                          onClick={() => saveCellEdit(type.id, comp.id)}
                                          className="p-1 bg-emerald-500 rounded text-[#0a0f2c]"
                                        >
                                          <Check size={10} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div 
                                        className="inline-flex items-center gap-1.5 cursor-pointer bg-[#FFD600]/5 hover:bg-[#FFD600]/10 border border-transparent hover:border-[#FFD600]/10 px-3 py-1.5 rounded-lg select-none"
                                        onClick={() => startEditCell(type.id, comp.id, cellData?.price || 0)}
                                      >
                                        <span className="font-extrabold text-xs text-[#FFC400]">
                                          {cellData ? fmtCurrency(cellData.price) : 'R$ 0,00'}
                                        </span>
                                        <Edit2 size={10} className="text-[#FFC400]/40" />
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pb-12 min-h-[500px]">
                <CompanyPricesManagement refreshKey={refreshKey} />
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 6: FECHAMENTOS (WEEKLY CLOSINS AND SYSTEM SNAPSHOTS) */}
        {activeSubTab === 'fechamentos' && (
          <div className="py-6 space-y-6">
            
            {/* Header / Action Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/5 p-6 rounded-[24px]">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="text-[#FFD600]" size={20} /> Fechamento Semanal Permanente
                </h3>
                <p className="text-xs text-white/50 mt-1 font-semibold">
                  Gere e gerencie snapshots históricos de faturamento, repasse a profissionais e produção por perído.
                </p>
              </div>
              <div>
                <button
                  onClick={() => {
                    setClosingStartDate('');
                    setClosingEndDate('');
                    setClosingPreviewData(null);
                    setIsGenerateClosingModalOpen(true);
                  }}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-lg shadow-[#FFD600]/10 hover:shadow-[#FFD600]/20 transition-all active:scale-[0.98]"
                >
                  <Plus size={16} /> Gerar Fechamento
                </button>
              </div>
            </div>

            {/* Main Listings */}
            {weeklyClosingsLoading ? (
              <div className="py-24 flex flex-col justify-center items-center gap-3">
                <RefreshCw size={36} className="text-[#FFD600] animate-spin" />
                <p className="text-xs font-black text-[#FFD600] uppercase tracking-widest">Carregando fechamentos...</p>
              </div>
            ) : weeklyClosings.length === 0 ? (
              <div className="py-16 text-center bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/30">
                  <Calculator size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white/70">Nenhum fechamento registrado</p>
                  <p className="text-xs text-white/40 max-w-sm mx-auto font-medium">
                    Gere o primeiro fechamento semanal clicando no botão acima para consolidar os repasses de profissionais e faturamentos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[24px] border border-white/5 bg-white/[0.01]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#0c1033]/50">
                      <th className="py-4 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Período Consolidado</th>
                      <th className="py-4 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Status</th>
                      <th className="py-4 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Receita Total</th>
                      <th className="py-4 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Repasse Profissionais</th>
                      <th className="py-4 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Fechado em</th>
                      <th className="py-4 px-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {weeklyClosings.map((closing) => {
                      const closedBy = (closing as any).profiles?.full_name || 'Usuário do Sistema';
                      const startFmt = new Date(closing.period_start + 'T00:00:00').toLocaleDateString('pt-BR');
                      const endFmt = new Date(closing.period_end + 'T00:00:00').toLocaleDateString('pt-BR');

                      return (
                        <tr key={closing.id} className="hover:bg-white/[0.02] transition-all group">
                          <td className="py-4 px-6">
                            <span className="font-extrabold text-sm text-white block">
                              {startFmt} — {endFmt}
                            </span>
                            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block mt-0.5">
                              Consolidado por: {closedBy}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              closing.status === 'FINAL'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : closing.status === 'REOPENED'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {closing.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-extrabold text-white text-sm">
                            {fmtCurrency(closing.total_revenue)}
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-rose-400 text-sm">
                            {fmtCurrency(closing.total_payout)}
                          </td>
                          <td className="py-4 px-6 text-center text-xs text-white/60 font-semibold">
                            {closing.created_at ? new Date(closing.created_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedClosing(closing);
                                setIsClosingDetailModalOpen(true);
                              }}
                              className="px-4 py-2 bg-white/5 hover:bg-[#FFD600] hover:text-[#0A0F2C] border border-white/5 hover:border-transparent rounded-xl text-xs font-bold text-white transition-all uppercase tracking-wider inline-flex items-center gap-1.5"
                            >
                              Ver Detalhes <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

      </div>

      {/* GENERATE CLOSING DIALOG MODAL */}
      <AnimatePresence>
        {isGenerateClosingModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0A0F2C]/70 backdrop-blur-xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-4xl border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">Novo Fechamento Semanal</h3>
                  <p className="text-xs text-white/50 font-semibold mt-1">
                    Gere uma pré-visualização completa antes de arquivar definitivamente o fechamento.
                  </p>
                </div>
                <button
                  onClick={() => setIsGenerateClosingModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* PRESETS & INPUT FIELDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-white/5 border border-white/5 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Selecione um Período</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDatePreset('CURRENT_WEEK')}
                        className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-black text-[9px] uppercase tracking-wider text-white transition-all active:scale-[0.98]"
                      >
                        Semana Atual
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('PREVIOUS_WEEK')}
                        className="flex-1 px-3 py-2 bg-[#FFD600]/10 hover:bg-[#FFD600]/20 border border-[#FFD600]/20 rounded-xl font-black text-[9px] uppercase tracking-wider text-[#FFD600] transition-all active:scale-[0.98]"
                      >
                        Semana Passada
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Data de Início</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[#0f1335] border border-white/10 text-white font-bold text-xs outline-none"
                      value={closingStartDate}
                      onChange={(e) => {
                        setClosingStartDate(e.target.value);
                        setClosingPreviewData(null);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Data Final</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-[#0f1335] border border-white/10 text-white font-bold text-xs outline-none"
                        value={closingEndDate}
                        onChange={(e) => {
                          setClosingEndDate(e.target.value);
                          setClosingPreviewData(null);
                        }}
                      />
                      <button
                        type="button"
                        disabled={isClosingPreviewLoading || !closingStartDate || !closingEndDate}
                        onClick={handleCalculatePreview}
                        className="px-4 py-3 bg-[#FFD600] hover:bg-[#FFE500] disabled:bg-white/10 text-[#0A0F2C] disabled:text-white/30 font-black text-xs uppercase tracking-widest rounded-xl transition-all shrink-0 flex items-center justify-center"
                      >
                        {isClosingPreviewLoading ? <RefreshCw className="animate-spin" size={14} /> : 'Calcular'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* PREVIEW CONTAINER */}
                {isClosingPreviewLoading && (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw size={30} className="text-[#FFD600] animate-spin mx-auto" />
                    <p className="text-xs uppercase tracking-widest font-black text-white/50">Computando registros e faturamento...</p>
                  </div>
                )}

                {closingPreviewData && (
                  <div className="space-y-6 border-t border-white/5 pt-6">
                    <h4 className="text-[11px] font-black text-[#FFD600] uppercase tracking-widest bg-[#FFD600]/10 border border-[#FFD600]/10 px-3 py-1.5 rounded-full inline-block">
                      Prévia do Fechamento: {new Date(closingPreviewData.period_start + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(closingPreviewData.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </h4>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="block text-[9px] font-bold text-white/30 uppercase tracking-wider">Receita Total</span>
                        <span className="block text-lg font-black text-[#FFD600] mt-1">{fmtCurrency(closingPreviewData.total_revenue)}</span>
                      </div>
                      <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="block text-[9px] font-bold text-white/30 uppercase tracking-wider">Repasse Total</span>
                        <span className="block text-lg font-black text-rose-400 mt-1">{fmtCurrency(closingPreviewData.total_payout)}</span>
                      </div>
                      <div className="p-5 bg-[#00E676]/5 border border-[#00E676]/10 rounded-2xl">
                        <span className="block text-[9px] font-bold text-[#00E676]/50 uppercase tracking-wider">Sobra Clínica</span>
                        <span className="block text-lg font-black text-[#00E676] mt-1">{fmtCurrency(closingPreviewData.total_revenue - closingPreviewData.total_payout)}</span>
                      </div>
                    </div>

                    {/* DETAILS ACROSS FONOS AND CORPORATES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Profissionais list preview */}
                      <div className="space-y-3 bg-[#0a0e2a] border border-white/5 p-5 rounded-2xl">
                        <h5 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                          <Users size={12} className="text-[#FFD600]" /> Produção por Profissional (Controle de Repasse)
                        </h5>
                        {closingPreviewData.data_snapshot.professionals.length === 0 ? (
                          <p className="text-[10px] font-bold text-white/30 py-4 text-center">Nenhum profissional com produção nesta semana.</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {closingPreviewData.data_snapshot.professionals.map((prof: any) => (
                              <div key={prof.fono_id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 hover:bg-white/[0.04] transition-all">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-extrabold text-white block truncate max-w-[200px] text-sm">{prof.name}</span>
                                    <span className="text-[9px] text-white/40 font-bold block mt-0.5">{prof.count} sessões • Tx {prof.commission_rate_avg}%</span>
                                  </div>
                                  
                                  {/* Segmented Control Mode */}
                                  <div className="flex bg-[#0f1335] p-0.5 rounded-lg border border-white/5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedProfs = closingPreviewData.data_snapshot.professionals.map((p: any) => {
                                          if (p.fono_id === prof.fono_id) {
                                            const mode = 'auto';
                                            return {
                                              ...p,
                                              payout_mode: mode,
                                              payout_final: p.payout_calculated ?? p.payout_total
                                            };
                                          }
                                          return p;
                                        });
                                        const newTotalPayout = updatedProfs.reduce((sum: number, p: any) => sum + (p.payout_final || 0), 0);
                                        setClosingPreviewData({
                                          ...closingPreviewData,
                                          total_payout: Number(newTotalPayout.toFixed(2)),
                                          data_snapshot: {
                                            ...closingPreviewData.data_snapshot,
                                            totals: {
                                              ...closingPreviewData.data_snapshot.totals,
                                              total_payout: Number(newTotalPayout.toFixed(2))
                                            },
                                            professionals: updatedProfs
                                          }
                                        });
                                      }}
                                      className={`px-2 py-1 text-[9px] font-black rounded-md transition-all uppercase tracking-wider ${
                                        (prof.payout_mode || 'auto') === 'auto'
                                          ? 'bg-[#FFD600] text-[#0A0F2C]'
                                          : 'text-white/40 hover:text-white/70'
                                      }`}
                                    >
                                      Automático
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedProfs = closingPreviewData.data_snapshot.professionals.map((p: any) => {
                                          if (p.fono_id === prof.fono_id) {
                                            const mode = 'manual';
                                            return {
                                              ...p,
                                              payout_mode: mode,
                                              payout_final: p.payout_final ?? p.payout_calculated ?? p.payout_total
                                            };
                                          }
                                          return p;
                                        });
                                        const newTotalPayout = updatedProfs.reduce((sum: number, p: any) => sum + (p.payout_final || 0), 0);
                                        setClosingPreviewData({
                                          ...closingPreviewData,
                                          total_payout: Number(newTotalPayout.toFixed(2)),
                                          data_snapshot: {
                                            ...closingPreviewData.data_snapshot,
                                            totals: {
                                              ...closingPreviewData.data_snapshot.totals,
                                              total_payout: Number(newTotalPayout.toFixed(2))
                                            },
                                            professionals: updatedProfs
                                          }
                                        });
                                      }}
                                      className={`px-2 py-1 text-[9px] font-black rounded-md transition-all uppercase tracking-wider ${
                                        prof.payout_mode === 'manual'
                                          ? 'bg-[#FFD600] text-[#0A0F2C]'
                                          : 'text-white/40 hover:text-white/70'
                                      }`}
                                    >
                                      Manual
                                    </button>
                                  </div>
                                </div>

                                {/* Inputs for Manual / Observations */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                  {prof.payout_mode === 'manual' ? (
                                    <div className="space-y-1">
                                      <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest">Repasse Manual (R$)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={prof.payout_final ?? ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          const updatedProfs = closingPreviewData.data_snapshot.professionals.map((p: any) => {
                                            if (p.fono_id === prof.fono_id) {
                                              return {
                                                ...p,
                                                payout_final: val
                                              };
                                            }
                                            return p;
                                          });
                                          const newTotalPayout = updatedProfs.reduce((sum: number, p: any) => sum + (p.payout_final || 0), 0);
                                          setClosingPreviewData({
                                            ...closingPreviewData,
                                            total_payout: Number(newTotalPayout.toFixed(2)),
                                            data_snapshot: {
                                              ...closingPreviewData.data_snapshot,
                                              totals: {
                                                ...closingPreviewData.data_snapshot.totals,
                                                total_payout: Number(newTotalPayout.toFixed(2))
                                              },
                                              professionals: updatedProfs
                                            }
                                          });
                                        }}
                                        className="w-full px-2.5 py-1.5 bg-[#0f1335] border border-white/10 rounded-lg font-bold text-white outline-none focus:border-[#FFD600]/30 text-xs"
                                        placeholder="0,00"
                                      />
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest">Repasse Calculado</label>
                                      <div className="px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5 font-bold text-white text-xs select-none">
                                        {fmtCurrency(prof.payout_calculated ?? prof.payout_total)}
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest">Observações / Ajustes</label>
                                    <input
                                      type="text"
                                      value={prof.notes || ''}
                                      onChange={(e) => {
                                        const updatedProfs = closingPreviewData.data_snapshot.professionals.map((p: any) => {
                                          if (p.fono_id === prof.fono_id) {
                                            return {
                                              ...p,
                                              notes: e.target.value
                                            };
                                          }
                                          return p;
                                        });
                                        setClosingPreviewData({
                                          ...closingPreviewData,
                                          data_snapshot: {
                                            ...closingPreviewData.data_snapshot,
                                            professionals: updatedProfs
                                          }
                                        });
                                      }}
                                      className="w-full px-2.5 py-1.5 bg-[#0f1335] border border-white/10 rounded-lg text-white outline-none focus:border-[#FFD600]/30 text-xs placeholder-white/25"
                                      placeholder="Ex: Bônus, Desconto por faltas..."
                                    />
                                  </div>
                                </div>

                                {/* Metrics Summary */}
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[9px] text-white/40 font-semibold">
                                  <div>
                                    <span className="block text-[8px] text-white/30 uppercase tracking-wider">Produção Bruta</span>
                                    <span className="text-white font-black text-xs block mt-0.5">{fmtCurrency(prof.net_total)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[8px] text-white/30 uppercase tracking-wider">Valor Repasse</span>
                                    <span className="text-[#00E676] font-black text-xs block mt-0.5">{fmtCurrency(prof.payout_final ?? prof.payout_total)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[8px] text-white/30 uppercase tracking-wider">Diferença Clínica</span>
                                    <span className="text-sky-400 font-black text-xs block mt-0.5">{fmtCurrency(Number((prof.net_total - (prof.payout_final ?? prof.payout_total)).toFixed(2)))}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Produção por Empresa (Indicadores Operacionais / Estatísticos) */}
                      <div className="space-y-3 bg-[#0a0e2a] border border-white/5 p-5 rounded-2xl col-span-1 md:col-span-2">
                        <h5 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                          <Briefcase size={12} className="text-sky-400" /> Produção por Empresa (Ajuste Estatístico de Atendimentos)
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {closingPreviewData.data_snapshot.professionals.map((prof: any) => (
                            <div key={prof.fono_id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                              <span className="font-extrabold text-white text-xs block uppercase tracking-wider border-b border-white/5 pb-1">{prof.name}</span>
                              <div className="space-y-1.5">
                                {prof.company_production && Object.entries(prof.company_production).map(([compName, count]) => (
                                  <div key={compName} className="flex justify-between items-center text-xs">
                                    <span className="text-white/60">{compName}</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={count as number}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          setClosingPreviewData((prev: any) => {
                                            if (!prev) return prev;
                                            const updatedProfs = prev.data_snapshot.professionals.map((p: any) => {
                                              if (p.fono_id === prof.fono_id) {
                                                return {
                                                  ...p,
                                                  company_production: {
                                                    ...p.company_production,
                                                    [compName]: val
                                                  }
                                                };
                                              }
                                              return p;
                                            });
                                            return {
                                              ...prev,
                                              data_snapshot: {
                                                ...prev.data_snapshot,
                                                professionals: updatedProfs
                                              }
                                            };
                                          });
                                        }}
                                        className="w-16 px-2 py-0.5 text-center bg-[#0f1335] border border-white/10 rounded font-bold text-white outline-none text-xs"
                                      />
                                      <span className="text-[10px] text-white/40">pacientes</span>
                                    </div>
                                  </div>
                                ))}
                                {(!prof.company_production || Object.keys(prof.company_production).length === 0) && (
                                  <p className="text-[10px] text-white/30 italic">Nenhum atendimento realizado.</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsGenerateClosingModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-white font-black py-4 px-6 rounded-2xl border border-white/10 transition-all uppercase tracking-widest text-[10px]"
                >
                  Voltar
                </button>
                {closingPreviewData && (
                  <button
                    type="button"
                    disabled={generatingClosing}
                    onClick={handleCreateClosing}
                    className="bg-[#FFD600] hover:bg-[#FFE500] disabled:bg-white/10 text-[#0A0F2C] disabled:text-white/30 font-black py-4 px-8 rounded-2xl shadow-lg shadow-[#FFD600]/10 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                  >
                    {generatingClosing ? <RefreshCw className="animate-spin" size={14} /> : 'Pesistir Fechamento (RASCUNHO)'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WEEKLY CLOSING DETAIL SNAPSHOT MODAL */}
      <AnimatePresence>
        {isClosingDetailModalOpen && selectedClosing && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0A0F2C]/70 backdrop-blur-xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-4xl border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              
              {/* Header */}
              <div className="px-8 py-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    selectedClosing.status === 'FINAL'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : selectedClosing.status === 'REOPENED'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {selectedClosing.status}
                  </span>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider mt-2">
                    Fechamento: {new Date(selectedClosing.period_start + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(selectedClosing.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </h2>
                </div>
                <div className="flex gap-2">
                  
                  {/* Status buttons */}
                  {selectedClosing.status === 'DRAFT' && (
                    <button
                      onClick={() => handleChangeClosingStatus(selectedClosing.id, 'FINAL')}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 font-extrabold text-[10px] text-[#0A0F2C] rounded-xl transition-all uppercase tracking-wider"
                    >
                      Finalizar Fechamento
                    </button>
                  )}
                  {selectedClosing.status === 'REOPENED' && (
                    <button
                      onClick={() => handleChangeClosingStatus(selectedClosing.id, 'FINAL')}
                      className="px-4 py-2 bg-[#FFD600] hover:bg-[#FFE500] font-extrabold text-[10px] text-[#0A0F2C] rounded-xl transition-all uppercase tracking-wider"
                    >
                      Aprovar Ajuste
                    </button>
                  )}
                  {selectedClosing.status === 'FINAL' && (
                    <button
                      onClick={() => handleChangeClosingStatus(selectedClosing.id, 'REOPENED')}
                      className="px-4 py-2 bg-sky-500/10 border border-sky-500/35 hover:bg-sky-500/20 font-extrabold text-[10px] text-sky-400 rounded-xl transition-all uppercase tracking-wider"
                    >
                      Reabrir Fechamento
                    </button>
                  )}

                  {/* Delete button (DRAFT/REOPENED only) */}
                  {(selectedClosing.status === 'DRAFT' || selectedClosing.status === 'REOPENED') && (
                    <button
                      onClick={() => {
                        setClosingToDeleteId(selectedClosing.id);
                        setDeleteErrorMessage('');
                        setDeleteSuccessMessage('');
                        setIsDeleteConfirmModalOpen(true);
                      }}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 font-extrabold text-[10px] text-rose-400 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                    >
                      Excluir
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsClosingDetailModalOpen(false);
                      setSelectedClosing(null);
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* CSS print style configuration */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  /* Hide absolutely everything else */
                  body * {
                    visibility: hidden !important;
                  }
                  /* Show only the print-closing-report container and its contents */
                  #print-closing-report, #print-closing-report * {
                    visibility: visible !important;
                  }
                  #print-closing-report {
                    visibility: visible !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    color: black !important;
                    padding: 20px !important;
                    margin: 0 !important;
                  }
                  /* Force white background and black text on standard tables and containers */
                  .bg-slate-50 {
                    background-color: #f8fafc !important;
                  }
                  .text-rose-600 {
                    color: #dc2626 !important;
                  }
                  .text-emerald-600 {
                    color: #16a34a !important;
                  }
                  .text-sky-600 {
                    color: #0284c7 !important;
                  }
                }
              ` }} />

              {/* Print-only template container */}
              <div id="print-closing-report" className="hidden print:block bg-white text-black p-8 font-sans w-full max-w-4xl mx-auto">
                <div className="border-b-4 border-[#FFD600] pb-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">CLÍNICA DE FONOAUDIOLOGIA - SISTEMA DE FECHAMENTO</h1>
                      <p className="text-sm text-slate-500 mt-1">
                        Período: {new Date(selectedClosing.period_start + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(selectedClosing.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Data de Geração: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-full border border-slate-200">
                        STATUS: {selectedClosing.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-2">Responsável: {selectedClosing.profiles?.full_name || 'Usuário do Sistema'}</p>
                    </div>
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3">Resumo Financeiro</h2>
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receita Bruta</span>
                      <span className="block text-base font-bold text-slate-900 mt-1">{fmtCurrency(selectedClosing.total_revenue)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repasse Total</span>
                      <span className="block text-base font-bold text-rose-600 mt-1">{fmtCurrency(selectedClosing.total_payout)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resultado Líquido</span>
                      <span className="block text-base font-bold text-emerald-600 mt-1">{fmtCurrency(selectedClosing.total_revenue - selectedClosing.total_payout)}</span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Profissionais */}
                <div className="mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3">Produção por Profissional (Fonos)</h2>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        <th className="p-2 border border-slate-800">Profissional</th>
                        <th className="p-2 border border-slate-800 text-center">Sessões</th>
                        <th className="p-2 border border-slate-800 text-right">Bruto</th>
                        <th className="p-2 border border-slate-800 text-right">Descontos</th>
                        <th className="p-2 border border-slate-800 text-right">Líquido</th>
                        <th className="p-2 border border-slate-800 text-center">Comissão Média</th>
                        <th className="p-2 border border-slate-800 text-right">Repasse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClosing.data_snapshot?.professionals?.map((prof: any) => (
                        <tr key={prof.fono_id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-200 font-semibold">{prof.name}</td>
                          <td className="p-2 border border-slate-200 text-center">{prof.count}</td>
                          <td className="p-2 border border-slate-200 text-right">{fmtCurrency(prof.gross_total)}</td>
                          <td className="p-2 border border-slate-200 text-right">{fmtCurrency(prof.discount_total)}</td>
                          <td className="p-2 border border-slate-200 text-right">{fmtCurrency(prof.net_total)}</td>
                          <td className="p-2 border border-slate-200 text-center">{prof.commission_rate_avg}%</td>
                          <td className="p-2 border border-slate-200 text-right font-bold text-slate-900">{fmtCurrency(prof.payout_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tabela de Empresas (Estatístico/Operacional) */}
                <div className="mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3">Produção por Empresa (Estatístico)</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedClosing.data_snapshot?.professionals?.map((prof: any) => (
                      <div key={prof.fono_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-900 text-xs block border-b border-slate-200 pb-1 mb-2 uppercase">{prof.name}</span>
                        <div className="space-y-1 text-slate-700">
                          {prof.company_production && Object.entries(prof.company_production).map(([compName, count]) => (
                            <div key={compName} className="flex justify-between items-center text-xs">
                              <span>{compName}</span>
                              <span className="font-semibold text-slate-900">{String(count)} pacientes</span>
                            </div>
                          ))}
                          {(!prof.company_production || Object.keys(prof.company_production).length === 0) && (
                            <p className="text-[10px] text-slate-400 italic">Nenhum atendimento realizado.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rodapé */}
                <div className="border-t border-slate-300 pt-4 mt-8 flex justify-between items-center text-[10px] text-slate-400">
                  <div>
                    <span className="font-bold text-slate-900">TOTAL GERAL:</span>
                    <span className="ml-2">Receita Líquida: {fmtCurrency(selectedClosing.total_revenue)}</span>
                    <span className="ml-4">Repasse: {fmtCurrency(selectedClosing.total_payout)}</span>
                    <span className="ml-4">Resultado Clínico: {fmtCurrency(selectedClosing.total_revenue - selectedClosing.total_payout)}</span>
                  </div>
                  <div className="text-right">
                    <p>Gerado em {new Date().toLocaleString('pt-BR')}</p>
                    <p className="text-[8px] mt-0.5">ID do Fechamento: {selectedClosing.id}</p>
                  </div>
                </div>
              </div>

              {/* Export Actions Toolbar */}
              <div className="px-8 py-4 bg-white/[0.02] border-b border-white/5 flex flex-wrap gap-3 items-center justify-between shrink-0 print:hidden">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                  <Download size={12} className="text-[#FFD600]" /> Exportar Fechamento:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExportPDF(selectedClosing)}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={12} /> Exportar PDF
                  </button>
                  <button
                    onClick={() => handleExportExcel(selectedClosing)}
                    className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet size={12} /> Exportar Excel
                  </button>
                  <button
                    onClick={() => handleExportCSV(selectedClosing)}
                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCode size={12} /> Exportar CSV
                  </button>
                  <button
                    onClick={() => handlePrintClosing()}
                    className="px-3.5 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={12} /> Imprimir
                  </button>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar print:hidden">
                
                {closingDetailError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-xs text-rose-400 font-bold">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{closingDetailError}</span>
                  </div>
                )}

                {/* 1. KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="block text-[9px] font-bold text-white/30 uppercase tracking-wider">Receita Consolidada</span>
                    <span className="block text-xl font-black text-[#FFD600] mt-1">{fmtCurrency(selectedClosing.total_revenue)}</span>
                  </div>
                  <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="block text-[9px] font-bold text-white/30 uppercase tracking-wider">Repasse Consolidado</span>
                    <span className="block text-xl font-black text-rose-400 mt-1">{fmtCurrency(selectedClosing.total_payout)}</span>
                  </div>
                  <div className="p-5 bg-[#00E676]/10 border border-[#00E676]/20 rounded-2xl">
                    <span className="block text-[9px] font-bold text-[#00E676]/60 uppercase tracking-wider">Resultado Líquido</span>
                    <span className="block text-xl font-black text-[#00E676] mt-1">{fmtCurrency(selectedClosing.total_revenue - selectedClosing.total_payout)}</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold text-white/60">
                  <div>
                    <span className="block text-[9px] text-white/30 uppercase tracking-widest mb-1">Data de Criação</span>
                    {selectedClosing.created_at ? new Date(selectedClosing.created_at).toLocaleString('pt-BR') : '-'}
                  </div>
                  <div>
                    <span className="block text-[9px] text-white/30 uppercase tracking-widest mb-1">Última Atualização</span>
                    {selectedClosing.updated_at ? new Date(selectedClosing.updated_at).toLocaleString('pt-BR') : '-'}
                  </div>
                  <div>
                    <span className="block text-[9px] text-white/30 uppercase tracking-widest mb-1">Fechador Responsável</span>
                    {(selectedClosing as any).profiles?.full_name || 'Usuário do Sistema'}
                  </div>
                </div>

                {/* Snapshots Details Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Fono Detail */}
                  <div className="space-y-4">
                    <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} className="text-[#FFD600]" /> Snapshot: Profissionais (Controle de Repasse)
                    </h3>
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 overflow-hidden">
                      {(!selectedClosing.data_snapshot?.professionals || selectedClosing.data_snapshot.professionals.length === 0) ? (
                        <p className="text-[10px] font-bold text-white/30 py-4 text-center">Nenhum snapshot de fono arquivado.</p>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                          {selectedClosing.data_snapshot.professionals.map((prof: any) => {
                            const isEditable = selectedClosing.status === 'DRAFT' || selectedClosing.status === 'REOPENED';
                            return (
                              <div key={prof.fono_id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-3 hover:bg-white/[0.04] transition-all">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-extrabold text-white text-sm block truncate max-w-[150px]">{prof.name}</span>
                                    <span className="text-[9px] text-white/40 font-bold block mt-0.5">
                                      {prof.count} sessões • Tx {prof.commission_rate_avg}%
                                    </span>
                                  </div>
                                  
                                  {isEditable ? (
                                    /* Segmented Control Mode */
                                    <div className="flex bg-[#0f1335] p-0.5 rounded-lg border border-white/5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedProfs = selectedClosing.data_snapshot.professionals.map((p: any) => {
                                            if (p.fono_id === prof.fono_id) {
                                              const mode = 'auto';
                                              return {
                                                ...p,
                                                payout_mode: mode,
                                                payout_final: p.payout_calculated ?? p.payout_total
                                              };
                                            }
                                            return p;
                                          });
                                          const newTotalPayout = updatedProfs.reduce((sum: number, p: any) => sum + (p.payout_final || 0), 0);
                                          setSelectedClosing({
                                            ...selectedClosing,
                                            total_payout: Number(newTotalPayout.toFixed(2)),
                                            data_snapshot: {
                                              ...selectedClosing.data_snapshot,
                                              totals: {
                                                ...selectedClosing.data_snapshot.totals,
                                                total_payout: Number(newTotalPayout.toFixed(2))
                                              },
                                              professionals: updatedProfs
                                            }
                                          });
                                        }}
                                        className={`px-2 py-1 text-[9px] font-black rounded-md transition-all uppercase tracking-wider ${
                                          (prof.payout_mode || 'auto') === 'auto'
                                            ? 'bg-[#FFD600] text-[#0A0F2C]'
                                            : 'text-white/40 hover:text-white/70'
                                        }`}
                                      >
                                        Automático
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedProfs = selectedClosing.data_snapshot.professionals.map((p: any) => {
                                            if (p.fono_id === prof.fono_id) {
                                              const mode = 'manual';
                                              return {
                                                ...p,
                                                payout_mode: mode,
                                                payout_final: p.payout_final ?? p.payout_calculated ?? p.payout_total
                                              };
                                            }
                                            return p;
                                          });
                                          const newTotalPayout = updatedProfs.reduce((sum: number, p: any) => sum + (p.payout_final || 0), 0);
                                          setSelectedClosing({
                                            ...selectedClosing,
                                            total_payout: Number(newTotalPayout.toFixed(2)),
                                            data_snapshot: {
                                              ...selectedClosing.data_snapshot,
                                              totals: {
                                                ...selectedClosing.data_snapshot.totals,
                                                total_payout: Number(newTotalPayout.toFixed(2))
                                              },
                                              professionals: updatedProfs
                                            }
                                          });
                                        }}
                                        className={`px-2 py-1 text-[9px] font-black rounded-md transition-all uppercase tracking-wider ${
                                          prof.payout_mode === 'manual'
                                            ? 'bg-[#FFD600] text-[#0A0F2C]'
                                            : 'text-white/40 hover:text-white/70'
                                        }`}
                                      >
                                        Manual
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="bg-rose-500/15 text-rose-400 px-2.5 py-0.5 rounded-full text-[9px] font-black border border-rose-500/20 flex items-center gap-1 uppercase tracking-wider">
                                      Repasse: {fmtCurrency(prof.payout_final ?? prof.payout_total)}
                                      {prof.payout_mode === 'manual' && (
                                        <span className="text-[8px] bg-[#FFD600] text-black px-1 rounded font-bold ml-1">MANUAL</span>
                                      )}
                                    </span>
                                  )}
                                </div>

                                {/* Inputs for Manual / Observations */}
                                {isEditable ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                    {prof.payout_mode === 'manual' ? (
                                      <div className="space-y-1">
                                        <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest">Repasse Manual (R$)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={prof.payout_final ?? ''}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const updatedProfs = selectedClosing.data_snapshot.professionals.map((p: any) => {
                                              if (p.fono_id === prof.fono_id) {
                                                return {
                                                  ...p,
                                                  payout_final: val
                                                };
                                              }
                                              return p;
                                            });
                                            const newTotalPayout = updatedProfs.reduce((sum: number, p: any) => sum + (p.payout_final || 0), 0);
                                            setSelectedClosing({
                                              ...selectedClosing,
                                              total_payout: Number(newTotalPayout.toFixed(2)),
                                              data_snapshot: {
                                                ...selectedClosing.data_snapshot,
                                                totals: {
                                                  ...selectedClosing.data_snapshot.totals,
                                                  total_payout: Number(newTotalPayout.toFixed(2))
                                                },
                                                professionals: updatedProfs
                                              }
                                            });
                                          }}
                                          className="w-full px-2.5 py-1.5 bg-[#0f1335] border border-white/10 rounded-lg font-bold text-white outline-none focus:border-[#FFD600]/30 text-xs"
                                          placeholder="0,00"
                                        />
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest">Repasse Calculado</label>
                                        <div className="px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5 font-bold text-white text-xs select-none">
                                          {fmtCurrency(prof.payout_calculated ?? prof.payout_total)}
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest">Observações / Ajustes</label>
                                      <input
                                        type="text"
                                        value={prof.notes || ''}
                                        onChange={(e) => {
                                          const updatedProfs = selectedClosing.data_snapshot.professionals.map((p: any) => {
                                            if (p.fono_id === prof.fono_id) {
                                              return {
                                                ...p,
                                                notes: e.target.value
                                              };
                                            }
                                            return p;
                                          });
                                          setSelectedClosing({
                                            ...selectedClosing,
                                            data_snapshot: {
                                              ...selectedClosing.data_snapshot,
                                              professionals: updatedProfs
                                            }
                                          });
                                        }}
                                        className="w-full px-2.5 py-1.5 bg-[#0f1335] border border-white/10 rounded-lg text-white outline-none focus:border-[#FFD600]/30 text-xs placeholder-white/25"
                                        placeholder="Ex: Bônus, Desconto por faltas..."
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  /* Static details for final close snapshot */
                                  (prof.notes || prof.payout_mode === 'manual') && (
                                    <div className="bg-[#0f1335]/50 border border-white/5 p-2 rounded-lg text-[10px] space-y-1">
                                      {prof.payout_mode === 'manual' && (
                                        <div>
                                          <span className="font-extrabold text-amber-400">Modo:</span> <span className="text-white/80">Informado Manualmente (Calculado: {fmtCurrency(prof.payout_calculated ?? prof.payout_total)})</span>
                                        </div>
                                      )}
                                      {prof.notes && (
                                        <div>
                                          <span className="font-extrabold text-[#FFD600]">Obs:</span> <span className="text-white/80 italic">&quot;{prof.notes}&quot;</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}

                                {/* Metrics Summary */}
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[9px] text-white/40 font-semibold font-bold">
                                  <div>
                                    <span className="block text-[8px] text-white/35 uppercase tracking-wider">Produção Bruta</span>
                                    <span className="text-white font-black">{fmtCurrency(prof.net_total)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[8px] text-white/35 uppercase tracking-wider">Valor Repasse</span>
                                    <span className="text-[#00E676] font-black">{fmtCurrency(prof.payout_final ?? prof.payout_total)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[8px] text-white/35 uppercase tracking-wider">Diferença Clínica</span>
                                    <span className="text-sky-400 font-black">{fmtCurrency(Number((prof.net_total - (prof.payout_final ?? prof.payout_total)).toFixed(2)))}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Detail */}
                  <div className="space-y-4">
                    <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><Briefcase size={14} className="text-sky-400" /> Snapshot: Produção por Empresa</span>
                      {/* Save button if DRAFT or REOPENED */}
                      {(selectedClosing.status === 'DRAFT' || selectedClosing.status === 'REOPENED') && (
                        <button
                          onClick={async () => {
                            try {
                              await weeklyClosingsService.updateWeeklyClosing(selectedClosing.id, {
                                data_snapshot: selectedClosing.data_snapshot,
                                total_payout: selectedClosing.total_payout
                              });
                              await loadWeeklyClosings();
                              alert('Ajustes de produção e repasses salvos com sucesso!');
                            } catch (err) {
                              console.error(err);
                              alert('Erro ao salvar ajustes.');
                            }
                          }}
                          className="px-3 py-1.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-[10px] rounded-lg transition-all uppercase tracking-wider"
                        >
                          Salvar Ajustes
                        </button>
                      )}
                    </h3>
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 overflow-hidden">
                      <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {selectedClosing.data_snapshot?.professionals?.map((prof: any) => (
                          <div key={prof.fono_id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                            <span className="font-extrabold text-white text-xs block uppercase tracking-wider border-b border-white/5 pb-1">{prof.name}</span>
                            <div className="space-y-1.5">
                              {prof.company_production && Object.entries(prof.company_production).map(([compName, count]) => {
                                const isEditable = selectedClosing.status === 'DRAFT' || selectedClosing.status === 'REOPENED';
                                return (
                                  <div key={compName} className="flex justify-between items-center text-xs">
                                    <span className="text-white/60">{compName}</span>
                                    <div className="flex items-center gap-2">
                                      {isEditable ? (
                                        <input
                                          type="number"
                                          min="0"
                                          value={count as number}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setSelectedClosing((prev: any) => {
                                              if (!prev) return prev;
                                              const updatedProfs = prev.data_snapshot.professionals.map((p: any) => {
                                                if (p.fono_id === prof.fono_id) {
                                                  return {
                                                    ...p,
                                                    company_production: {
                                                      ...p.company_production,
                                                      [compName]: val
                                                    }
                                                  };
                                                }
                                                return p;
                                              });
                                              return {
                                                ...prev,
                                                data_snapshot: {
                                                  ...prev.data_snapshot,
                                                  professionals: updatedProfs
                                                }
                                              };
                                            });
                                          }}
                                          className="w-16 px-2 py-0.5 text-center bg-[#0f1335] border border-white/10 rounded font-bold text-white outline-none text-xs"
                                        />
                                      ) : (
                                        <span className="font-extrabold text-sky-400">{count as number}</span>
                                      )}
                                      <span className="text-[10px] text-white/40">pacientes</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {(!prof.company_production || Object.keys(prof.company_production).length === 0) && (
                                <p className="text-[10px] text-white/30 italic">Nenhum atendimento realizado.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsClosingDetailModalOpen(false);
                    setSelectedClosing(null);
                  }}
                  className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-4 px-8 rounded-2xl transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-[#FFD600]/10"
                >
                  Fechar Detalhes
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDeleteConfirmModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0A0F2C]/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-md overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Confirmar Exclusão</h3>
                    <p className="text-[10px] text-white/50 font-semibold mt-0.5">Esta ação é irreversível</p>
                  </div>
                </div>
                <button
                  onClick={() => !deletingClosing && setIsDeleteConfirmModalOpen(false)}
                  disabled={deletingClosing}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-center">
                <p className="text-xs text-white/70 font-medium leading-relaxed">
                  Tem certeza de que deseja excluir permanentemente este fechamento semanal? Todos os dados históricos desse fechamento e os snapshots serão removidos de forma definitiva.
                </p>

                {deleteErrorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-left flex items-start gap-2 text-[11px] text-rose-400 font-bold">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{deleteErrorMessage}</span>
                  </div>
                )}

                {deleteSuccessMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left flex items-start gap-2 text-[11px] text-[#00E676] font-bold">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    <span>{deleteSuccessMessage}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deletingClosing}
                  onClick={() => setIsDeleteConfirmModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 font-bold rounded-xl transition-all uppercase tracking-wider text-[10px] cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deletingClosing}
                  onClick={handleDeleteClosing}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-extrabold rounded-xl transition-all uppercase tracking-wider text-[10px] shadow-lg shadow-rose-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deletingClosing ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Confirmar Exclusão'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL POPUPS / DETAIL & HISTORY MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && selectedBilling && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-[#FFD600] uppercase tracking-widest bg-[#FFD600]/10 border border-[#FFD600]/10 px-2.5 py-1 rounded-full">
                    Histórico de Lançamentos
                  </span>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider mt-2.5 max-w-[400px] truncate">
                    {selectedBilling.appointments?.patients?.full_name || selectedBilling.appointments?.patient_name}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* BILL INFO SNAPSHOT */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <span className="block text-[9px] font-bold text-white/30 uppercase tracking-widest">Valor Líquido</span>
                    <span className="font-extrabold text-white text-sm">{fmtCurrency(selectedBilling.net_total || 0)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-white/30 uppercase tracking-widest">Vencimento</span>
                    <span className="font-bold text-white/80 text-sm">
                      {selectedBilling.due_date ? new Date(selectedBilling.due_date).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-white/30 uppercase tracking-widest">Nota Fiscal #</span>
                    <span className="font-mono text-sm font-bold text-[#FFD600]">
                      {selectedBilling.invoice_number || 'Não emitida'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-white/30 uppercase tracking-widest">Status Atual</span>
                    <span className="font-mono text-xs font-black uppercase text-white/90">
                      {getStatusStyle(selectedBilling.status).label}
                    </span>
                  </div>
                </div>

                {/* TRANSACTIONS LIST */}
                <div className="space-y-4">
                  <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <History size={14} className="text-[#FFD600]" /> Lançamentos de Crédito / Débito
                  </h3>

                  {selectedBilling.billing_transactions?.length === 0 ? (
                    <div className="p-8 text-center text-white/30 text-xs font-semibold bg-white/[0.01] border border-white/5 rounded-2xl">
                      Nenhum pagamento registrado ainda.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedBilling.billing_transactions.map((tx: BillingTransaction) => {
                        const isRefund = tx.status === 'REFUNDED';
                        const isFailed = tx.status === 'FAILED';

                        return (
                          <div 
                            key={tx.id} 
                            className={`p-4 rounded-2xl flex items-center justify-between border ${
                              isRefund 
                                ? 'bg-purple-950/10 border-purple-500/20 text-purple-400' 
                                : isFailed 
                                ? 'bg-rose-950/10 border-rose-500/20 text-rose-400' 
                                : 'bg-white/5 border-white/5 text-white/80'
                            }`}
                          >
                            <div className="text-xs">
                              <span className="block font-black text-white uppercase tracking-wider">{tx.payment_method}</span>
                              <span className="text-[10px] text-white/40 block mt-0.5">
                                {new Date(tx.payment_date).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className={`font-extrabold text-sm ${isRefund ? 'text-purple-400' : 'text-white'}`}>
                                  {fmtCurrency(tx.amount || 0)}
                                </span>
                                <span className="block text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
                                  {tx.status}
                                </span>
                              </div>

                              {profile?.role !== 'FONO' && tx.status === 'CLEARED' && (
                                <button
                                  onClick={() => handleRefundTransaction(tx.id)}
                                  className="px-2 py-1 rounded bg-[#FFD600]/10 border border-[#FFD600]/30 hover:bg-rose-500/10 hover:border-rose-500/30 text-white/60 hover:text-rose-450 font-bold text-[9px] transition-all uppercase tracking-wider"
                                >
                                  Estornar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-white font-black py-3 px-6 rounded-2xl border border-white/10 transition-all uppercase tracking-widest text-[10px]"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REGISTRATION OF PAYMENT MODAL */}
      <AnimatePresence>
        {isPaymentModalOpen && paymentBilling && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-md overflow-hidden border border-white/10 shadow-2xl relative"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-black uppercase tracking-wider text-white">Registrar Pagamento</h2>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmPayment} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {(() => {
                  const appt = paymentBilling.appointments || {};
                  const patient = appt.patients?.full_name || appt.patient_name || 'Paciente Geral';
                  const prof = appt.profiles?.full_name || 'Profissional';
                  const type = appt.appointment_types?.name || 'Consulta';
                  const dateFmt = appt.appointment_date ? new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--/--/----';
                  const timeFmt = (appt.start_time || '').substring(0, 5).replace(':', 'h');
                  const gross = appt.agreed_price ?? paymentBilling.gross_total ?? 0;
                  const discount = appt.discount_value ?? paymentBilling.discount_total ?? 0;
                  const net = appt.net_value ?? paymentBilling.net_total ?? 0;

                  return (
                    <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                      {/* Mother Appointment Header (UX Improvement) */}
                      <div className="p-3.5 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] text-xs font-bold leading-relaxed">
                        📌 Consulta vinculada: <span className="font-black text-white">Consulta de {dateFmt} às {timeFmt} – {type} – {patient}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-white/40 block">Paciente</span>
                          <span className="text-white font-extrabold">{patient}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Profissional</span>
                          <span className="text-white font-extrabold">{prof}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Data e Horário</span>
                          <span className="text-white font-extrabold">{dateFmt} às {timeFmt}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Tipo de Consulta</span>
                          <span className="text-white font-extrabold">{type}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div>
                          <span className="text-white/40 block text-[9px]">Bruto</span>
                          <span className="text-white font-bold">{fmtCurrency(gross)}</span>
                        </div>
                        <div>
                          <span className="text-rose-400/80 block text-[9px]">Desconto</span>
                          <span className="text-rose-400 font-bold">-{fmtCurrency(discount)}</span>
                        </div>
                        <div>
                          <span className="text-emerald-400 block text-[9px]">Valor Líquido</span>
                          <span className="text-emerald-400 font-extrabold">{fmtCurrency(net)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Valor do Lançamento (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
                    value={paymentData.amount || ''}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Forma de Pagamento
                  </label>
                  <select
                    className="w-full px-5 py-3.5 rounded-2xl bg-[#0f1335] border border-white/10 text-white font-bold text-sm outline-none cursor-pointer"
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value as PaymentMethod })}
                  >
                    <option value="PIX">PIX</option>
                    <option value="CASH">Dinheiro (CASH)</option>
                    <option value="DEBIT">Cartão de Débito</option>
                    <option value="CREDIT">Cartão de Crédito</option>
                    <option value="TRANSFER">Transferência</option>
                    <option value="BOLETO">Boleto Bancário</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">
                      Lançamentos (Parcelas)
                    </label>
                    <span className="text-[#FFD600] font-black text-xs">{paymentData.installments}x</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-[#FFD600]/50"
                    value={paymentData.installments}
                    onChange={(e) => setPaymentData({ ...paymentData, installments: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-[10px] font-medium text-white/40 italic">
                    Ao configurar parcelas, o sistema gerará o histórico fragmentado automaticamente.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Data do Lançamento
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-[#0f1335] border border-white/10 text-white outline-none cursor-pointer"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Observações
                  </label>
                  <textarea
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white outline-none min-h-[60px] resize-none"
                    placeholder="Opcional..."
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 px-6 rounded-2xl border border-white/10 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-4 px-6 rounded-2xl shadow-lg shadow-[#FFD600]/10 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTE FISCAL DIALOG (EMITIR NF) */}
      <AnimatePresence>
        {isInvoiceModalOpen && invoiceBilling && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-sm overflow-hidden border border-white/10 shadow-2xl relative"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-black uppercase tracking-wider text-white">Número da Nota Fiscal</h2>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveInvoice} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Número da NF-e
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NF-2026-99"
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600] font-mono font-bold"
                    value={invoiceNumberInput}
                    onChange={(e) => setInvoiceNumberInput(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 px-6 rounded-2xl border border-white/10 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-4 px-6 rounded-2xl shadow-lg shadow-[#FFD600]/10 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Salvar NF
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
