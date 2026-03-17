'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, Download, Eye, RefreshCw,
  CheckCircle, XCircle, Clock, AlertTriangle, Send,
  Building2, Printer, ArrowUpDown, Receipt
} from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

// Types — match Prisma Order model for INVOICE payment method
interface InvoiceOrder {
  id: string;
  orderNumber?: string;
  customer?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    companyNameKana?: string;
    email?: string;
    type?: string;
  };
  subtotal?: number;
  taxAmount?: number;
  shippingCost?: number;
  daibikiFee?: number;
  total?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt?: string;
  paidAt?: string;
  invoiceDueDate?: string;
  invoiceNumber?: string;
  internalNotes?: string;
}

interface InvoiceStats {
  pending: { count: number; total: number };
  overdue: { count: number; total: number };
  paid: { count: number; total: number };
}

function customerName(c?: InvoiceOrder['customer']): string {
  if (!c) return '—';
  if (c.companyName) return c.companyName;
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—';
}

function yen(n?: number | null): string { return `¥${(n || 0).toLocaleString('ja-JP')}`; }
function fmtDate(s?: string | null): string { return s ? new Date(s).toLocaleDateString('ja-JP') : '—'; }

function isOverdue(dueDate?: string | null, status?: string): boolean {
  if (!dueDate || status === 'PAID' || status === 'CANCELED') return false;
  return new Date(dueDate) < new Date();
}

function daysUntilDue(dueDate?: string | null): number {
  if (!dueDate) return 0;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
}

const statusConfig: Record<string, { pt: string; ja: string; color: string; icon: typeof Clock }> = {
  PENDING: { pt: 'Pendente', ja: '未払い', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  INVOICED: { pt: 'Faturada', ja: '請求済み', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Send },
  PAID: { pt: 'Paga', ja: '支払済み', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  CANCELED: { pt: 'Cancelada', ja: 'キャンセル', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
};

function InvoiceDetailModal({ order, onClose }: { order: InvoiceOrder; onClose: () => void }) {
  const overdue = isOverdue(order.invoiceDueDate, order.paymentStatus);
  const dueDays = daysUntilDue(order.invoiceDueDate);
  const cfg = statusConfig[order.paymentStatus || 'PENDING'] || statusConfig.PENDING;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText size={20} className="text-orange-500" />
              Fatura {order.invoiceNumber || order.orderNumber || order.id.slice(0, 12)}
            </h3>
            <p className="text-sm text-gray-500 mt-1">Pedido {order.orderNumber || order.id.slice(0, 12)}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${overdue ? 'bg-red-100 text-red-700 border-red-200' : cfg.color}`}>
            {overdue ? <AlertTriangle size={12} /> : <Icon size={12} />}
            {overdue ? '期限超過' : `${cfg.pt} / ${cfg.ja}`}
          </span>
        </div>
        <div className="p-6 bg-gray-50 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Building2 size={20} className="text-blue-600" /></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{customerName(order.customer)}</p>
              <p className="text-sm text-gray-500">{order.customer?.email || ''}</p>
              {order.customer?.companyNameKana && <p className="text-xs text-gray-400">{order.customer.companyNameKana}</p>}
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Data Emissão / 発行日</p><p className="text-sm font-medium">{fmtDate(order.createdAt)}</p></div>
            <div className={`rounded-lg p-3 ${overdue ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 mb-1">Vencimento / 支払期限</p>
              <p className={`text-sm font-medium ${overdue ? 'text-red-600' : ''}`}>
                {fmtDate(order.invoiceDueDate)}
                {order.paymentStatus !== 'PAID' && order.paymentStatus !== 'CANCELED' && order.invoiceDueDate && (
                  <span className={`ml-2 text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                    ({overdue ? `${Math.abs(dueDays)}日超過` : `あと${dueDays}日`})
                  </span>
                )}
              </p>
            </div>
            {order.paidAt && <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">支払日</p><p className="text-sm font-medium text-green-700">{fmtDate(order.paidAt)}</p></div>}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Valores / 金額</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{yen(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">送料</span><span>{yen(order.shippingCost)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">税</span><span>{yen(order.taxAmount)}</span></div>
              {(order.daibikiFee || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">代引手数料</span><span>{yen(order.daibikiFee)}</span></div>}
              <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-base"><span>合計</span><span className="text-orange-600">{yen(order.total)}</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">帳票 / Documentos</h4>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => window.open(`${api.defaults.baseURL}/api/documents/nouhinsho/${order.id}/html`, '_blank')} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                <Receipt size={16} className="text-blue-600" /><div className="text-left"><p className="font-medium">納品書</p><p className="text-xs text-gray-400">Nota de Entrega</p></div><Download size={14} className="ml-auto text-gray-400" />
              </button>
              <button type="button" onClick={() => window.open(`${api.defaults.baseURL}/api/documents/seikyusho/${order.id}/html`, '_blank')} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                <FileText size={16} className="text-purple-600" /><div className="text-left"><p className="font-medium">請求書</p><p className="text-xs text-gray-400">Fatura</p></div><Download size={14} className="ml-auto text-gray-400" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-between">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Fechar</button>
          <button type="button" onClick={() => window.open(`${api.defaults.baseURL}/api/documents/seikyusho/${order.id}/html`, '_blank')} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Printer size={14} />Imprimir 請求書
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceInvoicesPage() {
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'due' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<InvoiceOrder | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/api/finance/invoices${params}`);
      if (data.success) {
        setOrders(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = orders
    .filter(o => {
      const term = searchTerm.toLowerCase();
      return customerName(o.customer).toLowerCase().includes(term) ||
        (o.customer?.email || '').toLowerCase().includes(term) ||
        (o.orderNumber || '').toLowerCase().includes(term) ||
        (o.invoiceNumber || '').toLowerCase().includes(term);
    })
    .sort((a, b) => {
      let c = 0;
      if (sortBy === 'date') c = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      else if (sortBy === 'due') c = new Date(a.invoiceDueDate || 0).getTime() - new Date(b.invoiceDueDate || 0).getTime();
      else c = (a.total || 0) - (b.total || 0);
      return sortDir === 'desc' ? -c : c;
    });

  const totalAmount = orders.reduce((s, o) => s + (o.total || 0), 0);
  const paidAmount = orders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + (o.total || 0), 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueCount = orders.filter(o => isOverdue(o.invoiceDueDate, o.paymentStatus)).length;
  const toggleSort = (f: typeof sortBy) => { if (sortBy === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(f); setSortDir('desc'); } };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs />
      {selectedOrder && <InvoiceDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">Faturas PJ / 請求書管理</h1><p className="text-sm text-gray-500 mt-1">Gerenciar faturas de clientes corporativos</p></div>
          <button type="button" onClick={fetchInvoices} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Atualizar</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-purple-100 rounded-lg"><FileText size={18} className="text-purple-600" /></div><span className="text-sm text-gray-500">Total Faturado</span></div><p className="text-xl font-bold">{yen(totalAmount)}</p><p className="text-xs text-gray-400 mt-1">{orders.length} faturas</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle size={18} className="text-green-600" /></div><span className="text-sm text-gray-500">Recebido</span></div><p className="text-xl font-bold text-green-600">{yen(paidAmount)}</p><p className="text-xs text-gray-400 mt-1">支払済み</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-orange-100 rounded-lg"><Clock size={18} className="text-orange-600" /></div><span className="text-sm text-gray-500">A Receber</span></div><p className="text-xl font-bold text-orange-600">{yen(pendingAmount)}</p><p className="text-xs text-gray-400 mt-1">未収金</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className={`p-2 rounded-lg ${overdueCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}><AlertTriangle size={18} className={overdueCount > 0 ? 'text-red-600' : 'text-green-600'} /></div><span className="text-sm text-gray-500">Vencidas</span></div><p className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p><p className="text-xs text-gray-400 mt-1">期限超過</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4"><div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar fatura, empresa... / 検索..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" /></div>
          <div className="relative"><Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white"><option value="ALL">Todos</option><option value="pending">未払い</option><option value="paid">支払済み</option><option value="overdue">期限超過</option></select></div>
        </div></div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? <div className="p-12 text-center"><RefreshCw size={32} className="mx-auto text-gray-300 animate-spin mb-3" /><p className="text-gray-500 text-sm">読み込み中...</p></div>
          : filtered.length === 0 ? <div className="p-12 text-center"><FileText size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">Nenhuma fatura encontrada</p></div>
          : <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <th className="text-left p-3">Fatura / 請求書</th><th className="text-left p-3">Empresa / 企業</th><th className="text-left p-3">Status</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort('amount')}><span className="inline-flex items-center gap-1">Valor <ArrowUpDown size={12} className={sortBy === 'amount' ? 'text-orange-500' : ''} /></span></th>
              <th className="text-center p-3 cursor-pointer" onClick={() => toggleSort('date')}><span className="inline-flex items-center gap-1">Emissão <ArrowUpDown size={12} className={sortBy === 'date' ? 'text-orange-500' : ''} /></span></th>
              <th className="text-center p-3 cursor-pointer" onClick={() => toggleSort('due')}><span className="inline-flex items-center gap-1">Vencimento <ArrowUpDown size={12} className={sortBy === 'due' ? 'text-orange-500' : ''} /></span></th>
              <th className="text-center p-3">Ações</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(order => {
                const overdue = isOverdue(order.invoiceDueDate, order.paymentStatus);
                const dueDays = daysUntilDue(order.invoiceDueDate);
                const cfg = statusConfig[order.paymentStatus || 'PENDING'] || statusConfig.PENDING;
                const Icon = cfg.icon;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="p-3"><p className="font-mono text-sm font-medium">{order.invoiceNumber || order.orderNumber || order.id.slice(0, 12)}</p><p className="text-xs text-gray-400">Pedido: {order.orderNumber || '—'}</p></td>
                    <td className="p-3"><div className="flex items-center gap-2"><Building2 size={14} className="text-blue-500 flex-shrink-0" /><div><p className="text-sm font-medium truncate max-w-[180px]">{customerName(order.customer)}</p><p className="text-xs text-gray-400 truncate max-w-[180px]">{order.customer?.email || ''}</p></div></div></td>
                    <td className="p-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${overdue ? 'bg-red-100 text-red-700 border-red-200' : cfg.color}`}>{overdue ? <AlertTriangle size={10} /> : <Icon size={10} />}{overdue ? '期限超過' : cfg.ja}</span></td>
                    <td className="p-3 text-right"><p className="text-sm font-bold">{yen(order.total)}</p><p className="text-xs text-gray-400">税込</p></td>
                    <td className="p-3 text-center text-sm text-gray-700">{fmtDate(order.createdAt)}</td>
                    <td className="p-3 text-center">
                      <p className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>{fmtDate(order.invoiceDueDate)}</p>
                      {order.paymentStatus !== 'PAID' && order.paymentStatus !== 'CANCELED' && order.invoiceDueDate && (
                        <p className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-400'}`}>{overdue ? `${Math.abs(dueDays)}日超過` : `あと${dueDays}日`}</p>
                      )}
                    </td>
                    <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => setSelectedOrder(order)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Detalhes"><Eye size={14} /></button>
                      <button type="button" onClick={() => window.open(`${api.defaults.baseURL}/api/documents/seikyusho/${order.id}/html`, '_blank')} className="p-1.5 rounded-lg text-purple-400 hover:text-purple-600 hover:bg-purple-50" title="請求書"><Download size={14} /></button>
                      <button type="button" onClick={() => window.open(`${api.defaults.baseURL}/api/documents/seikyusho/${order.id}/html`, '_blank')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Imprimir"><Printer size={14} /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>}
        </div>
        {!loading && filtered.length > 0 && <div className="mt-4 flex justify-between text-xs text-gray-400"><span>{filtered.length} de {orders.length} faturas</span><span>A receber: <span className="font-medium text-orange-500">{yen(pendingAmount)}</span></span></div>}
      </div>
    </div>
  );
}