'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Gift, Star, Eye, EyeOff, Package, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

interface KitItem {
  id: string;
  quantity: number;
  product: { namePt: string; nameJa: string };
}
interface KitImage {
  imageUrl: string;
  isPrimary: boolean;
}
interface Kit {
  id: string;
  slug: string;
  namePt: string;
  nameJa: string;
  basePrice: number;
  promoPrice: number | null;
  effectivePrice: number;
  totalItems: number;
  isActive: boolean;
  isFeatured: boolean;
  giftEnabled: boolean;
  items: KitItem[];
  images: KitImage[];
  primaryImage: string | null;
  createdAt: string;
}

export default function KitsPage() {
  const router = useRouter();
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKits();
  }, []);

  const fetchKits = async () => {
    try {
      const { data } = await api.get('/api/kits');
      if (data.success) setKits(data.data || []);
    } catch (err) {
      console.error('Failed to fetch kits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (kit: Kit) => {
    if (!confirm(`"${kit.namePt}" を削除しますか？\n\nDeseja excluir "${kit.namePt}"?`)) return;
    try {
      await api.delete(`/api/kits/${kit.id}`);
      setKits(prev => prev.filter(k => k.id !== kit.id));
    } catch (err) {
      console.error('Failed to delete kit:', err);
      alert('削除に失敗しました / Falha ao excluir');
    }
  };

  const toggleActive = async (kit: Kit) => {
    try {
      await api.patch(`/api/kits/${kit.id}`, { isActive: !kit.isActive });
      setKits(prev => prev.map(k => k.id === kit.id ? { ...k, isActive: !k.isActive } : k));
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const toggleFeatured = async (kit: Kit) => {
    try {
      await api.patch(`/api/kits/${kit.id}`, { isFeatured: !kit.isFeatured });
      setKits(prev => prev.map(k => k.id === kit.id ? { ...k, isFeatured: !k.isFeatured } : k));
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-orange-500" />
            Kits Premium / プレミアムキット
          </h1>
          <p className="text-sm text-gray-500 mt-1">{kits.length} kit(s) cadastrado(s)</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/kits/new')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Kit / 新規キット
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
        </div>
      ) : kits.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Nenhum kit cadastrado / キットがありません</p>
          <button type="button" onClick={() => router.push('/dashboard/kits/new')}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Criar primeiro kit
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kit</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 w-20">Itens</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 w-32">Preço Base</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 w-32">Promo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 w-20">Brinde</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 w-24">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {kits.map((kit) => (
                <tr key={kit.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  {/* Kit name + image */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {kit.primaryImage ? (
                          <img src={kit.primaryImage.startsWith('http') ? kit.primaryImage : `${process.env.NEXT_PUBLIC_API_URL}/uploads/kits/${kit.primaryImage}`}
                            alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Gift className="h-5 w-5 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{kit.namePt}</p>
                        <p className="text-xs text-gray-400 truncate">{kit.nameJa}</p>
                      </div>
                      {kit.isFeatured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </td>

                  {/* Items count */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-full">
                      <Package className="h-3 w-3" /> {kit.totalItems}
                    </span>
                  </td>

                  {/* Base price */}
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    ¥{kit.basePrice.toLocaleString()}
                  </td>

                  {/* Promo price */}
                  <td className="px-4 py-3 text-right">
                    {kit.promoPrice ? (
                      <span className="font-mono font-bold text-red-600">¥{kit.promoPrice.toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Gift */}
                  <td className="px-4 py-3 text-center">
                    {kit.giftEnabled ? (
                      <Sparkles className="h-4 w-4 text-orange-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <button type="button" onClick={() => toggleActive(kit)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        kit.isActive
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {kit.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {kit.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => toggleFeatured(kit)}
                        title={kit.isFeatured ? 'Remover destaque' : 'Destacar'}
                        className={`p-2 rounded-lg transition-colors ${
                          kit.isFeatured ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' : 'text-gray-400 hover:bg-gray-100'
                        }`}>
                        <Star className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => router.push(`/dashboard/kits/${kit.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(kit)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}