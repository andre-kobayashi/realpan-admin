'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Package, Clock, CheckCircle, Truck, Eye, Edit, XCircle, Printer, FileText, Receipt, Mail, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import type { Order, ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.realpan.jp';

const statusConfig = {
  PENDING: { label: '保留中', labelPt: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PAID: { label: '支払済み', labelPt: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  PROCESSING: { label: '処理中', labelPt: 'Processando', color: 'bg-blue-100 text-blue-800', icon: Package },
  SHIPPED: { label: '発送済み', labelPt: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Truck },
  DELIVERED: { label: '配達済み', labelPt: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'キャンセル', labelPt: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

function openDocument(orderId: string, type: 'nouhinsho' | 'seikyusho' | 'ryoushusho') {
  window.open(`${API_URL}/api/documents/${type}/${orderId}/html`, '_blank');
}



// Send document by email
async function sendDocumentEmail(orderId: string, type: 'nouhinsho' | 'seikyusho' | 'ryoushusho') {
  const typeLabels: Record<string, string> = { nouhinsho: '納品書', seikyusho: '請求書', ryoushusho: '領収書' };
  if (!confirm(`${typeLabels[type]}をメールで送信しますか？\nEnviar ${typeLabels[type]} por email?`)) return;
  try {
    const res = await api.post(`/api/documents/${type}/${orderId}/email`);
    if (res.data.success) {
      alert(`✅ ${typeLabels[type]}を送信しました！\n${typeLabels[type]} enviado com sucesso!`);
    } else {
      alert(`❌ エラー: ${res.data.error || 'Unknown error'}`);
    }
  } catch (err: any) {
    alert(`❌ 送信失敗: ${err.response?.data?.message?.ja || err.message}`);
  }
}

export default function OrdersPFPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<Order | null>(null);
  const [showPickingList, setShowPickingList] = useState<Order | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get<ApiResponse<Order[]>>('/api/orders?type=PF');
      setOrders(data.data || []);
    } catch (error) { console.error('Erro ao carregar pedidos:', error); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(); setSelectedOrder(null); setShowStatusModal(null);
      alert('ステータスが更新されました / Status atualizado');
    } catch { alert('ステータスの更新に失敗しました / Erro ao atualizar status'); }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>ピッキングリスト - ${showPickingList?.orderNumber}</title>
      <style>@media print { @page { margin: 1cm; } } body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #333; padding: 8px; text-align: left; }
      th { background-color: #f0f0f0; font-weight: bold; }
      .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
      .footer { margin-top: 30px; border-top: 1px solid #999; padding-top: 10px; }
      .checkbox { width: 30px; }</style></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const filteredOrders = orders.filter((order) => {
    const name = order.customer?.lastName && order.customer?.firstName
      ? `${order.customer.lastName} ${order.customer.firstName}`
      : order.customer?.email || '';
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">個人注文 / Pedidos PF</h1>
            <p className="text-gray-500 mt-1">個人顧客向け注文管理</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-1">総注文数</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
          <div className="text-sm text-yellow-800 mb-1">保留中</div>
          <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <div className="text-sm text-blue-800 mb-1">処理中</div>
          <div className="text-3xl font-bold text-blue-900">{stats.processing}</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
          <div className="text-sm text-purple-800 mb-1">発送済み</div>
          <div className="text-3xl font-bold text-purple-900">{stats.shipped}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="注文番号、顧客名またはメールで検索..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
            <option value="ALL">すべてのステータス</option>
            <option value="PENDING">保留中</option>
            <option value="PAID">支払済み</option>
            <option value="PROCESSING">処理中</option>
            <option value="SHIPPED">発送済み</option>
            <option value="DELIVERED">配達済み</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">個人注文が見つかりません</h3>
          <p className="text-gray-500">Nenhum pedido PF encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">注文番号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">顧客</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">注文日</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">合計金額</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ステータス</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">帳票</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status as keyof typeof statusConfig];
                const StatusIcon = status?.icon || Clock;
                const customerName = order.customer?.lastName && order.customer?.firstName
                  ? `${order.customer.lastName} ${order.customer.firstName}`
                  : order.customer?.email || '-';
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{order.orderNumber}</div></td>
                    <td className="px-6 py-4"><div className="text-sm text-gray-900">{customerName}</div></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString('ja-JP')}</td>
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">¥{order.total.toLocaleString('ja-JP')}</div></td>
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => setShowStatusModal(order)}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${status?.color || 'bg-gray-100 text-gray-600'} hover:opacity-80`}>
                        <StatusIcon className="h-3 w-3" /> {status?.label || order.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => openDocument(order.id, 'nouhinsho')}
                          className="px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100" title="納品書">納品書</button>
                        <button type="button" onClick={() => openDocument(order.id, 'seikyusho')}
                          className="px-2 py-1 text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100" title="請求書">請求書</button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setSelectedOrder(order)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="詳細"><Eye className="h-4 w-4" /></button>
                        <button type="button" onClick={() => router.push(`/dashboard/orders-pf/${order.id}/edit`)} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg" title="編集"><Edit className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setShowPickingList(order)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="ピッキング"><Printer className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">注文 {selectedOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500 mt-1">{new Date(selectedOrder.createdAt).toLocaleString('ja-JP')}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">顧客情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><span className="text-gray-600">名前:</span> <span className="font-medium">{selectedOrder.customer?.lastName} {selectedOrder.customer?.firstName}</span></p>
                  <p className="text-sm"><span className="text-gray-600">メール:</span> <span className="font-medium">{selectedOrder.customer?.email}</span></p>
                  <p className="text-sm"><span className="text-gray-600">電話:</span> <span className="font-medium">{selectedOrder.customer?.phone || '-'}</span></p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">注文商品</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-4">
                      <div>
                        <div className="font-medium text-gray-900">{item.product?.namePt || (item as any).namePt}</div>
                        <div className="text-sm text-gray-500">¥{item.unitPrice.toLocaleString('ja-JP')} × {item.quantity}</div>
                      </div>
                      <div className="font-semibold text-gray-900">¥{item.subtotal.toLocaleString('ja-JP')}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">小計:</span><span className="font-medium">¥{selectedOrder.subtotal.toLocaleString('ja-JP')}</span></div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-gray-600">割引:</span><span className="font-medium text-green-600">-¥{selectedOrder.discountAmount.toLocaleString('ja-JP')}</span></div>
                )}
                <div className="flex justify-between text-sm"><span className="text-gray-600">消費税:</span><span className="font-medium">¥{selectedOrder.taxAmount.toLocaleString('ja-JP')}</span></div>
                {selectedOrder.shippingCost > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-gray-600">送料:</span><span className="font-medium">¥{selectedOrder.shippingCost.toLocaleString('ja-JP')}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2"><span>合計:</span><span className="text-red-600">¥{selectedOrder.total.toLocaleString('ja-JP')}</span></div>
              </div>

              {/* Documents */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> 帳票発行</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => openDocument(selectedOrder.id, 'nouhinsho')}
                      className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100">
                      <Receipt className="h-5 w-5 text-blue-600" /><span className="text-xs font-semibold text-blue-800">納品書</span>
                    </button>
                    <button type="button" onClick={() => sendDocumentEmail(selectedOrder.id, 'nouhinsho')}
                      className="flex items-center justify-center gap-1 py-1.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100" title="メールで送信">
                      <Mail className="h-3.5 w-3.5 text-blue-600" /><span className="text-[10px] text-blue-600">送信</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => openDocument(selectedOrder.id, 'seikyusho')}
                      className="flex flex-col items-center gap-1.5 p-3 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100">
                      <FileText className="h-5 w-5 text-orange-600" /><span className="text-xs font-semibold text-orange-800">請求書</span>
                    </button>
                    <button type="button" onClick={() => sendDocumentEmail(selectedOrder.id, 'seikyusho')}
                      className="flex items-center justify-center gap-1 py-1.5 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100" title="メールで送信">
                      <Mail className="h-3.5 w-3.5 text-orange-600" /><span className="text-[10px] text-orange-600">送信</span>
                    </button>
                  </div>
                  <button type="button" onClick={() => setShowPickingList(selectedOrder)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100">
                    <Printer className="h-5 w-5 text-green-600" /><span className="text-xs font-semibold text-green-800">ピッキング</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => openDocument(selectedOrder.id, 'ryoushusho')}
                      className="flex flex-col items-center gap-1.5 p-3 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100">
                      <Receipt className="h-5 w-5 text-teal-600" /><span className="text-xs font-semibold text-teal-800">領収書</span>
                    </button>
                    <button type="button" onClick={() => sendDocumentEmail(selectedOrder.id, 'ryoushusho')}
                      className="flex items-center justify-center gap-1 py-1.5 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100" title="メールで送信">
                      <Mail className="h-3.5 w-3.5 text-teal-600" /><span className="text-[10px] text-teal-600">送信</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => router.push(`/dashboard/orders-pf/${selectedOrder.id}/edit`)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">注文を編集</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ステータス変更</h3>
            <p className="text-sm text-gray-600 mb-4">注文: {showStatusModal.orderNumber}</p>
            <div className="space-y-2">
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isCurrent = showStatusModal.status === key;
                return (
                  <button key={key} type="button" onClick={() => handleStatusChange(showStatusModal.id, key)} disabled={isCurrent}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${isCurrent ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : 'border-gray-200 hover:border-red-500 hover:bg-red-50'}`}>
                    <Icon className="h-5 w-5" />
                    <div className="text-left flex-1"><div className="font-medium">{config.label}</div><div className="text-xs text-gray-500">{config.labelPt}</div></div>
                    {isCurrent && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">現在</span>}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setShowStatusModal(null)} className="w-full mt-4 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">キャンセル</button>
          </div>
        </div>
      )}

      {/* Picking List Modal */}
      {showPickingList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">ピッキングリスト</h2>
              <div className="flex gap-2">
                <button type="button" onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Printer className="h-4 w-4" /> 印刷</button>
                <button type="button" onClick={() => setShowPickingList(null)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="h-5 w-5" /></button>
              </div>
            </div>
            <div ref={printRef} className="p-8">
              <div className="header mb-6">
                <h1 className="text-2xl font-bold mb-2">ピッキングリスト / PICKING LIST</h1>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p><strong>注文番号:</strong> {showPickingList.orderNumber}</p><p><strong>注文日:</strong> {new Date(showPickingList.createdAt).toLocaleDateString('ja-JP')}</p></div>
                  <div><p><strong>顧客:</strong> {showPickingList.customer?.lastName} {showPickingList.customer?.firstName}</p></div>
                </div>
              </div>
              <table className="w-full">
                <thead><tr><th className="checkbox">☐</th><th className="text-left">品番</th><th className="text-left">製品名</th><th className="text-center">数量</th><th className="text-left">確認</th></tr></thead>
                <tbody>
                  {showPickingList.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="checkbox">☐</td>
                      <td>{item.product?.hinban || (item as any).hinban || '-'}</td>
                      <td><div>{item.product?.namePt || (item as any).namePt}</div><div className="text-xs text-gray-600">{item.product?.nameJa || (item as any).nameJa}</div></td>
                      <td className="text-center font-bold">{item.quantity}</td>
                      <td>___________</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="footer mt-8">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p><strong>分離者:</strong></p><p className="mt-2">署名: _______________</p></div>
                  <div><p><strong>検査者:</strong></p><p className="mt-2">署名: _______________</p></div>
                  <div><p><strong>梱包者:</strong></p><p className="mt-2">署名: _______________</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}