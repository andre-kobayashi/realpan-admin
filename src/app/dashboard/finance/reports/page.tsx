'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Download,
  RefreshCw, DollarSign, CreditCard, Printer,
  Package, Users, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

// Types — flexible to match whatever the API returns
interface ReportData {
  summary?: {
    totalRevenue?: number;
    totalOrders?: number;
    avgOrderValue?: number;
    totalShipping?: number;
    totalTax?: number;
    netRevenue?: number;
    previousPeriodRevenue?: number;
    growthPercent?: number;
    grandTotal?: number;
    grandPaid?: number;
    grandPending?: number;
    orderCount?: number;
  };
  byMethod?: Record<string, { count?: number; total?: number; paid?: number; pending?: number }>;
  byPaymentMethod?: { method: string; count: number; total: number; percent: number }[];
  byCustomerType?: { type: string; count: number; total: number; percent: number }[];
  dailyRevenue?: { date: string; revenue: number; orders: number }[];
  topCustomers?: { id: string; name?: string; companyName?: string; type?: string; totalSpent?: number; orderCount?: number }[];
  topProducts?: { id: string; name?: string; quantitySold?: number; revenue?: number }[];
}

function yen(n?: number | null): string { return `¥${(n || 0).toLocaleString('ja-JP')}`; }
function fmtDate(s: string): string { return new Date(s).toLocaleDateString('ja-JP'); }

const methodLabels: Record<string, { label: string; color: string }> = {
  STRIPE: { label: 'カード決済', color: 'bg-blue-500' },
  DAIBIKI: { label: '代引き', color: 'bg-yellow-500' },
  BANK_TRANSFER: { label: '銀行振込', color: 'bg-green-500' },
  INVOICE: { label: '請求書払い', color: 'bg-purple-500' },
  KONBINI: { label: 'コンビニ', color: 'bg-orange-500' },
  PAYPAY: { label: 'PayPay', color: 'bg-red-500' },
};

// Simple SVG bar chart
function BarChartSVG({ data }: { data: { label: string; value: number }[] }) {
  if (!data || data.length === 0) return <p className="text-center text-gray-400 py-8 text-sm">データなし</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(8, Math.min(28, 600 / data.length - 4));
  const h = 160;
  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(data.length * (barW + 4) + 50, 300)} height={h + 30} className="w-full">
        {[0, 0.5, 1].map(p => <line key={p} x1={40} y1={h * (1 - p) + 5} x2="95%" y2={h * (1 - p) + 5} stroke="#f0f0f0" />)}
        {data.map((d, i) => {
          const bh = Math.max(2, (d.value / max) * h);
          const x = 45 + i * (barW + 4);
          return (
            <g key={i}>
              <rect x={x} y={h - bh + 5} width={barW} height={bh} rx={3} className="fill-orange-400 hover:fill-orange-500"><title>{`${d.label}: ${yen(d.value)}`}</title></rect>
              <text x={x + barW / 2} y={h + 20} textAnchor="middle" fontSize={8} fill="#999">{d.label.slice(-5)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BreakdownBar({ items }: { items: { label: string; value: number; pct: number; color: string }[] }) {
  if (!items || items.length === 0) return <p className="text-center text-gray-400 py-4 text-sm">データなし</p>;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${item.color}`} /><span className="text-gray-700">{item.label}</span></div>
            <div className="flex items-center gap-3"><span className="text-xs text-gray-400">{item.pct.toFixed(1)}%</span><span className="font-medium tabular-nums">{yen(item.value)}</span></div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.max(item.pct, 1)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

type PeriodType = 'month' | 'quarter' | 'year';

function getPeriod(type: PeriodType, offset: number) {
  const now = new Date();
  if (type === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: d.toISOString().split('T')[0], to: end.toISOString().split('T')[0], label: d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }) };
  }
  if (type === 'quarter') {
    const cq = Math.floor(now.getMonth() / 3);
    const tq = cq + offset;
    const yr = now.getFullYear() + Math.floor(tq / 4);
    const q = ((tq % 4) + 4) % 4;
    const d = new Date(yr, q * 3, 1);
    const end = new Date(yr, q * 3 + 3, 0);
    return { from: d.toISOString().split('T')[0], to: end.toISOString().split('T')[0], label: `${yr}年 Q${q + 1}` };
  }
  const yr = now.getFullYear() + offset;
  return { from: `${yr}-01-01`, to: `${yr}-12-31`, label: `${yr}年` };
}

export default function FinanceReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [periodOffset, setPeriodOffset] = useState(0);

  const period = getPeriod(periodType, periodOffset);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/finance/reports', { params: { from: period.from, to: period.to } });
      if (data.success) setReport(data.data || data);
    } catch (err) { console.error('Report error:', err); }
    finally { setLoading(false); }
  }, [period.from, period.to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleCSV = () => {
    if (!report?.dailyRevenue) return;
    const rows = [['Data', 'Receita', 'Pedidos'], ...report.dailyRevenue.map(d => [d.date, String(d.revenue), String(d.orders)])];
    const blob = new Blob(['\uFEFF' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `realpan-report-${period.from}.csv`; a.click();
  };

  // Normalize summary — API might return different shapes
  const s = report?.summary || {};
  const totalRevenue = s.totalRevenue ?? s.grandTotal ?? 0;
  const totalOrders = s.totalOrders ?? s.orderCount ?? 0;
  const avgOrder = s.avgOrderValue ?? (totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0);
  const netRevenue = s.netRevenue ?? totalRevenue - (s.totalShipping || 0) - (s.totalTax || 0);
  const growth = s.growthPercent ?? 0;
  const prevRevenue = s.previousPeriodRevenue ?? 0;

  // Normalize byMethod — could be object or array
  const methodItems: { label: string; value: number; pct: number; color: string }[] = [];
  if (report?.byPaymentMethod && Array.isArray(report.byPaymentMethod)) {
    report.byPaymentMethod.forEach(m => {
      const ml = methodLabels[m.method] || { label: m.method, color: 'bg-gray-400' };
      methodItems.push({ label: ml.label, value: m.total || 0, pct: m.percent || 0, color: ml.color });
    });
  } else if (report?.byMethod && typeof report.byMethod === 'object') {
    const total = Object.values(report.byMethod).reduce((s, v) => s + (v.total || 0), 0) || 1;
    Object.entries(report.byMethod).forEach(([method, val]) => {
      if ((val.total || 0) === 0 && (val.count || 0) === 0) return;
      const ml = methodLabels[method] || { label: method, color: 'bg-gray-400' };
      methodItems.push({ label: ml.label, value: val.total || 0, pct: ((val.total || 0) / total) * 100, color: ml.color });
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">Relatórios Financeiros / 財務レポート</h1><p className="text-sm text-gray-500 mt-1">Análise de receitas, pedidos e performance</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCSV} disabled={!report || loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Download size={16} />CSV</button>
            <button type="button" onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><Printer size={16} />Imprimir</button>
          </div>
        </div>

        {/* Period Nav */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {([{ v: 'month' as PeriodType, l: '月次' }, { v: 'quarter' as PeriodType, l: '四半期' }, { v: 'year' as PeriodType, l: '年間' }]).map(t => (
                <button key={t.v} type="button" onClick={() => { setPeriodType(t.v); setPeriodOffset(0); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${periodType === t.v ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setPeriodOffset(o => o - 1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
              <div className="text-center min-w-[160px]"><p className="font-semibold">{period.label}</p><p className="text-xs text-gray-400">{fmtDate(period.from)} 〜 {fmtDate(period.to)}</p></div>
              <button type="button" onClick={() => setPeriodOffset(o => o + 1)} disabled={periodOffset >= 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
            <button type="button" onClick={fetchReport} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Atualizar</button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center"><RefreshCw size={40} className="mx-auto text-gray-300 animate-spin mb-4" /><p className="text-gray-500">Gerando relatório...</p></div>
        ) : !report ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center"><BarChart3 size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">Sem dados para o período</p></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2"><div className="p-2 bg-orange-100 rounded-lg"><DollarSign size={18} className="text-orange-600" /></div>
                  {growth !== 0 && <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(growth)}%</span>}
                </div>
                <p className="text-xs text-gray-500 mb-1">Receita Total / 総収入</p><p className="text-xl font-bold">{yen(totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="p-2 bg-blue-100 rounded-lg w-fit mb-2"><Package size={18} className="text-blue-600" /></div><p className="text-xs text-gray-500 mb-1">Pedidos / 注文数</p><p className="text-xl font-bold">{totalOrders}</p></div>
              <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="p-2 bg-green-100 rounded-lg w-fit mb-2"><Activity size={18} className="text-green-600" /></div><p className="text-xs text-gray-500 mb-1">Ticket Médio / 平均単価</p><p className="text-xl font-bold">{yen(avgOrder)}</p></div>
              <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="p-2 bg-purple-100 rounded-lg w-fit mb-2"><TrendingUp size={18} className="text-purple-600" /></div><p className="text-xs text-gray-500 mb-1">Receita Líquida / 純収入</p><p className="text-xl font-bold">{yen(netRevenue)}</p></div>
            </div>

            {/* Chart */}
            {report.dailyRevenue && report.dailyRevenue.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-orange-500" />Receita Diária / 日次収入</h3>
                <BarChartSVG data={report.dailyRevenue.map(d => ({ label: d.date, value: d.revenue || 0 }))} />
              </div>
            )}

            {/* Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-blue-500" />支払方法別</h3>
                <BreakdownBar items={methodItems} />
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">送料合計</p><p className="font-semibold mt-1">{yen(s.totalShipping)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">税金合計</p><p className="font-semibold mt-1">{yen(s.totalTax)}</p></div>
                </div>
              </div>
              {report.byCustomerType && report.byCustomerType.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Users size={16} className="text-green-500" />顧客タイプ別</h3>
                  <BreakdownBar items={report.byCustomerType.map(c => ({ label: c.type === 'PF' || c.type === 'INDIVIDUAL' ? 'PF (個人)' : 'PJ (法人)', value: c.total || 0, pct: c.percent || 0, color: c.type === 'PF' || c.type === 'INDIVIDUAL' ? 'bg-green-500' : 'bg-blue-500' }))} />
                </div>
              )}
            </div>

            {/* Top Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {report.topCustomers && report.topCustomers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Users size={16} className="text-orange-500" />Top Clientes / 優良顧客</h3>
                  <div className="space-y-3">
                    {report.topCustomers.slice(0, 5).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.companyName || c.name || '—'}</p><p className="text-xs text-gray-400">{c.orderCount || 0}件 · {c.type || ''}</p></div>
                        <span className="text-sm font-bold tabular-nums">{yen(c.totalSpent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.topProducts && report.topProducts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Package size={16} className="text-purple-500" />Top Produtos / 人気商品</h3>
                  <div className="space-y-3">
                    {report.topProducts.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name || '—'}</p><p className="text-xs text-gray-400">{p.quantitySold || 0}個</p></div>
                        <span className="text-sm font-bold tabular-nums">{yen(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {prevRevenue > 0 && (
              <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">前期比較</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">前期: {yen(prevRevenue)}</span>
                    <span className={`inline-flex items-center gap-1 font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{growth >= 0 ? '+' : ''}{growth}%</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}