'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Truck, Edit, Trash2, Package } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

interface ShippingRate {
  id: string;
  minWeight: number;
  maxWeight: number;
  price: number;
  prefecture: string | null;
  isActive: boolean;
}

interface Carrier {
  id: string;
  name: string;
  namePt: string | null;
  trackingUrlTemplate: string | null;
  isActive: boolean;
  rates: ShippingRate[];
}

export default function CarriersPage() {
  const router = useRouter();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = async () => {
    try {
      const { data } = await api.get('/api/carriers');
      setCarriers(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover esta transportadora?')) return;

    try {
      await api.delete(`/api/carriers/${id}`);
      fetchCarriers();
    } catch (error) {
      console.error('Erro ao remover:', error);
      alert('Erro ao remover transportadora');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transportadoras</h1>
            <p className="text-gray-500 mt-1">運送会社管理 • Gerenciar empresas de frete</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/carriers/new')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nova Transportadora
          </button>
        </div>
      </div>

      {carriers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma transportadora cadastrada</h3>
          <p className="text-gray-500 mb-6">運送会社が登録されていません</p>
          <button
            onClick={() => router.push('/dashboard/carriers/new')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Cadastrar Primeira Transportadora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {carriers.map((carrier) => (
            <div
              key={carrier.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Truck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{carrier.namePt || carrier.name}</h3>
                    <p className="text-sm text-gray-500">{carrier.name}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    carrier.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {carrier.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>{carrier.rates.length} faixas de preço</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Faixas de Preço</h4>
                <div className="space-y-1">
                  {carrier.rates.slice(0, 3).map((rate) => (
                    <div key={rate.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {(rate.minWeight / 1000).toFixed(1)}-{(rate.maxWeight / 1000).toFixed(1)}kg
                      </span>
                      <span className="font-medium text-gray-900">
                        ¥{rate.price.toLocaleString('ja-JP')}
                      </span>
                    </div>
                  ))}
                  {carrier.rates.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{carrier.rates.length - 3} mais...
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => router.push(`/dashboard/carriers/${carrier.id}/edit`)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(carrier.id)}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-1">Total de Transportadoras</div>
          <div className="text-3xl font-bold text-gray-900">{carriers.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-6">
          <div className="text-sm text-green-800 mb-1">Ativas</div>
          <div className="text-3xl font-bold text-green-900">
            {carriers.filter(c => c.isActive).length}
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <div className="text-sm text-blue-800 mb-1">Total de Faixas</div>
          <div className="text-3xl font-bold text-blue-900">
            {carriers.reduce((sum, c) => sum + c.rates.length, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
