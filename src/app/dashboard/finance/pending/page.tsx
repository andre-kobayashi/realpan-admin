'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock, CheckCircle, XCircle, Search, Filter,
  Banknote, FileText, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Calendar, Building2,
  User, CreditCard, Eye, ArrowUpDown
} from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: { namePt?: string; nameJa?: string };
  productName?: string;
}

interface OrderCustomer {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  type?: string;
  companyName?: string;
}

interface PendingOrder {
  id: string;
  orderNumber?: string;
  customer?: OrderCustomer;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  total?: number;
  subtotal?: number;
  shippingCost?: number;
  taxAmount?: number;
  daibikiFee?: number;
  createdAt?: string;
  customerNotes?: string;
  internalNotes?: string;
  items?: OrderItem[];
  transferReference?: string;
  transferDate?: string;
  transferBank?: string;
}

const methodLabels: Record<string, { ja: string; icon: typeof Banknote }> = {
  BANK_TRANSFER: { ja: '銀行振込', icon: Banknote },
  INVOICE: { ja: '請求書払い', icon: FileText },
  DAIBIKI: { ja: '代引き', icon: CreditCard },
  STRIPE: { ja: 'カード決済', icon: CreditCard },
};

function customerName(c?: OrderCustomer): string {
  if (!c) return '—';
  if (c.companyName) return c.companyName;
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—';
}

function yen(n?: number | null): string { return `¥${(n || 0).toLocaleString('ja-JP')}`; }
function fmtDate(s?: string | null): string { return s ? new Date(s).toLocaleDateString('ja-JP') : '—'; }
function daysSince(s?: string | null): number { return s ? Math.floor((Date.now() - new Date(s).getTime()) / 86400000) : 0; }
function itemName(i: OrderItem): string { return i.product?.namePt || i.product?.nameJa || i.productName || 'Produto'; }

interface ConfirmState { order: PendingOrder; transferReference: string; transferDate: string; transferBank: string; internalNotes: string; }

function ConfirmModal({ data, onClose, onConfirm, loading }: { data: ConfirmState; onClose: () => void; onConfirm: (d: ConfirmState) => void; loading: boolean }) {
  const [f, setF] = useState({ transferReference: data.transferReference, transferDate: data.transferDate, transferBank: data.transferBank, internalNotes: data.internalNotes });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Confirmar Pagamento / 入金確認</h3>
          <p className="text-sm text-gray-500 mt-1">Pedido {data.order.orderNumber || data.order.id} — {yen(data.order.total)}</p>
        </div>
        <div className="p-6 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {data.order.customer?.type === 'BUSINESS' ? <Building2 size={20} className="text-blue-600" /> : <User size={20} className="text-green-600" />}
            <div>
              <p className="font-medium text-gray-900">{customerName(data.order.customer)}</p>
              <p className="text-sm text-gray-500">{data.order.customer?.email || ''}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referência / 振込参照番号</label>
            <input type="text" value={f.transferReference} onChange={e => setF({ ...f, transferReference: e.target.value })} placeholder="Ex: TR-20260315-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Transferência / 振込日</label>
            <input type="date" value={f.transferDate} onChange={e => setF({ ...f, transferDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banco / 振込先銀行</label>
            <select value={f.transferBank} onChange={e => setF({ ...f, transferBank: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
              <option value="">Selecionar...</option>
              <option value="浜松いわた信用金庫">浜松いわた信用金庫</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas Internas / 社内メモ</label>
            <textarea value={f.internalNotes} onChange={e => setF({ ...f, internalNotes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
          <button type="button" onClick={() => onConfirm({ ...data, ...f })} disabled={loading} className="px-6 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />} Confirmar / 確認
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ order }: { order: PendingOrder }) {
  const items = order.items || [];
  return (
    <tr><td colSpan={7} className="p-0">
      <div className="bg-gray-50 border-t border-b border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Itens / 注文商品</h4>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600 text-xs"><th className="text-left p-2">Produto</th><th className="text-center p-2">Qtd</th><th className="text-right p-2">Unit.</th><th className="text-right p-2">Total</th></tr></thead>
                <tbody>
                  {items.map(item => (<tr key={item.id} className="border-t border-gray-100"><td className="p-2">{itemName(item)}</td><td className="p-2 text-center">{item.quantity || 0}</td><td className="p-2 text-right">{yen(item.unitPrice)}</td><td className="p-2 text-right font-medium">{yen(item.totalPrice)}</td></tr>))}
                  {items.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-gray-400 text-xs">Sem itens</td></tr>}
                </tbody>
                <tfoot className="bg-gray-50 text-sm">
                  <tr className="border-t border-gray-200"><td colSpan={3} className="p-2 text-right text-xs text-gray-500">Subtotal</td><td className="p-2 text-right">{yen(order.subtotal)}</td></tr>
                  <tr><td colSpan={3} className="p-2 text-right text-xs text-gray-500">送料</td><td className="p-2 text-right">{yen(order.shippingCost)}</td></tr>
                  <tr><td colSpan={3} className="p-2 text-right text-xs text-gray-500">税</td><td className="p-2 text-right">{yen(order.taxAmount)}</td></tr>
                  {(order.daibikiFee || 0) > 0 && <tr><td colSpan={3} className="p-2 text-right text-xs text-gray-500">代引手数料</td><td className="p-2 text-right">{yen(order.daibikiFee)}</td></tr>}
                  <tr className="font-bold"><td colSpan={3} className="p-2 text-right">合計</td><td className="p-2 text-right text-orange-600">{yen(order.total)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Dias:</span><span className={daysSince(order.createdAt) > 7 ? 'text-red-600 font-medium' : ''}>{daysSince(order.createdAt)}日</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tipo:</span><span className={`px-2 py-0.5 rounded text-xs font-medium ${order.customer?.type === 'BUSINESS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{order.customer?.type === 'BUSINESS' ? 'PJ' : 'PF'}</span></div>
            </div>
            {order.customerNotes && <div className="bg-white rounded-lg border border-gray-200 p-3 text-sm text-gray-600"><p className="text-xs font-semibold text-gray-500 mb-1">Cliente:</p>{order.customerNotes}</div>}
            {order.internalNotes && <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 text-sm text-gray-600"><p className="text-xs font-semibold text-yellow-700 mb-1">Interno:</p>{order.internalNotes}</div>}
          </div>
        </div>
      </div>
    </td></tr>
  );
}

export default function FinancePendingPage() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'days'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/api/finance/pending'); if (data.success) setOrders(data.data || []); }
    catch { showToast('Erro ao carregar', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const showToast = (m: string, t: 'success' | 'error') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000); };

  const handleConfirm = async (d: ConfirmState) => {
    setConfirming(true);
    try {
      const res = await api.post('/api/finance/confirm-payment', { orderId: d.order.id, transferReference: d.transferReference, transferDate: d.transferDate, transferBank: d.transferBank, internalNotes: d.internalNotes });
      if (res.data.success) { showToast(`Confirmado: ${d.order.orderNumber || d.order.id}`, 'success'); setConfirmModal(null); fetch_(); }
      else showToast(res.data.message || 'Erro', 'error');
    } catch { showToast('Erro ao confirmar', 'error'); }
    finally { setConfirming(false); }
  };

  const filtered = orders
    .filter(o => {
      const term = searchTerm.toLowerCase();
      const match = customerName(o.customer).toLowerCase().includes(term) || (o.customer?.email || '').toLowerCase().includes(term) || (o.orderNumber || '').toLowerCase().includes(term);
      return match && (methodFilter === 'ALL' || o.paymentMethod === methodFilter);
    })
    .sort((a, b) => { let c = 0; if (sortBy === 'date') c = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(); else if (sortBy === 'amount') c = (a.total || 0) - (b.total || 0); else c = daysSince(b.createdAt) - daysSince(a.createdAt); return sortDir === 'desc' ? -c : c; });

  const totalPending = orders.reduce((s, o) => s + (o.total || 0), 0);
  const bankCount = orders.filter(o => o.paymentMethod === 'BANK_TRANSFER').length;
  const invCount = orders.filter(o => o.paymentMethod === 'INVOICE').length;
  const overdueCount = orders.filter(o => daysSince(o.createdAt) > 7).length;
  const toggleSort = (f: typeof sortBy) => { if (sortBy === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(f); setSortDir('desc'); } };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs />
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}{toast.message}</div>}
      {confirmModal && <ConfirmModal data={confirmModal} onClose={() => setConfirmModal(null)} onConfirm={handleConfirm} loading={confirming} />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">Pagamentos Pendentes / 入金待ち</h1><p className="text-sm text-gray-500 mt-1">Pedidos aguardando confirmação de pagamento manual</p></div>
          <button type="button" onClick={fetch_} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Atualizar</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-orange-100 rounded-lg"><Clock size={18} className="text-orange-600" /></div><span className="text-sm text-gray-500">Total Pendente</span></div><p className="text-xl font-bold">{yen(totalPending)}</p><p className="text-xs text-gray-400 mt-1">{orders.length} pedidos</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-blue-100 rounded-lg"><Banknote size={18} className="text-blue-600" /></div><span className="text-sm text-gray-500">Transferência</span></div><p className="text-xl font-bold">{bankCount}</p><p className="text-xs text-gray-400 mt-1">銀行振込</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-purple-100 rounded-lg"><FileText size={18} className="text-purple-600" /></div><span className="text-sm text-gray-500">Faturamento PJ</span></div><p className="text-xl font-bold">{invCount}</p><p className="text-xs text-gray-400 mt-1">請求書払い</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 mb-2"><div className={`p-2 rounded-lg ${overdueCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}><AlertTriangle size={18} className={overdueCount > 0 ? 'text-red-600' : 'text-green-600'} /></div><span className="text-sm text-gray-500">Vencidos (&gt;7d)</span></div><p className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p><p className="text-xs text-gray-400 mt-1">期限超過</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4"><div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar pedido, cliente... / 検索..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" /></div>
          <div className="relative"><Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white"><option value="ALL">Todos os métodos</option><option value="BANK_TRANSFER">銀行振込</option><option value="INVOICE">請求書</option><option value="DAIBIKI">代引き</option><option value="STRIPE">カード</option></select></div>
        </div></div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? <div className="p-12 text-center"><RefreshCw size={32} className="mx-auto text-gray-300 animate-spin mb-3" /><p className="text-gray-500 text-sm">読み込み中...</p></div>
          : filtered.length === 0 ? <div className="p-12 text-center"><CheckCircle size={48} className="mx-auto text-green-300 mb-3" /><p className="text-gray-500 font-medium">Nenhum pedido pendente!</p><p className="text-gray-400 text-sm mt-1">すべての注文が処理されました</p></div>
          : <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <th className="p-3 w-8"></th><th className="text-left p-3">Pedido / 注文</th><th className="text-left p-3">Cliente / 顧客</th><th className="text-left p-3">Método / 支払方法</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort('amount')}><span className="inline-flex items-center gap-1">Valor <ArrowUpDown size={12} className={sortBy === 'amount' ? 'text-orange-500' : ''} /></span></th>
              <th className="text-center p-3 cursor-pointer" onClick={() => toggleSort('days')}><span className="inline-flex items-center gap-1">Dias <ArrowUpDown size={12} className={sortBy === 'days' ? 'text-orange-500' : ''} /></span></th>
              <th className="text-center p-3">Ações</th>
            </tr></thead>
            {filtered.map(order => {
              const days = daysSince(order.createdAt);
              const exp = expandedId === order.id;
              const ml = methodLabels[order.paymentMethod || ''];
              const MI = ml?.icon || CreditCard;
              return (
                <tbody key={order.id} className="border-b border-gray-100">
                  <tr className={`hover:bg-gray-50 ${exp ? 'bg-gray-50' : ''}`}>
                    <td className="p-3"><button type="button" onClick={() => setExpandedId(exp ? null : order.id)} className="p-1 rounded hover:bg-gray-200">{exp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></td>
                    <td className="p-3"><p className="font-mono text-sm font-medium">{order.orderNumber || order.id.slice(0, 12)}</p><p className="text-xs text-gray-400">{fmtDate(order.createdAt)}</p></td>
                    <td className="p-3"><div className="flex items-center gap-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${order.customer?.type === 'BUSINESS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{order.customer?.type === 'BUSINESS' ? 'PJ' : 'PF'}</span><div><p className="text-sm font-medium truncate max-w-[180px]">{customerName(order.customer)}</p><p className="text-xs text-gray-400 truncate max-w-[180px]">{order.customer?.email || ''}</p></div></div></td>
                    <td className="p-3"><span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium"><MI size={12} />{ml?.ja || order.paymentMethod || '—'}</span></td>
                    <td className="p-3 text-right font-bold">{yen(order.total)}</td>
                    <td className="p-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${days > 14 ? 'bg-red-100 text-red-700' : days > 7 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}><Calendar size={10} />{days}日</span></td>
                    <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => setExpandedId(exp ? null : order.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Detalhes"><Eye size={14} /></button>
                      <button type="button" onClick={() => setConfirmModal({ order, transferReference: order.transferReference || '', transferDate: order.transferDate || new Date().toISOString().split('T')[0], transferBank: order.transferBank || '浜松いわた信用金庫', internalNotes: order.internalNotes || '' })} className="p-1.5 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50" title="Confirmar"><CheckCircle size={14} /></button>
                    </div></td>
                  </tr>
                  {exp && <DetailRow order={order} />}
                </tbody>
              );
            })}
          </table></div>}
        </div>
        {!loading && filtered.length > 0 && <div className="mt-4 text-center text-xs text-gray-400">Mostrando {filtered.length} de {orders.length} pedidos pendentes</div>}
      </div>
    </div>
  );
}