'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Package,
  FileText, Receipt, Edit, Clock, CheckCircle, Truck, XCircle,
  CreditCard, Banknote, TrendingUp, Send, KeyRound
} from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.realpan.jp';

const statusConfig: Record<string, { ja: string; pt: string; color: string; icon: any }> = {
  PENDING:    { ja: '保留中',     pt: 'Pendente',     color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PAID:       { ja: '支払済み',   pt: 'Pago',         color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  PROCESSING: { ja: '処理中',     pt: 'Processando',  color: 'bg-blue-100 text-blue-800',     icon: Package },
  SHIPPED:    { ja: '発送済み',   pt: 'Enviado',      color: 'bg-purple-100 text-purple-800', icon: Truck },
  DELIVERED:  { ja: '配達済み',   pt: 'Entregue',     color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  CANCELLED:  { ja: 'キャンセル', pt: 'Cancelado',    color: 'bg-red-100 text-red-800',       icon: XCircle },
};

const paymentLabels: Record<string, { ja: string; pt: string }> = {
  STRIPE: { ja: 'カード', pt: 'Cartão' }, DAIBIKI: { ja: '代引', pt: 'Daibiki' },
  BANK_TRANSFER: { ja: '振込', pt: 'Transferência' }, INVOICE: { ja: '請求書', pt: 'Fatura' },
  KONBINI: { ja: 'コンビニ', pt: 'Konbini' }, PAYPAY: { ja: 'PayPay', pt: 'PayPay' },
};

function openDocument(orderId: string, type: 'nouhinsho' | 'seikyusho' | 'ryoushusho') {
  window.open(`${API_URL}/api/documents/${type}/${orderId}/html`, '_blank');
}

async function openMatomete(customerId: string, year: number, month: number, orderIds: string[]) {
  try {
    const res = await fetch(`${API_URL}/api/documents/matomete-seikyusho/html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, year, month, orderIds }),
    });
    if (!res.ok) { alert('請求明細書の生成に失敗しました'); return; }
    const html = await res.text();
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  } catch { alert('エラーが発生しました'); }
}

// ── Billing Tab with order selection ──
function BillingTab({ customerId, orders, monthlyOrders, statusConfig, openDocument, openMatomete }: {
  customerId: string; orders: any[]; monthlyOrders: any; statusConfig: any;
  openDocument: (id: string, type: 'nouhinsho' | 'seikyusho' | 'ryoushusho') => void;
  openMatomete: (cid: string, y: number, m: number, ids: string[]) => void;
}) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  const toggleAllInMonth = (monthOrders: any[]) => {
    const ids = monthOrders.map((o: any) => o.id);
    const allSelected = ids.every((id: string) => selectedOrders.has(id));
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (allSelected) { ids.forEach((id: string) => next.delete(id)); }
      else { ids.forEach((id: string) => next.add(id)); }
      return next;
    });
  };

  const selectedTotal = orders.filter((o: any) => selectedOrders.has(o.id)).reduce((s: number, o: any) => s + (o.total || 0), 0);

  const handleGenerateSelected = () => {
    if (selectedOrders.size === 0) { alert('請求書に含める注文を選択してください\nSelecione os pedidos para incluir na fatura'); return; }
    const ids = Array.from(selectedOrders);
    // Get year/month from first selected order
    const firstOrder = orders.find((o: any) => o.id === ids[0]);
    if (!firstOrder) return;
    const d = new Date(firstOrder.createdAt);
    openMatomete(customerId, d.getFullYear(), d.getMonth() + 1, ids);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">月別売上 / Faturamento Mensal</h3>
        {selectedOrders.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{selectedOrders.size}件選択 / selecionado(s) — <span className="font-bold">¥{selectedTotal.toLocaleString()}</span></span>
            <button type="button" onClick={handleGenerateSelected}
              className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
              <FileText className="h-4 w-4" /> 選択分の請求明細書を発行
            </button>
            <button type="button" onClick={() => setSelectedOrders(new Set())}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              選択解除 / Limpar
            </button>
          </div>
        )}
      </div>

      {Object.keys(monthlyOrders).length === 0 ? (
        <div className="text-center py-12"><TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">データなし / Sem dados</p></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(monthlyOrders).sort((a, b) => b[0].localeCompare(a[0])).map(([key, m]: [string, any]) => {
            const monthIds = m.orders.map((o: any) => o.id);
            const allMonthSelected = monthIds.every((id: string) => selectedOrders.has(id));
            const someMonthSelected = monthIds.some((id: string) => selectedOrders.has(id));

            return (
              <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Month header */}
                <div className="bg-gray-50 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={allMonthSelected}
                        ref={(el) => { if (el) el.indeterminate = someMonthSelected && !allMonthSelected; }}
                        onChange={() => toggleAllInMonth(m.orders)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300" />
                      <span className="font-semibold text-gray-900">{m.ja}</span>
                    </label>
                    <span className="text-xs text-gray-400">({m.pt})</span>
                    <span className="text-xs text-gray-500">{m.orders.length} 件</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">¥{m.total.toLocaleString()}</span>
                    <button type="button"
                      onClick={() => openMatomete(customerId, parseInt(key.split('-')[0]), parseInt(key.split('-')[1]), monthIds)}
                      className="px-3 py-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition-colors">
                      全件で請求明細書
                    </button>
                  </div>
                </div>

                {/* Orders */}
                <div className="divide-y divide-gray-100">
                  {m.orders.map((o: any) => {
                    const s = statusConfig[o.status] || statusConfig.PENDING;
                    const isSelected = selectedOrders.has(o.id);
                    return (
                      <div key={o.id} className={`px-5 py-2.5 flex items-center justify-between text-sm transition-colors ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOrder(o.id)}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 cursor-pointer" />
                          <span className="font-mono text-gray-900">{o.orderNumber}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${s.color}`}>{s.ja}</span>
                          <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('ja-JP')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">¥{(o.total || 0).toLocaleString()}</span>
                          <button type="button" onClick={() => openDocument(o.id, 'nouhinsho')}
                            className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">納品書</button>
                          <button type="button" onClick={() => openDocument(o.id, 'seikyusho')}
                            className="px-2 py-0.5 text-[10px] bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100">請求書</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CustomerPJDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'info' | 'billing'>('orders');
  const [showCredModal, setShowCredModal] = useState(false);
  const [credPassword, setCredPassword] = useState('');
  const [credSalesRep, setCredSalesRep] = useState('');
  const [sendingCred, setSendingCred] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setCredPassword(pwd);
  };

  const handleSendCredentials = async () => {
    if (!credPassword) { generatePassword(); return; }
    setSendingCred(true);
    try {
      await api.post(`/api/customers/${customerId}/send-credentials`, {
        tempPassword: credPassword,
        salesRepName: credSalesRep || undefined,
      });
      alert('Email enviado com sucesso! / メール送信完了！');
      setShowCredModal(false);
    } catch (err: any) {
      alert('Erro ao enviar: ' + (err.response?.data?.message?.pt || err.message));
    } finally {
      setSendingCred(false);
    }
  };


  useEffect(() => { fetchData(); }, [customerId]);
  const fetchData = async () => {
    try {
      const [custRes, ordersRes] = await Promise.all([
        api.get(`/api/customers/${customerId}`),
        api.get(`/api/orders?customerId=${customerId}`),
      ]);
      setCustomer(custRes.data.data || custRes.data);
      setOrders(ordersRes.data.data || []);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>);
  if (!customer) return (<div className="text-center py-20"><p className="text-gray-500">顧客が見つかりません / Cliente não encontrado</p></div>);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const pendingPayment = orders.filter((o: any) => o.paymentStatus === 'PENDING' || o.paymentStatus === 'INVOICED').reduce((s: number, o: any) => s + (o.total || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const monthlyOrders = orders.reduce((acc: any, order: any) => {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { orders: [], total: 0, ja: `${d.getFullYear()}年${d.getMonth() + 1}月`, pt: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` };
    acc[key].orders.push(order); acc[key].total += order.total || 0; return acc;
  }, {} as Record<string, any>);

  const bsColors: Record<string, string> = { APPROVED: 'bg-green-100 text-green-700', PENDING: 'bg-yellow-100 text-yellow-700', REJECTED: 'bg-red-100 text-red-700' };
  const bsLabels: Record<string, string> = { APPROVED: '承認済み / Aprovado', PENDING: '審査中 / Pendente', REJECTED: '却下 / Rejeitado' };

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Building2 className="h-7 w-7 text-purple-600" />{customer.companyName || '-'}</h1>
            <p className="text-gray-500 mt-1">{customer.companyNameKana || customer.email}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${bsColors[customer.businessStatus] || 'bg-gray-100'}`}>{bsLabels[customer.businessStatus] || customer.businessStatus}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { generatePassword(); setShowCredModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Send className="h-4 w-4" /> Enviar Credenciais</button>
            <button type="button" onClick={() => router.push(`/dashboard/customers-pj/${customerId}/edit`)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"><Edit className="h-4 w-4" /> 編集 / Editar</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-xs text-gray-500">総注文数 / Total Pedidos</div><div className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</div></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-xs text-gray-500">総売上 / Receita Total</div><div className="text-2xl font-bold text-gray-900 mt-1">¥{totalRevenue.toLocaleString()}</div></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-xs text-gray-500">未払い / Pendente</div><div className={`text-2xl font-bold mt-1 ${pendingPayment > 0 ? 'text-orange-600' : 'text-gray-900'}`}>¥{pendingPayment.toLocaleString()}</div></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-xs text-gray-500">平均注文額 / Ticket Médio</div><div className="text-2xl font-bold text-gray-900 mt-1">¥{avgOrderValue.toLocaleString()}</div></div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200"><nav className="flex">
          {([{ id: 'orders' as const, label: '注文履歴 / Pedidos', icon: Package, count: totalOrders }, { id: 'info' as const, label: '顧客情報 / Dados', icon: Building2 }, { id: 'billing' as const, label: '請求・売上 / Faturamento', icon: TrendingUp }]).map(tab => {
            const Icon = tab.icon;
            return (<button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="h-4 w-4" />{tab.label}{'count' in tab && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>}
            </button>);
          })}
        </nav></div>
        <div className="p-6">
          {activeTab === 'orders' && (<div>{orders.length === 0 ? (<div className="text-center py-12"><Package className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">注文がありません / Nenhum pedido</p></div>) : (<div className="space-y-3">{orders.map((order: any) => {
            const st = statusConfig[order.status] || statusConfig.PENDING; const SI = st.icon; const pm = paymentLabels[order.paymentMethod] || { ja: order.paymentMethod, pt: '' };
            return (<div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3 flex-wrap"><span className="font-mono font-bold text-gray-900">{order.orderNumber}</span><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${st.color}`}><SI className="h-3 w-3" />{st.ja}</span><span className="text-xs text-gray-400"><CreditCard className="h-3 w-3 inline" /> {pm.ja}</span></div>
                <div className="flex items-center gap-4"><span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('ja-JP')}</span><span className="text-lg font-bold text-gray-900">¥{(order.total || 0).toLocaleString()}</span></div></div>
              {order.items?.length > 0 && (<div className="flex flex-wrap gap-1.5 mb-3">{order.items.slice(0, 5).map((it: any) => <span key={it.id} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">{it.nameJa || it.namePt} ×{it.quantity}</span>)}{order.items.length > 5 && <span className="text-xs text-gray-400">+{order.items.length - 5}</span>}</div>)}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => openDocument(order.id, 'nouhinsho')} className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">納品書</button>
                <button type="button" onClick={() => openDocument(order.id, 'seikyusho')} className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100">請求書</button>
                <button type="button" onClick={() => openDocument(order.id, 'ryoushusho')} className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100">領収書</button>
                <div className="flex-1" /><button type="button" onClick={() => router.push(`/dashboard/orders-pj/${order.id}/edit`)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><Edit className="h-3.5 w-3.5" /></button>
              </div></div>);
          })}</div>)}</div>)}

          {activeTab === 'info' && (<div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Building2 className="h-4 w-4" /> 会社情報 / Dados da Empresa</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div><label className="text-xs text-gray-500">会社名 / Razão Social</label><p className="font-medium">{customer.companyName || '-'}</p></div>
                <div><label className="text-xs text-gray-500">カナ / Kana</label><p>{customer.companyNameKana || '-'}</p></div>
                <div><label className="text-xs text-gray-500">法人番号 / Houjin Bangou</label><p className="font-mono">{customer.houjinBangou || '-'}</p></div>
                <div><label className="text-xs text-gray-500">インボイス番号 / Invoice</label><p className="font-mono">{customer.invoiceNumber || '-'}</p></div>
                <div><label className="text-xs text-gray-500">代表者 / Representante</label><p>{customer.representativeName || `${customer.lastName || ''} ${customer.firstName || ''}`.trim() || '-'}</p></div>
                {customer.discountRate > 0 && <div><label className="text-xs text-gray-500">割引率 / Desconto</label><p className="font-bold text-orange-600">{Math.round(customer.discountRate * 100)}%</p></div>}
              </div></div>
            <div className="space-y-4"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Phone className="h-4 w-4" /> 連絡先 / Contato</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{customer.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{customer.phone || '-'}</div>
                {customer.postalCode && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><p>〒{customer.postalCode}<br />{[customer.prefecture, customer.city, customer.ward, customer.streetAddress, customer.building].filter(Boolean).join('')}</p></div>}
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />登録 / Cadastro: {new Date(customer.createdAt).toLocaleDateString('ja-JP')}</div>
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mt-6"><Banknote className="h-4 w-4" /> 請求設定 / Faturamento</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div><label className="text-xs text-gray-500">締め日 / Fechamento</label><p>{!customer.billingClosingDay || customer.billingClosingDay === 31 ? '月末 / Fim do mês' : `${customer.billingClosingDay}日`}</p></div>
                <div><label className="text-xs text-gray-500">支払期限 / Vencimento</label><p>翌月{customer.billingDueDay || 10}日 / Dia {customer.billingDueDay || 10}</p></div>
                <div><label className="text-xs text-gray-500">支払サイト / Prazo</label><p>{customer.paymentTermDays || customer.paymentTerms || 30}日 / dias</p></div>
                {customer.creditLimit && <div><label className="text-xs text-gray-500">与信限度額 / Limite</label><p className="font-bold">¥{customer.creditLimit.toLocaleString()}</p></div>}
              </div></div>
          </div>)}

          {activeTab === 'billing' && (<BillingTab customerId={customerId} orders={orders} monthlyOrders={monthlyOrders} statusConfig={statusConfig} openDocument={openDocument} openMatomete={openMatomete} />)}
        </div>
      </div>
    
      {/* Modal Enviar Credenciais */}
      {showCredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCredModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Enviar Credenciais / 認証情報送信
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Email de boas-vindas com login e senha provisória será enviado para:<br/>
              <strong className="text-gray-900">{customer?.email}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Senha Provisória / 仮パスワード</label>
                <div className="flex gap-2 mt-1">
                  <input type="text" value={credPassword} onChange={(e) => setCredPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg font-mono text-lg tracking-wider" readOnly />
                  <button type="button" onClick={generatePassword} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">🔄</button>
                  <button type="button" onClick={() => navigator.clipboard.writeText(credPassword)} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">📋</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vendedor / 担当者 (opcional)</label>
                <input type="text" value={credSalesRep} onChange={(e) => setCredSalesRep(e.target.value)}
                  placeholder="Nome do vendedor" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCredModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Cancelar</button>
              <button type="button" onClick={handleSendCredentials} disabled={sendingCred || !credPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                {sendingCred ? 'Enviando...' : 'Enviar Email'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}