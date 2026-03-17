'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Edit, Trash2, Package,
  SlidersHorizontal, X
} from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import type { Product, ApiResponse } from '@/types';

type StorageFilter = 'ALL' | 'AMBIENT' | 'FROZEN_READY' | 'FROZEN_RAW' | 'REFRIGERATED';
type StockFilter   = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
type StatusFilter  = 'ALL' | 'ACTIVE' | 'INACTIVE';
type SortField     = 'namePt' | 'hinban' | 'originalPrice' | 'stock' | 'createdAt';
type SortDir       = 'asc' | 'desc';

const STORAGE_LABELS: Record<string, string> = {
  AMBIENT:      '🏠 Seco / 常温',
  FROZEN_READY: '❄️ Congelado Pronto / 冷凍(調理済)',
  FROZEN_RAW:   '❄️ Congelado Cru / 冷凍(生)',
  REFRIGERATED: '🧊 Refrigerado / 冷蔵',
};

function StorageBadge({ type }: { type?: string }) {
  const map: Record<string, { label: string; color: string }> = {
    AMBIENT:      { label: '常温',       color: 'bg-orange-50 text-orange-700 border-orange-200' },
    FROZEN_READY: { label: '冷凍(済)',   color: 'bg-sky-50 text-sky-700 border-sky-200' },
    FROZEN_RAW:   { label: '冷凍(生)',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
    REFRIGERATED: { label: '冷蔵',       color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  };
  const info = map[type || ''] || { label: type || '-', color: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${info.color}`}>
      {info.label}
    </span>
  );
}

// ── Toggle Switch Component ──
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts]         = useState<Product[]>([]);
  const [categories, setCategories]     = useState<{ id: string; namePt: string }[]>([]);
  const [loading, setLoading]           = useState(true);
  const [togglingIds, setTogglingIds]   = useState<Set<string>>(new Set());
  const [search, setSearch]             = useState('');
  const [catFilter, setCatFilter]       = useState('ALL');
  const [storFilter, setStorFilter]     = useState<StorageFilter>('ALL');
  const [stockFilter, setStockFilter]   = useState<StockFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField]       = useState<SortField>('hinban');
  const [sortDir, setSortDir]           = useState<SortDir>('asc');
  const [showFilters, setShowFilters]   = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get<ApiResponse<Product[]>>('/api/products?all=true'),
        api.get<ApiResponse<{ id: string; namePt: string }[]>>('/api/categories'),
      ]);
      setProducts(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (productId: string) => {
    setTogglingIds(prev => new Set(prev).add(productId));
    try {
      const { data } = await api.patch(`/api/products/${productId}/toggle`);
      if (data.success) {
        setProducts(prev => prev.map(p =>
          p.id === productId ? { ...p, isActive: data.data.isActive } : p
        ));
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do produto');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`"${productName}"を削除しますか？\n\nDeseja realmente excluir "${productName}"?`)) return;
    try {
      await api.delete(`/api/products/${productId}`);
      alert('製品が削除されました / Produto excluído com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('製品の削除に失敗しました / Erro ao excluir produto');
    }
  };

  const getRetailPrice = (product: Product) => {
    if (product.promoPrice) return product.promoPrice;
    return Math.ceil((product.originalPrice || 0) / (product.retailMarkup || 0.6));
  };

  const activeFilterCount = [
    catFilter    !== 'ALL',
    storFilter   !== 'ALL',
    stockFilter  !== 'ALL',
    statusFilter !== 'ALL',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCatFilter('ALL');
    setStorFilter('ALL');
    setStockFilter('ALL');
    setStatusFilter('ALL');
    setSearch('');
  };

  const filtered = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.hinban  || '').toLowerCase().includes(q) ||
        (p.namePt  || '').toLowerCase().includes(q) ||
        (p.nameJa  || '').toLowerCase().includes(q) ||
        (p.janCode || '').toLowerCase().includes(q)
      );
    }

    if (catFilter    !== 'ALL') list = list.filter(p => p.categoryId === catFilter);
    if (storFilter   !== 'ALL') list = list.filter(p => p.storageType === storFilter);
    if (statusFilter !== 'ALL') list = list.filter(p =>
      statusFilter === 'ACTIVE' ? p.isActive : !p.isActive
    );
    if (stockFilter  !== 'ALL') {
      list = list.filter(p => {
        const s = p.stock ?? 0;
        if (stockFilter === 'OUT_OF_STOCK') return s === 0;
        if (stockFilter === 'LOW_STOCK')    return s > 0 && s <= 10;
        if (stockFilter === 'IN_STOCK')     return s > 10;
        return true;
      });
    }

    list.sort((a, b) => {
      let va: string | number = a[sortField] ?? '';
      let vb: string | number = b[sortField] ?? '';
      if (sortField === 'hinban') {
        va = parseInt(va as string) || 0;
        vb = parseInt(vb as string) || 0;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [products, search, catFilter, storFilter, stockFilter, statusFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-red-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Contadores para header
  const activeCount = products.filter(p => p.isActive).length;
  const inactiveCount = products.length - activeCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">製品 / Produtos</h1>
            <p className="text-gray-500 mt-1">
              全{products.length}件 ({activeCount} ativo{activeCount !== 1 ? 's' : ''}, {inactiveCount} inativo{inactiveCount !== 1 ? 's' : ''}) — {filtered.length} 件表示
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/products/new')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            新規製品
          </button>
        </div>
      </div>

      {/* Barra de busca + filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome PT, nome JP, 品番 (hinban) ou JAN code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors text-sm font-medium ${
              showFilters || activeFilterCount > 0
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Categoria / カテゴリー</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                <option value="ALL">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.namePt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Armazenamento / 保存方法</label>
              <select value={storFilter} onChange={e => setStorFilter(e.target.value as StorageFilter)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                <option value="ALL">Todos</option>
                <option value="AMBIENT">🏠 Seco / 常温</option>
                <option value="FROZEN_READY">❄️ Congelado Pronto / 冷凍(調理済)</option>
                <option value="FROZEN_RAW">❄️ Congelado Cru / 冷凍(生)</option>
                <option value="REFRIGERATED">🧊 Refrigerado / 冷蔵</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Estoque / 在庫</label>
              <select value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                <option value="ALL">Todos</option>
                <option value="IN_STOCK">Em estoque (+10)</option>
                <option value="LOW_STOCK">Estoque baixo (1-10)</option>
                <option value="OUT_OF_STOCK">Sem estoque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Status / ステータス</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                <X className="h-4 w-4" /> Limpar filtros
              </button>
            )}
          </div>
        )}

        {activeFilterCount > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2 pt-2">
            {catFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                {categories.find(c => c.id === catFilter)?.namePt}
                <button type="button" onClick={() => setCatFilter('ALL')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {storFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {STORAGE_LABELS[storFilter]}
                <button type="button" onClick={() => setStorFilter('ALL')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {stockFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                {stockFilter === 'IN_STOCK' ? 'Em estoque' : stockFilter === 'LOW_STOCK' ? 'Estoque baixo' : 'Sem estoque'}
                <button type="button" onClick={() => setStockFilter('ALL')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                {statusFilter === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                <button type="button" onClick={() => setStatusFilter('ALL')}><X className="h-3 w-3" /></button>
              </span>
            )}
            <button type="button" onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600">Limpar</button>
          </div>
        )}
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {products.length === 0 ? '製品が登録されていません' : 'フィルター条件に一致する製品がありません'}
          </h3>
          <p className="text-gray-500 mb-6">
            {products.length === 0 ? 'Nenhum produto cadastrado' : 'Tente ajustar os filtros ou a busca'}
          </p>
          {products.length === 0 ? (
            <button type="button" onClick={() => router.push('/dashboard/products/new')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              最初の製品を追加
            </button>
          ) : (
            <button type="button" onClick={clearFilters}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">製品</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort('hinban')}>品番 <SortIcon field="hinban" /></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">カテゴリー</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">保存</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort('originalPrice')}>基準価格 <SortIcon field="originalPrice" /></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">小売価格</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort('stock')}>在庫 <SortIcon field="stock" /></th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((product: Product) => {
                  const retailPrice = getRetailPrice(product);
                  const stock = product.stock ?? 0;
                  const isToggling = togglingIds.has(product.id);

                  return (
                    <tr key={product.id} className={`transition-colors ${
                      product.isActive ? 'hover:bg-gray-50' : 'bg-gray-50/50 opacity-60'
                    }`}>
                      {/* Produto */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.primaryImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.primaryImage} alt={product.namePt || product.nameJa}
                              className={`h-12 w-12 rounded-lg object-cover flex-shrink-0 ${!product.isActive ? 'grayscale' : ''}`} />
                          ) : (
                            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className={`font-medium truncate max-w-[240px] ${product.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              {product.namePt}
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-[240px]">{product.nameJa}</div>
                            {product.janCode && (
                              <div className="text-xs text-gray-300 font-mono mt-0.5">{product.janCode}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{product.hinban}</code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.category?.namePt || '-'}</td>
                      <td className="px-6 py-4"><StorageBadge type={product.storageType} /></td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        ¥{(product.originalPrice || 0).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600 whitespace-nowrap">
                        ¥{Math.ceil(retailPrice).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          stock > 10 ? 'bg-green-100 text-green-800'
                          : stock > 0 ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        }`}>{stock}</span>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <ToggleSwitch
                            checked={product.isActive}
                            onChange={() => handleToggle(product.id)}
                            disabled={isToggling}
                          />
                          <span className={`text-[10px] font-medium ${product.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                            {product.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button"
                            onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="編集 / Editar">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button type="button"
                            onClick={() => handleDelete(product.id, product.namePt || product.nameJa)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="削除 / Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}