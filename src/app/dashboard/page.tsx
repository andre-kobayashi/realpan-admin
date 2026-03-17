'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown,
  Clock, AlertTriangle, CreditCard, Banknote, FileText, ChevronRight,
  RefreshCw, Eye, Truck, CheckCircle, BarChart3, ArrowUpRight
} from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  ordersLastMonth: number;
  revenueLastMonth: number;
  ordersToday: number;
  revenueToday: number;
  revenueGrowth: number;
  orderGrowth: number;
  pendingOrders: number;
  pendingPayments: number;
  pjCustomers: number;
  pfCustomers: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    customer: {
      firstName?: string;
      lastName?: string;
      companyName?: string;
      email?: string;
      type?: string;
    };
  }>;
  topProducts: Array<{
    id: string;
    namePt: string;
    nameJa: string;
    hinban: string;
    image?: string;
    quantitySold: number;
    revenue: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    monthKey: string;
    revenue: number;
    orders: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
  }>;
}

function yen(n?: number | null): string { return `¥${(n || 0).toLocaleString('ja-JP')}`; }

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: '保留中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  PAID: { label: '支払済', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PROCESSING: { label: '処理中', color: 'bg-blue-100 text-blue-700', icon: Package },
  SHIPPED: { label: '発送済', color: 'bg-purple-100 text-purple-700', icon: Truck },
  DELIVERED: { label: '配達済', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELED: { label: 'キャンセル', color: 'bg-gray-100 text-gray-500', icon: Clock },
  INVOICED: { label: '請求済', color: 'bg-blue-100 text-blue-700', icon: FileText },
};

const methodLabels: Record<string, string> = {
  STRIPE: 'カード', DAIBIKI: '代引き', INVOICE: '請求書', BANK_TRANSFER: '振込', KONBINI: 'コンビニ', PAYPAY: 'PayPay',
};

const methodColors: Record<string, string> = {
  STRIPE: 'bg-blue-500', DAIBIKI: 'bg-yellow-500', INVOICE: 'bg-purple-500', BANK_TRANSFER: 'bg-green-500', KONBINI: 'bg-orange-500', PAYPAY: 'bg-red-500',
};

function customerName(c?: Stats['recentOrders'][0]['customer']): string {
  if (!c) return '—';
  if (c.companyName) return c.companyName;
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—';
}

// Simple SVG bar chart
function RevenueChart({ data }: { data: Stats['monthlyRevenue'] }) {
  if (!data || data.length === 0) return <p className="text-center text-gray-400 py-8 text-sm">データなし</p>;
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex items-end gap-3 h-40 px-2">
      {data.map((d, i) => {
        const h = Math.max(4, (d.revenue / max) * 140);
        const isCurrentMonth = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-[10px] text-gray-400 tabular-nums">{d.revenue > 0 ? yen(d.revenue) : ''}</span>
            <div className="w-full relative group">
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${isCurrentMonth ? 'bg-orange-400 hover:bg-orange-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                style={{ height: `${h}px` }}
                title={`${d.month}: ${yen(d.revenue)} (${d.orders}件)`}
              />
            </div>
            <span className="text-[10px] text-gray-500 font-medium">{d.month.replace(/\d{4}年/, '')}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/stats');
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">読み込み中...</p>
        </div>
      </div>
    );
  }

  const totalMethodRevenue = stats.paymentMethods.reduce((s, m) => s + m.total, 0) || 1;

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード / Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real Pan — ビジネスの概要</p>
        </div>
        <button type="button" onClick={fetchStats} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 更新
        </button>
      </div>

      {/* ═══ KPI Cards Row 1 — Revenue ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">今月の売上</span>
            <div className="p-1.5 bg-orange-100 rounded-lg"><DollarSign className="h-4 w-4 text-orange-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{yen(stats.revenueThisMonth)}</p>
          <div className="flex items-center gap-1 mt-2">
            {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
            <span className={`text-xs font-medium ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}%
            </span>
            <span className="text-xs text-gray-400">vs 先月</span>
          </div>
        </div>

        {/* Today Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">本日の売上</span>
            <div className="p-1.5 bg-blue-100 rounded-lg"><BarChart3 className="h-4 w-4 text-blue-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{yen(stats.revenueToday)}</p>
          <p className="text-xs text-gray-400 mt-2">{stats.ordersToday}件 今日</p>
        </div>

        {/* Orders This Month */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">今月の注文</span>
            <div className="p-1.5 bg-green-100 rounded-lg"><ShoppingCart className="h-4 w-4 text-green-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.ordersThisMonth}</p>
          <div className="flex items-center gap-1 mt-2">
            {stats.orderGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
            <span className={`text-xs font-medium ${stats.orderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.orderGrowth >= 0 ? '+' : ''}{stats.orderGrowth}%
            </span>
            <span className="text-xs text-gray-400">vs 先月 ({stats.ordersLastMonth})</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">累計売上</span>
            <div className="p-1.5 bg-purple-100 rounded-lg"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{yen(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-2">全{stats.totalOrders}件の注文</p>
        </div>
      </div>

      {/* ═══ Alert Cards — Pending ═══ */}
      {(stats.pendingOrders > 0 || stats.pendingPayments > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.pendingOrders > 0 && (
            <button type="button" onClick={() => router.push('/dashboard/orders-pj')}
              className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-all text-left group">
              <div className="p-2 bg-yellow-200 rounded-lg"><Clock className="h-5 w-5 text-yellow-700" /></div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-900">{stats.pendingOrders}件 処理待ち注文</p>
                <p className="text-xs text-yellow-600">Pedidos aguardando processamento</p>
              </div>
              <ChevronRight className="h-4 w-4 text-yellow-400 group-hover:text-yellow-600" />
            </button>
          )}
          {stats.pendingPayments > 0 && (
            <button type="button" onClick={() => router.push('/dashboard/finance/pending')}
              className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all text-left group">
              <div className="p-2 bg-orange-200 rounded-lg"><AlertTriangle className="h-5 w-5 text-orange-700" /></div>
              <div className="flex-1">
                <p className="font-semibold text-orange-900">{stats.pendingPayments}件 入金待ち</p>
                <p className="text-xs text-orange-600">Pagamentos pendentes de confirmação</p>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-400 group-hover:text-orange-600" />
            </button>
          )}
          <button type="button" onClick={() => router.push('/dashboard/finance')}
            className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all text-left group">
            <div className="p-2 bg-blue-200 rounded-lg"><DollarSign className="h-5 w-5 text-blue-700" /></div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900">財務管理</p>
              <p className="text-xs text-blue-600">Painel Financeiro completo</p>
            </div>
            <ChevronRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600" />
          </button>
        </div>
      )}

      {/* ═══ Chart + Payment Breakdown ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" /> 売上推移 / Receita Mensal
            </h3>
            <span className="text-xs text-gray-400">過去6ヶ月</span>
          </div>
          <RevenueChart data={stats.monthlyRevenue} />
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-500" /> 決済方法別
          </h3>
          <div className="space-y-3">
            {stats.paymentMethods.map((m, i) => {
              const pct = (m.total / totalMethodRevenue) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{methodLabels[m.method] || m.method}</span>
                    <span className="font-medium tabular-nums">{yen(m.total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${methodColors[m.method] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.count}件 ({pct.toFixed(1)}%)</p>
                </div>
              );
            })}
          </div>

          {/* Customer breakdown */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-500 mb-2">顧客タイプ</h4>
            <div className="flex gap-3">
              <div className="flex-1 bg-green-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-green-700">{stats.pfCustomers}</p>
                <p className="text-[10px] text-green-600">PF (個人)</p>
              </div>
              <div className="flex-1 bg-blue-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-blue-700">{stats.pjCustomers}</p>
                <p className="text-[10px] text-blue-600">PJ (法人)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Recent Orders + Top Products ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-500" /> 最近の注文 / Pedidos Recentes
            </h3>
            <button type="button" onClick={() => router.push('/dashboard/orders-pj')}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              すべて見る <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentOrders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig[order.paymentStatus] || statusConfig.PENDING;
              const Icon = sc.icon;
              return (
                <button key={order.id} type="button" onClick={() => router.push(`/dashboard/orders-pj/${order.id}/edit`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">{order.orderNumber}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}>
                        <Icon className="h-2.5 w-2.5" /> {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {customerName(order.customer)}
                      <span className="mx-1">·</span>
                      {methodLabels[order.paymentMethod] || order.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-gray-900">{yen(order.total)}</p>
                    <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                </button>
              );
            })}
            {stats.recentOrders.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">注文データなし</div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" /> 人気商品 / Top Produtos
            </h3>
            <button type="button" onClick={() => router.push('/dashboard/products')}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              すべて見る <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-100 text-yellow-700' :
                  i === 1 ? 'bg-gray-200 text-gray-600' :
                  i === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.namePt}</p>
                  <p className="text-xs text-gray-400">{product.hinban} · {product.nameJa}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold tabular-nums">{yen(product.revenue)}</p>
                  <p className="text-[10px] text-gray-400">{product.quantitySold}個</p>
                </div>
              </div>
            ))}
            {stats.topProducts.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">販売データなし</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Quick Stats Footer ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Package className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.totalProducts}</p>
          <p className="text-xs text-gray-500">製品数</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <ShoppingCart className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.totalOrders}</p>
          <p className="text-xs text-gray-500">全注文数</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Users className="h-5 w-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.totalCustomers}</p>
          <p className="text-xs text-gray-500">顧客数</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <DollarSign className="h-5 w-5 text-orange-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{yen(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-500">累計売上</p>
        </div>
      </div>
    </div>
  );
}