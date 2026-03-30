'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FolderTree } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [formData, setFormData] = useState({
    namePt: '',
    nameJa: '',
    descriptionPt: '',
    descriptionJa: '',
  });

  useEffect(() => {
    fetchCategory();
  }, []);

  const fetchCategory = async () => {
    try {
      const { data } = await api.get(`/api/categories/${categoryId}`);
      const cat = data.data;
      setFormData({
        namePt: cat.namePt || '',
        nameJa: cat.nameJa || '',
        descriptionPt: cat.descriptionPt || '',
        descriptionJa: cat.descriptionJa || '',
      });
    } catch (error) {
      console.error('Erro ao carregar categoria:', error);
      alert('Erro ao carregar categoria');
      router.back();
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/api/categories/${categoryId}`, formData);
      alert('Categoria atualizada com sucesso!');
      router.push('/dashboard/categories');
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      alert('Erro ao atualizar categoria');
    } finally {
      setLoading(false);
    }
  };

  if (loadingCategory) {
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
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Categoria</h1>
            <p className="text-gray-500 mt-1">カテゴリー編集</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
            <FolderTree className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Informações da Categoria</h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome (Português) *</label>
              <input type="text" required value={formData.namePt}
                onChange={(e) => setFormData({ ...formData, namePt: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">名前 (日本語) *</label>
              <input type="text" required value={formData.nameJa}
                onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição (Português)</label>
            <textarea rows={3} value={formData.descriptionPt}
              onChange={(e) => setFormData({ ...formData, descriptionPt: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">説明 (日本語)</label>
            <textarea rows={3} value={formData.descriptionJa}
              onChange={(e) => setFormData({ ...formData, descriptionJa: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium">
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
