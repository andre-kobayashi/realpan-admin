'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, Package,
  FileText, Receipt, Edit, Clock, CheckCircle, Truck, XCircle,
  CreditCard
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
  BANK_TRANSFER: { ja: '振込', pt: 'Depósito' }, INVOICE: { ja: '請求書', pt: 'Fatura' },
  KONBINI: { ja: 'コンビニ', pt: 'Konbini' }, PAYPAY: { ja: 'PayPay', pt: 'PayPay' },
};

function openDocument(orderId: string, type: 'nouhinsho' | 'seikyusho') {
  window.open(`${API_URL}/api/documents/${type}/${orderId}/html`, '_blank');
}

export default function CustomerPFDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'info'>('orders');

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

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="h-7 w-7 text-blue-600" />
              {fullName}
            </h1>
            <p className="text-gray-500 mt-1">{customer.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500">総注文数 / Total Pedidos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500">総購入額 / Total Gasto</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">¥{totalSpent.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500">平均注文額 / Ticket Médio</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">¥{avgOrderValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button type="button" onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'orders' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Package className="h-4 w-4" /> 注文履歴 / Pedidos
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{totalOrders}</span>
            </button>
            <button type="button" onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <User className="h-4 w-4" /> 顧客情報 / Dados
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* ORDERS */}
          {activeTab === 'orders' && (
            <div>
              {orders.length === 0 ? (
                <div className="text-center py-12"><Package className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">注文がありません / Nenhum pedido</p></div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order: any) => {
                    const st = statusConfig[order.status] || statusConfig.PENDING;
                    const SI = st.icon;
                    const pm = paymentLabels[order.paymentMethod] || { ja: order.paymentMethod, pt: '' };
                    return (
                      <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono font-bold text-gray-900">{order.orderNumber}</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${st.color}`}>
                              <SI className="h-3 w-3" /> {st.ja} / {st.pt}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <CreditCard className="h-3 w-3" /> {pm.ja}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('ja-JP')}</span>
                            <span className="text-lg font-bold text-gray-900">¥{(order.total || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        {order.items?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {order.items.slice(0, 5).map((it: any) => (
                              <span key={it.id} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">
                                {it.nameJa || it.namePt} ×{it.quantity}
                              </span>
                            ))}
                            {order.items.length > 5 && <span className="text-xs text-gray-400">+{order.items.length - 5}</span>}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <button type="button" onClick={() => openDocument(order.id, 'nouhinsho')}
                            className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">
                            納品書
                          </button>
                          <button type="button" onClick={() => openDocument(order.id, 'seikyusho')}
                            className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100">
                            請求書
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => router.push(`/dashboard/orders-pf/${order.id}/edit`)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="編集 / Editar">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INFO */}
          {activeTab === 'info' && (
            <div className="max-w-xl space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><User className="h-4 w-4" /> 個人情報 / Dados Pessoais</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-gray-500">名前 / Nome</label><p className="font-medium">{customer.firstName || '-'}</p></div>
                  <div><label className="text-xs text-gray-500">姓 / Sobrenome</label><p className="font-medium">{customer.lastName || '-'}</p></div>
                </div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{customer.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{customer.phone || '-'}</div>
                {customer.postalCode && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <p>〒{customer.postalCode}<br />{[customer.prefecture, customer.city, customer.ward, customer.streetAddress, customer.building].filter(Boolean).join('')}</p>
                  </div>
                )}
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />登録日 / Cadastro: {new Date(customer.createdAt).toLocaleDateString('ja-JP')}</div>
                {customer.lastLoginAt && (
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />最終ログイン / Último login: {new Date(customer.lastLoginAt).toLocaleDateString('ja-JP')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}