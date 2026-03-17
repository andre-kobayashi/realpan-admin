'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, CreditCard,
  ArrowUpRight, ArrowDownRight, ExternalLink, RefreshCw,
  Wallet, Banknote, AlertCircle, CheckCircle, XCircle,
  ChevronRight, BarChart3, Receipt, Undo2
} from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

interface DashboardData {
  balance: { available: number; pending: number; currency: string };
  revenue: {
    today: number; thisMonth: number; lastMonth: number;
    growthPercent: number; byMethod: Record<string, number>;
  };
  pendingOrders: number;
  charts: {
    last7Days: { date: string; revenue: number; orders: number }[];
    last12Months: { month: string; revenue: number; orders: number }[];
  };
}

interface Payment {
  id: string; amount: number; currency: string; status: string;
  paymentMethod: string; customerEmail: string | null;
  description: string | null; metadata: Record<string, string>;
  created: string; fee: number; net: number;
}

interface Payout {
  id: string; amount: number; currency: string; status: string;
  arrivalDate: string; created: string; method: string; description: string;
}

interface Refund {
  id: string; amount: number; currency: string; status: string;
  reason: string; paymentIntentId: string; created: string;
}

const STRIPE_DASHBOARD_URL = 'https://dashboard.stripe.com';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  succeeded:           { bg: 'bg-green-50', text: 'text-green-700', label: '成功' },
  requires_payment_method: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '要支払方法' },
  requires_confirmation:   { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '要確認' },
  processing:          { bg: 'bg-blue-50', text: 'text-blue-700', label: '処理中' },
  canceled:            { bg: 'bg-gray-100', text: 'text-gray-500', label: 'キャンセル' },
  requires_action:     { bg: 'bg-orange-50', text: 'text-orange-700', label: '要アクション' },
  paid:                { bg: 'bg-green-50', text: 'text-green-700', label: '入金済' },
  pending:             { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '保留中' },
  in_transit:          { bg: 'bg-blue-50', text: 'text-blue-700', label: '送金中' },
  failed:              { bg: 'bg-red-50', text: 'text-red-700', label: '失敗' },
};

const METHOD_LABELS: Record<string, string> = {
  STRIPE: 'カード', DAIBIKI: '代引', INVOICE: '請求書',
  card: 'カード', konbini: 'コンビニ', bank_transfer: '振込',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
}

function MiniBarChart({ data, maxHeight = 60 }: { data: { value: number; label: string }[]; maxHeight?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-orange-400 rounded-t-sm transition-all hover:bg-orange-500"
            style={{ height: `${Math.max((d.value / max) * maxHeight, 2)}px` }}
            title={`${d.label}: ¥${d.value.toLocaleString()}`} />
          <span className="text-[8px] text-gray-400">{d.label.slice(-2)}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'payouts' | 'refunds'>('payments');
  const [chartView, setChartView] = useState<'7d' | '12m'>('7d');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dashRes, payRes, payoutRes, refundRes] = await Promise.all([
        api.get('/api/finance/dashboard'),
        api.get('/api/finance/payments?limit=15'),
        api.get('/api/finance/payouts?limit=10'),
        api.get('/api/finance/refunds?limit=10'),
      ]);
      if (dashRes.data.success) setDashboard(dashRes.data.data);
      if (payRes.data.success) setPayments(payRes.data.data);
      if (payoutRes.data.success) setPayouts(payoutRes.data.data);
      if (refundRes.data.success) setRefunds(refundRes.data.data);
    } catch (err) {
      console.error('Finance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">読み込み中...</p>
        </div>
      </div>
    );
  }

  const d = dashboard;

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-orange-500" />
            財務管理 / Painel Financeiro
          </h1>
          <p className="text-sm text-gray-500 mt-1">Stripe + 注文データ</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" /> 更新
          </button>
          <a href={STRIPE_DASHBOARD_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#635BFF] hover:bg-[#5851EA] text-white text-sm font-medium rounded-lg transition-colors">
            <ExternalLink className="h-4 w-4" /> Stripe Dashboard
          </a>
        </div>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      {d && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Saldo disponível */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">利用可能残高</span>
              <Wallet className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              ¥{d.balance.available.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              保留中: ¥{d.balance.pending.toLocaleString()}
            </p>
          </div>

          {/* Receita do mês */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">今月の売上</span>
              <BarChart3 className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              ¥{d.revenue.thisMonth.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {d.revenue.growthPercent >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={`text-xs font-medium ${d.revenue.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {d.revenue.growthPercent >= 0 ? '+' : ''}{d.revenue.growthPercent}% vs 先月
              </span>
            </div>
          </div>

          {/* Receita hoje */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">本日の売上</span>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              ¥{d.revenue.today.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              先月合計: ¥{d.revenue.lastMonth.toLocaleString()}
            </p>
          </div>

          {/* Pedidos pendentes */}
          
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">処理待ち注文</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {d.pendingOrders}
            </p>
            <p className="text-xs text-gray-400 mt-1">件 / pedido(s)</p>
          </div>
        </div>
      )}

      {/* Sub-page Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a href="/dashboard/finance/pending"
           className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all group">
          <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Pendentes / 入金待ち</p>
            <p className="text-xs text-gray-400">Pagamentos aguardando confirmação</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
        </a>
        <a href="/dashboard/finance/invoices"
           className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all group">
          <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
            <Receipt className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Faturas PJ / 請求書</p>
            <p className="text-xs text-gray-400">Gerenciar faturas corporativas</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
        </a>
        <a href="/dashboard/finance/reports"
           className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Relatórios / レポート</p>
            <p className="text-xs text-gray-400">Análise financeira por período</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
        </a>
      </div>

      {/* ═══ CHART + BREAKDOWN ═══ */}
      {d && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">売上推移 / Receitas</h3>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button type="button" onClick={() => setChartView('7d')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartView === '7d' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                  7日間
                </button>
                <button type="button" onClick={() => setChartView('12m')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartView === '12m' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                  12ヶ月
                </button>
              </div>
            </div>
            <MiniBarChart
              data={(chartView === '7d' ? d.charts.last7Days : d.charts.last12Months).map(item => ({
                value: 'revenue' in item ? item.revenue : 0,
                label: 'date' in item ? (item as any).date : (item as any).month,
              }))}
              maxHeight={80}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
              <span>合計: ¥{(chartView === '7d' ? d.charts.last7Days : d.charts.last12Months).reduce((s, i) => s + i.revenue, 0).toLocaleString()}</span>
              <span>{(chartView === '7d' ? d.charts.last7Days : d.charts.last12Months).reduce((s, i) => s + i.orders, 0)} 件</span>
            </div>
          </div>

          {/* Payment method breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">決済方法別 / Por método</h3>
            <div className="space-y-3">
              {Object.entries(d.revenue.byMethod).map(([method, amount]) => {
                const pct = d.revenue.thisMonth > 0 ? Math.round((amount / d.revenue.thisMonth) * 100) : 0;
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{METHOD_LABELS[method] || method}</span>
                      <span className="font-medium text-gray-900 tabular-nums">¥{amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(d.revenue.byMethod).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">今月のデータなし</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TABS: Payments / Payouts / Refunds ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'payments' as const, label: '決済一覧', icon: CreditCard, count: payments.length },
            { id: 'payouts' as const, label: '入金履歴', icon: Banknote, count: payouts.length },
            { id: 'refunds' as const, label: '返金', icon: Undo2, count: refunds.length },
          ].map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Payments tab */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">日時</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">顧客</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">方法</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">ステータス</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">金額</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">手数料</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">純額</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(p.created).toLocaleDateString('ja-JP')}
                      <br /><span className="text-xs text-gray-400">{new Date(p.created).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.customerEmail || p.metadata?.orderNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">¥{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">¥{p.fee.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-green-700">¥{p.net.toLocaleString()}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">決済データなし</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Payouts tab */}
        {activeTab === 'payouts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">作成日</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">入金予定日</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">方法</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">金額</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600">{new Date(p.created).toLocaleDateString('ja-JP')}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{new Date(p.arrivalDate).toLocaleDateString('ja-JP')}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{p.method === 'standard' ? '通常' : p.method}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">¥{p.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {payouts.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">入金履歴なし</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Refunds tab */}
        {activeTab === 'refunds' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">日時</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">決済ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">理由</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">ステータス</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">返金額</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600">{new Date(r.created).toLocaleDateString('ja-JP')}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.paymentIntentId?.slice(0, 20)}...</td>
                    <td className="px-4 py-3 text-gray-600">{r.reason || '—'}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-red-600">-¥{r.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">返金データなし</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ STRIPE DASHBOARD LINKS ═══ */}
      <div className="bg-gradient-to-r from-[#635BFF] to-[#7B73FF] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="white"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">Stripe Dashboard</h3>
              <p className="text-white/70 text-xs">詳細な管理はStripeで / Gerenciamento detalhado</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: '決済管理', sublabel: 'Pagamentos', href: '/payments', icon: CreditCard },
            { label: '残高確認', sublabel: 'Saldo', href: '/balance/overview', icon: Wallet },
            { label: '入金履歴', sublabel: 'Payouts', href: '/payouts', icon: Banknote },
            { label: '顧客管理', sublabel: 'Clientes', href: '/customers', icon: Receipt },
          ].map(link => (
            <a key={link.label} href={STRIPE_DASHBOARD_URL + link.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all group">
              <link.icon className="h-5 w-5 text-white/70 group-hover:text-white" />
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-white">{link.label}</span>
                <span className="block text-[10px] text-white/50">{link.sublabel}</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}