'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Building2, Calendar, DollarSign,
  CheckCircle, AlertTriangle, Clock, Send, XCircle,
  ChevronDown, ChevronUp, Eye, Plus, RefreshCw,
  Banknote, Receipt, TrendingUp, Filter, ArrowRight,
  CreditCard, Download, Printer, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface Customer {
  id: string;
  companyName: string;
  companyNameKana?: string;
  customerCode?: string;
  contactName?: string;
  email?: string;
  billingClosingDay?: number;
  billingDueDay?: number;
  paymentTerms?: number;
  billingCycle?: string;
  pendingOrdersCount: number;
  pendingTotal: number;
  pendingSubtotal: number;
  pendingTax: number;
}

interface InvoicePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  bankName?: string;
  bankBranch?: string;
  transferReference?: string;
  confirmedBy?: string;
  notes?: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    companyName: string;
    companyNameKana?: string;
    customerCode?: string;
    contactName?: string;
    email?: string;
  };
  billingCustomer?: { id: string; companyName: string; customerCode?: string };
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
  previousBalance: number;
  previousPayment: number;
  carryoverAmount: number;
  periodSales: number;
  periodTax: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  issuedAt?: string;
  sentAt?: string;
  payments: InvoicePayment[];
  orders?: any[];
  _count?: { orders: number };
  notes?: string;
  internalNotes?: string;
}

interface Stats {
  total: { amount: number; count: number };
  unpaid: { amount: number; count: number };
  overdue: { amount: number; count: number };
  paid: { amount: number; count: number };
}

interface DashboardSummary {
  totalUnpaid: { amount: number; count: number };
  overdue: { amount: number; count: number };
  dueThisMonth: { amount: number; count: number };
  recentPayments: any[];
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const formatYen = (n: number) => `\u00a5${n.toLocaleString('ja-JP')}`;
const formatDate = (s: string) => new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
const formatDateShort = (s: string) => new Date(s).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

const statusConfig: Record<string, { label: string; labelJa: string; color: string; icon: any }> = {
  DRAFT: { label: 'Rascunho', labelJa: '\u4e0b\u66f8\u304d', color: 'bg-gray-100 text-gray-700', icon: FileText },
  ISSUED: { label: 'Emitida', labelJa: '\u767a\u884c\u6e08\u307f', color: 'bg-blue-100 text-blue-700', icon: FileText },
  SENT: { label: 'Enviada', labelJa: '\u9001\u4fe1\u6e08\u307f', color: 'bg-indigo-100 text-indigo-700', icon: Send },
  PARTIAL: { label: 'Parcial', labelJa: '\u4e00\u90e8\u5165\u91d1', color: 'bg-amber-100 text-amber-700', icon: CreditCard },
  PAID: { label: 'Paga', labelJa: '\u652f\u6255\u6e08\u307f', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  OVERDUE: { label: 'Vencida', labelJa: '\u671f\u9650\u8d85\u904e', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelada', labelJa: '\u30ad\u30e3\u30f3\u30bb\u30eb', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function InvoicingPage() {
  // Tab: 'dashboard' | 'invoices' | 'close' | 'detail'
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Invoices list
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Close (締め処理)
  const [closableCustomers, setClosableCustomers] = useState<Customer[]>([]);
  const [closingCustomerId, setClosingCustomerId] = useState<string | null>(null);
  const [closingLoading, setClosingLoading] = useState(false);

  // Detail
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer', bankName: '', bankBranch: '',
    transferReference: '', confirmedBy: '', notes: '',
  });

  // ─────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/api/invoicing/summary/dashboard');
      if (data.success) setSummary(data.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/api/invoicing', { params });
      if (data.success) {
        setInvoices(data.data);
        setStats(data.stats);
        setTotalPages(Math.ceil(data.pagination.total / data.pagination.limit));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, statusFilter]);

  const fetchClosable = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/invoicing/customers/closable');
      if (data.success) setClosableCustomers(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const fetchInvoiceDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/invoicing/${id}`);
      if (data.success) {
        setSelectedInvoice(data.data);
        setActiveTab('detail');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchSummary();
    if (activeTab === 'invoices') fetchInvoices();
    if (activeTab === 'close') fetchClosable();
  }, [activeTab, fetchSummary, fetchInvoices, fetchClosable]);

  // ─────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────

  const handleClose = async (customerId: string) => {
    if (!confirm('Fechar período para este cliente?\n\u3053\u306e\u5f97\u610f\u5148\u306e\u7de0\u3081\u51e6\u7406\u3092\u5b9f\u884c\u3057\u307e\u3059\u304b\uff1f')) return;
    setClosingLoading(true);
    setClosingCustomerId(customerId);
    try {
      const { data } = await api.post('/api/invoicing/close', {
        customerId, issuedBy: 'admin',
      });
      if (data.success) {
        alert(`Fatura ${data.data.invoiceNumber} criada!\n${data.summary.ordersCount} pedidos, total ${formatYen(data.summary.totalAmount)}`);
        fetchClosable();
        fetchSummary();
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Erro ao fechar';
      alert(msg);
    }
    setClosingLoading(false);
    setClosingCustomerId(null);
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentForm.amount || !paymentForm.paymentDate) return;
    try {
      const { data } = await api.post(`/api/invoicing/${selectedInvoice.id}/payment`, {
        ...paymentForm, amount: parseInt(paymentForm.amount),
      });
      if (data.success) {
        alert('Pagamento registrado!\n\u5165\u91d1\u3092\u767b\u9332\u3057\u307e\u3057\u305f');
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'bank_transfer', bankName: '', bankBranch: '', transferReference: '', confirmedBy: '', notes: '' });
        fetchInvoiceDetail(selectedInvoice.id);
        fetchSummary();
      }
    } catch (e) { console.error(e); alert('Erro ao registrar pagamento'); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.put(`/api/invoicing/${id}/status`, { status, sentBy: 'admin' });
      if (selectedInvoice) fetchInvoiceDetail(id);
      fetchInvoices();
    } catch (e) { console.error(e); }
  };

  const handleCheckOverdue = async () => {
    try {
      const { data } = await api.post('/api/invoicing/check-overdue');
      if (data.success) {
        alert(`${data.updated} faturas marcadas como vencidas`);
        fetchInvoices();
        fetchSummary();
      }
    } catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = statusConfig[status] || statusConfig.DRAFT;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon size={12} />
        {cfg.labelJa}
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // TAB: Dashboard
  // ═══════════════════════════════════════════════════════════

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg"><DollarSign size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">売掛金残高</p>
              <p className="text-[10px] text-gray-400">Contas a receber</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatYen(summary?.totalUnpaid.amount || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">{summary?.totalUnpaid.count || 0} faturas</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-red-600" /></div>
            <div>
              <p className="text-xs text-gray-500">期限超過</p>
              <p className="text-[10px] text-gray-400">Vencidas</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatYen(summary?.overdue.amount || 0)}</p>
          <p className="text-xs text-red-500 mt-1">{summary?.overdue.count || 0} faturas</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-lg"><Calendar size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">今月期限</p>
              <p className="text-[10px] text-gray-400">Vence este m&ecirc;s</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatYen(summary?.dueThisMonth.amount || 0)}</p>
          <p className="text-xs text-amber-500 mt-1">{summary?.dueThisMonth.count || 0} faturas</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">最近の入金</p>
              <p className="text-[10px] text-gray-400">Pagamentos recentes</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{summary?.recentPayments.length || 0}</p>
          <p className="text-xs text-green-500 mt-1">registros</p>
        </div>
      </div>

      {/* Recent payments table */}
      {summary?.recentPayments && summary.recentPayments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">最近の入金 / Pagamentos Recentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">請求書</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">得意先</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">入金額</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">入金日</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentPayments.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">{p.invoice?.invoiceNumber}</td>
                    <td className="py-2 px-3">{p.invoice?.customer?.companyName}</td>
                    <td className="py-2 px-3 text-right font-medium text-green-600">{formatYen(p.amount)}</td>
                    <td className="py-2 px-3 text-gray-500">{formatDate(p.paymentDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // TAB: Invoices (請求締切一覧表)
  // ═══════════════════════════════════════════════════════════

  const renderInvoices = () => (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '全体', labelPt: 'Total', value: stats.total.amount, count: stats.total.count, color: 'text-gray-700' },
            { label: '未払い', labelPt: 'Em aberto', value: stats.unpaid.amount, count: stats.unpaid.count, color: 'text-blue-600' },
            { label: '期限超過', labelPt: 'Vencidas', value: stats.overdue.amount, count: stats.overdue.count, color: 'text-red-600' },
            { label: '支払済', labelPt: 'Pagas', value: stats.paid.amount, count: stats.paid.count, color: 'text-green-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] text-gray-400">{s.label} / {s.labelPt}</p>
              <p className={`text-lg font-bold ${s.color}`}>{formatYen(s.value)}</p>
              <p className="text-[10px] text-gray-400">{s.count} faturas</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3">
        <Filter size={16} className="text-gray-400" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="all">全て / Todos</option>
          <option value="unpaid">未払い / Em aberto</option>
          <option value="issued">発行済み / Emitidas</option>
          <option value="sent">送信済み / Enviadas</option>
          <option value="partial">一部入金 / Parcial</option>
          <option value="paid">支払済み / Pagas</option>
          <option value="overdue">期限超過 / Vencidas</option>
        </select>
        <button type="button" onClick={handleCheckOverdue}
          className="ml-auto text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
          <RefreshCw size={12} /> 期限チェック
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs">請求書番号</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs">得意先</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs">締め日</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs">支払期限</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium text-xs">繰越金額</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium text-xs">今回売上</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium text-xs">消費税</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium text-xs">請求額</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium text-xs">入金額</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium text-xs">残高</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium text-xs">状態</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium text-xs"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>まだ請求書がありません</p>
                  <p className="text-xs">Nenhuma fatura encontrada</p>
                </td></tr>
              ) : invoices.map((inv) => {
                const isOverdue = inv.status === 'OVERDUE';
                return (
                  <tr key={inv.id} className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${isOverdue ? 'bg-red-50/30' : ''}`}
                    onClick={() => fetchInvoiceDetail(inv.id)}>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800 text-xs">{inv.customer?.customerCode ? `[${inv.customer.customerCode}] ` : ''}{inv.customer?.companyName}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{formatDate(inv.closingDate)}</td>
                    <td className={`py-3 px-4 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{formatDate(inv.dueDate)}</td>
                    <td className="py-3 px-4 text-right text-xs text-gray-500">{inv.carryoverAmount > 0 ? formatYen(inv.carryoverAmount) : '-'}</td>
                    <td className="py-3 px-4 text-right text-xs">{formatYen(inv.periodSales)}</td>
                    <td className="py-3 px-4 text-right text-xs text-gray-500">{formatYen(inv.periodTax)}</td>
                    <td className="py-3 px-4 text-right text-xs font-bold">{formatYen(inv.totalAmount)}</td>
                    <td className="py-3 px-4 text-right text-xs text-green-600">{inv.paidAmount > 0 ? formatYen(inv.paidAmount) : '-'}</td>
                    <td className={`py-3 px-4 text-right text-xs font-bold ${inv.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {inv.remainingAmount > 0 ? formatYen(inv.remainingAmount) : formatYen(0)}
                    </td>
                    <td className="py-3 px-4 text-center"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 px-4 text-center">
                      <button type="button" onClick={(e) => { e.stopPropagation(); fetchInvoiceDetail(inv.id); }}
                        className="text-gray-400 hover:text-blue-600"><Eye size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
              <ChevronLeft size={14} /> 前へ
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
              次へ <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // TAB: Close (締め処理)
  // ═══════════════════════════════════════════════════════════

  const renderClose = () => (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800 font-medium">締め処理 / Fechamento de Per&iacute;odo</p>
        <p className="text-xs text-amber-600 mt-1">
          Selecione um cliente para fechar o per&iacute;odo e gerar a fatura consolidada com todos os pedidos INVOICE pendentes.
        </p>
      </div>

      {closableCustomers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
          <p>全ての得意先が締め済みです</p>
          <p className="text-xs">Todos os clientes est&atilde;o em dia</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {closableCustomers.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {c.customerCode ? `[${c.customerCode}] ` : ''}{c.companyName}
                    </p>
                    {c.companyNameKana && <p className="text-xs text-gray-400">{c.companyNameKana}</p>}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>締日: {c.billingClosingDay || 31}日</span>
                      <span>支払: {c.billingDueDay || 10}日</span>
                      <span>サイクル: {c.billingCycle || 'MONTHLY'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatYen(c.pendingTotal)}</p>
                  <p className="text-xs text-gray-500">{c.pendingOrdersCount} pedidos pendentes</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                    <span>売上: {formatYen(c.pendingSubtotal)}</span>
                    <span>税: {formatYen(c.pendingTax)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => handleClose(c.id)}
                  disabled={closingLoading && closingCustomerId === c.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50">
                  {closingLoading && closingCustomerId === c.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <FileText size={14} />
                  )}
                  締め処理を実行 / Fechar Per&iacute;odo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // TAB: Detail (fatura individual)
  // ═══════════════════════════════════════════════════════════

  const renderDetail = () => {
    if (!selectedInvoice) return null;
    const inv = selectedInvoice;
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setActiveTab('invoices'); setSelectedInvoice(null); }}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">請求書 {inv.invoiceNumber}</h2>
            <p className="text-xs text-gray-500">{inv.customer?.companyName}</p>
          </div>
          <div className="ml-auto"><StatusBadge status={inv.status} /></div>
        </div>

        {/* Summary card (Yayoi style) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-[10px] text-gray-400">得意先コード</p>
              <p className="font-mono font-medium">{inv.customer?.customerCode || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">締め期間</p>
              <p className="text-sm">{formatDate(inv.periodStart)} ~ {formatDate(inv.periodEnd)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">締め日</p>
              <p className="text-sm">{formatDate(inv.closingDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">支払期限</p>
              <p className={`text-sm font-medium ${inv.status === 'OVERDUE' ? 'text-red-600' : ''}`}>{formatDate(inv.dueDate)}</p>
            </div>
          </div>

          {/* Yayoi-style breakdown */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-600 font-medium">前回請求額 / Fatura anterior</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatYen(inv.previousBalance)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 text-gray-600">入金額 / Valor pago anterior</td>
                  <td className="py-2.5 px-4 text-right font-mono text-green-600">- {formatYen(inv.previousPayment)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-amber-50">
                  <td className="py-2.5 px-4 text-amber-700 font-medium">繰越金額 / Saldo transferido</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">{formatYen(inv.carryoverAmount)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 text-gray-600">今回売上額 / Vendas do per&iacute;odo ({inv.orders?.length || inv._count?.orders || 0} pedidos)</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatYen(inv.periodSales)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2.5 px-4 text-gray-600">消費税額 / Imposto</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatYen(inv.periodTax)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-blue-50">
                  <td className="py-3 px-4 text-blue-800 font-bold text-base">今回請求額 / Total desta fatura</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-800 text-base">{formatYen(inv.totalAmount)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 text-green-700">入金済額 / Total pago</td>
                  <td className="py-2.5 px-4 text-right font-mono text-green-600">{formatYen(inv.paidAmount)}</td>
                </tr>
                <tr className={inv.remainingAmount > 0 ? 'bg-red-50' : 'bg-green-50'}>
                  <td className={`py-3 px-4 font-bold text-base ${inv.remainingAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    残高 / Saldo restante
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold text-base ${inv.remainingAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatYen(inv.remainingAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
            <button type="button" onClick={() => { setPaymentForm({ ...paymentForm, amount: String(inv.remainingAmount) }); setShowPaymentModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              <Banknote size={14} /> 入金登録 / Registrar Pagamento
            </button>
          )}
          {inv.status === 'ISSUED' && (
            <button type="button" onClick={() => handleStatusUpdate(inv.id, 'SENT')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              <Send size={14} /> 送信済みにする
            </button>
          )}
        </div>

        {/* Orders list */}
        {inv.orders && inv.orders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">注文一覧 / Pedidos ({inv.orders.length})</h3>
            <div className="space-y-3">
              {inv.orders.map((order: any) => (
                <div key={order.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-blue-600">{order.orderNumber}</span>
                    <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="space-y-1">
                    {order.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{item.nameJa || item.namePt} x{item.quantity}</span>
                        <span className="font-mono">{formatYen(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                    <span className="text-sm font-bold">{formatYen(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payments history */}
        {inv.payments && inv.payments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">入金履歴 / Hist&oacute;rico de Pagamentos</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">入金日</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">方法</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">銀行</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">参照</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium text-xs">金額</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">担当</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 px-3">{formatDate(p.paymentDate)}</td>
                    <td className="py-2 px-3 text-xs">{p.paymentMethod || '-'}</td>
                    <td className="py-2 px-3 text-xs">{p.bankName || '-'}</td>
                    <td className="py-2 px-3 text-xs font-mono">{p.transferReference || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-green-600">{formatYen(p.amount)}</td>
                    <td className="py-2 px-3 text-xs text-gray-500">{p.confirmedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // Payment Modal
  // ═══════════════════════════════════════════════════════════

  const renderPaymentModal = () => {
    if (!showPaymentModal || !selectedInvoice) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">入金登録 / Registrar Pagamento</h3>
            <p className="text-xs text-gray-500 mt-1">{selectedInvoice.invoiceNumber} - {selectedInvoice.customer?.companyName}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">残高: {formatYen(selectedInvoice.remainingAmount)}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">入金額 / Valor *</label>
                <input type="number" value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">入金日 / Data *</label>
                <input type="date" value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">支払方法 / M&eacute;todo</label>
              <select value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="bank_transfer">振込 / Transfer&ecirc;ncia</option>
                <option value="cash">現金 / Dinheiro</option>
                <option value="check">小切手 / Cheque</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">銀行名 / Banco</label>
                <input type="text" value={paymentForm.bankName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">支店 / Ag&ecirc;ncia</label>
                <input type="text" value={paymentForm.bankBranch}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankBranch: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">振込参照 / Refer&ecirc;ncia</label>
              <input type="text" value={paymentForm.transferReference}
                onChange={(e) => setPaymentForm({ ...paymentForm, transferReference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">担当者 / Respons&aacute;vel</label>
              <input type="text" value={paymentForm.confirmedBy}
                onChange={(e) => setPaymentForm({ ...paymentForm, confirmedBy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">メモ / Observa&ccedil;&otilde;es</label>
              <textarea value={paymentForm.notes} rows={2}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowPaymentModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
            <button type="button" onClick={handlePayment}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
              入金を登録
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // Main render
  // ═══════════════════════════════════════════════════════════

  const tabs = [
    { key: 'dashboard', label: 'ダッシュボード', labelPt: 'Dashboard', icon: TrendingUp },
    { key: 'invoices', label: '請求一覧', labelPt: 'Faturas', icon: FileText },
    { key: 'close', label: '締め処理', labelPt: 'Fechamento', icon: Calendar },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">請求管理</h1>
          <p className="text-sm text-gray-500">Faturamento Consolidado / Invoice Management</p>
        </div>
      </div>

      {/* Tabs */}
      {activeTab !== 'detail' && (
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={16} />
                <span>{tab.label}</span>
                <span className="text-[10px] text-gray-400 hidden md:inline">/ {tab.labelPt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Content */}
      {!loading && activeTab === 'dashboard' && renderDashboard()}
      {!loading && activeTab === 'invoices' && renderInvoices()}
      {!loading && activeTab === 'close' && renderClose()}
      {activeTab === 'detail' && renderDetail()}

      {/* Payment Modal */}
      {renderPaymentModal()}
    </div>
  );
}
