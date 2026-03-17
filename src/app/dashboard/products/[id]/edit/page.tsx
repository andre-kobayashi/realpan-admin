'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calculator, Percent, Barcode, Package, Save } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import ImageUpload from '@/components/ImageUpload';
import type { Category, Product, ApiResponse } from '@/types';

interface PricePreview {
  pf: { subtotal: string; tax: string; total: string };
  pj: { subtotal: string; tax: string; total: string };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    namePt: '',
    nameJa: '',
    descriptionPt: '',
    descriptionJa: '',
    hinban: '',
    janCode: '',
    originalPrice: '',
    customRetailPrice: '',
    promoPrice: '',
    promoStartDate: '',
    promoEndDate: '',
    stock: '',
    categoryId: '',
    weightGrams: '',
    quantityInfo: '',
    shelfLifeDays: '',
    storageType: 'AMBIENT',
    retailMarkup: '0.6',
    wholesaleUnit: 'UNIT',
    unitsPerBox: '',
    customBoxPrice: '',
    isNew: false,
    isBestseller: false,
    isFeatured: false,
    isOnSale: false,
  });

  const suggestedRetailPrice = formData.originalPrice 
    ? (parseFloat(formData.originalPrice) / parseFloat(formData.retailMarkup)).toFixed(2)
    : '';

  // Calcular preço da caixa (arredondamento japonês)
  const autoBoxPrice = formData.wholesaleUnit === 'BOX' && formData.originalPrice && formData.unitsPerBox
    ? Math.ceil(parseFloat(formData.originalPrice) * parseInt(formData.unitsPerBox))
    : null;
  const calculatedBoxPrice = formData.customBoxPrice
    ? parseInt(formData.customBoxPrice)
    : autoBoxPrice;

  useEffect(() => {
    fetchCategories();
    fetchProduct();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get<ApiResponse<Category[]>>('/api/categories');
      setCategories(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      const { data } = await api.get<ApiResponse<Product>>(`/api/products/${productId}`);
      const product = data.data;

      setFormData({
        namePt: product.namePt || '',
        nameJa: product.nameJa || '',
        descriptionPt: product.descriptionPt || '',
        descriptionJa: product.descriptionJa || '',
        hinban: product.hinban || '',
        janCode: product.janCode || '',
        originalPrice: (product.originalPrice || 0).toString(),
        customRetailPrice: '',
        promoPrice: product.promoPrice ? product.promoPrice.toString() : '',
        promoStartDate: product.promoStartDate?.split('T')[0] || '',
        promoEndDate: product.promoEndDate?.split('T')[0] || '',
        stock: product.stock?.toString() || '0',
        categoryId: product.categoryId || '',
        weightGrams: product.weightGrams?.toString() || '',
        quantityInfo: product.quantityInfo || '',
        shelfLifeDays: product.shelfLifeDays?.toString() || '',
        storageType: product.storageType || 'AMBIENT',
        retailMarkup: product.retailMarkup?.toString() || '0.6',
        wholesaleUnit: product.wholesaleUnit || 'UNIT',
        unitsPerBox: product.unitsPerBox?.toString() || '',
        customBoxPrice: product.boxPrice?.toString() || '',
        isNew: product.isNew || false,
        isBestseller: product.isBestseller || false,
        isFeatured: product.isFeatured || false,
        isOnSale: product.isOnSale || false,
      });

      setImages(product.images || []);
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      alert('製品の読み込みに失敗しました / Erro ao carregar produto');
      router.back();
    } finally {
      setLoadingProduct(false);
    }
  };

  const calculatePricePreview = useCallback(async () => {
    const basePrice = formData.originalPrice ? Math.round(parseFloat(formData.originalPrice)) : 0;
    if (!basePrice) return;

    try {
      const markup = parseFloat(formData.retailMarkup);
      const pfPrice = formData.customRetailPrice 
        ? Math.round(parseFloat(formData.customRetailPrice))
        : Math.round(basePrice / markup);

      const pfResponse = await api.post('/api/pricing/calculate', {
        basePrice: pfPrice,
        customerType: 'INDIVIDUAL',
        retailMarkup: 1,
        taxRate: 0.08,
      });

      const pjResponse = await api.post('/api/pricing/calculate', {
        basePrice,
        customerType: 'BUSINESS',
        customerDiscount: 0.15,
        taxRate: 0.08,
      });

      setPricePreview({
        pf: pfResponse.data.data.formatted,
        pj: pjResponse.data.data.formatted,
      });
    } catch (error) {
      console.error('Erro ao calcular preview:', error);
    }
  }, [formData.originalPrice, formData.retailMarkup, formData.customRetailPrice]);

  useEffect(() => {
    if (!loadingProduct) {
      calculatePricePreview();
    }
  }, [calculatePricePreview, loadingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        namePt: formData.namePt,
        nameJa: formData.nameJa,
        descriptionPt: formData.descriptionPt || null,
        descriptionJa: formData.descriptionJa || null,
        hinban: formData.hinban,
        janCode: formData.janCode || null,
        images: images,
        primaryImage: images[0] || null,
        originalPrice: Math.round(parseFloat(formData.originalPrice)),
        promoPrice: formData.promoPrice ? Math.round(parseFloat(formData.promoPrice)) : null,
        promoStartDate: formData.promoStartDate || null,
        promoEndDate: formData.promoEndDate || null,
        stock: parseInt(formData.stock),
        categoryId: formData.categoryId,
        weightGrams: formData.weightGrams ? parseInt(formData.weightGrams) : null,
        quantityInfo: formData.quantityInfo || null,
        shelfLifeDays: formData.shelfLifeDays ? parseInt(formData.shelfLifeDays) : null,
        storageType: formData.storageType,
        retailMarkup: parseFloat(formData.retailMarkup),
        wholesaleUnit: formData.wholesaleUnit,
        unitsPerBox: formData.wholesaleUnit === 'BOX' && formData.unitsPerBox ? parseInt(formData.unitsPerBox) : null,
        boxPrice: calculatedBoxPrice,
        isNew: formData.isNew,
        isBestseller: formData.isBestseller,
        isFeatured: formData.isFeatured,
        isOnSale: formData.isOnSale,
      };

      await api.put(`/api/products/${productId}`, payload);
      alert('製品が更新されました / Produto atualizado com sucesso!');
      router.push('/dashboard/products');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      alert('製品の更新に失敗しました / Erro ao atualizar produto');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
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
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">製品編集 / Editar Produto</h1>
            <p className="text-gray-500 mt-1">{formData.namePt}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Informações Básicas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">基本情報 / Informações Básicas</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Produto (PT) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namePt}
                    onChange={(e) => setFormData({ ...formData, namePt: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ex: Pão de Queijo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    製品名 (JA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameJa}
                    onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="例: ポン・デ・ケージョ"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição (PT)
                </label>
                <textarea
                  rows={3}
                  value={formData.descriptionPt}
                  onChange={(e) => setFormData({ ...formData, descriptionPt: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Descreva o produto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明 (JA)
                </label>
                <textarea
                  rows={3}
                  value={formData.descriptionJa}
                  onChange={(e) => setFormData({ ...formData, descriptionJa: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="製品を説明してください..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリー / Categoria *
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">選択してください / Selecione...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.namePt} / {cat.nameJa}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Códigos */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-6 space-y-4">
              <div className="flex items-center gap-2 text-purple-900 mb-2">
                <Barcode className="h-5 w-5" />
                <h2 className="text-lg font-semibold">コードと識別 / Códigos e Identificação</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hinban (品番) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hinban}
                    onChange={(e) => setFormData({ ...formData, hinban: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="Ex: PDQ-001"
                  />
                  <p className="text-xs text-gray-600 mt-1">社内製品コード</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JAN Code
                  </label>
                  <input
                    type="text"
                    value={formData.janCode}
                    onChange={(e) => setFormData({ ...formData, janCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="Ex: 4901234567890"
                  />
                  <p className="text-xs text-gray-600 mt-1">13桁（任意）</p>
                </div>
              </div>
            </div>

            {/* Unidade de Venda Atacado */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 p-6 space-y-4">
              <div className="flex items-center gap-2 text-orange-900 mb-2">
                <Package className="h-5 w-5" />
                <h2 className="text-lg font-semibold">卸売単位 / Unidade de Venda Atacado</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    販売単位 / Unidade de Venda *
                  </label>
                  <select
                    required
                    value={formData.wholesaleUnit}
                    onChange={(e) => setFormData({ ...formData, wholesaleUnit: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="UNIT">個 / Unidade</option>
                    <option value="BOX">箱 / Caixa</option>
                  </select>
                </div>

                {formData.wholesaleUnit === 'BOX' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      箱あたりの個数 / Unidades por Caixa *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.unitsPerBox}
                      onChange={(e) => setFormData({ ...formData, unitsPerBox: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      placeholder="例: 10"
                    />
                    <p className="text-xs text-gray-600 mt-1">1箱に何個入っているか</p>
                  </div>
                )}
              </div>

              {formData.wholesaleUnit === 'BOX' && formData.unitsPerBox && formData.originalPrice && (
                <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      📦 この製品は<strong>箱単位</strong>で販売されます
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">個単価</p>
                      <p className="text-lg font-bold text-blue-900">
                        ¥{parseFloat(formData.originalPrice).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">箱価格 ({formData.unitsPerBox}個入り)</p>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.customBoxPrice || (autoBoxPrice?.toString() || '')}
                        onChange={(e) => setFormData({ ...formData, customBoxPrice: e.target.value })}
                        className="w-full text-2xl font-bold text-orange-900 bg-transparent border-b-2 border-orange-300 focus:border-orange-500 focus:outline-none py-1"
                      />
                      {formData.customBoxPrice && parseInt(formData.customBoxPrice) !== autoBoxPrice && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ 自動計算: ¥{autoBoxPrice?.toLocaleString('ja-JP')} → カスタム: ¥{parseInt(formData.customBoxPrice).toLocaleString('ja-JP')}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 箱価格は自動計算されます（切り上げ）
                  </p>
                </div>
              )}
            </div>

            {/* Especificações */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">仕様 / Especificações</h2>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重量 (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.weightGrams}
                    onChange={(e) => setFormData({ ...formData, weightGrams: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    賞味期限 (日)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.shelfLifeDays}
                    onChange={(e) => setFormData({ ...formData, shelfLifeDays: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="90"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    保管方法 *
                  </label>
                  <select
                    required
                    value={formData.storageType}
                    onChange={(e) => setFormData({ ...formData, storageType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="AMBIENT">常温</option>
                    <option value="REFRIGERATED">冷蔵</option>
                    <option value="FROZEN_READY">冷凍済</option>
                    <option value="FROZEN_RAW">冷凍生</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数量情報
                </label>
                <input
                  type="text"
                  value={formData.quantityInfo}
                  onChange={(e) => setFormData({ ...formData, quantityInfo: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder='例: "10個入り", "500g"'
                />
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">タグ / Tags & Destaques</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNew}
                    onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium">🆕 新商品</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBestseller}
                    onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium">⭐ 人気商品</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium">💎 おすすめ</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isOnSale}
                    onChange={(e) => setFormData({ ...formData, isOnSale: e.target.checked })}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium">🔥 セール中</span>
                </label>
              </div>
            </div>

            {/* Upload de Imagens */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">製品画像 / Imagens</h2>
              <ImageUpload images={images} onChange={setImages} maxImages={10} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preços */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">価格 / Preços</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  基準価格 (¥) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="298"
                />
                <p className="text-xs text-gray-500 mt-1">卸売価格（法人向け）• 小数なし</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  小売マークアップ
                </label>
                <input
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={formData.retailMarkup}
                  onChange={(e) => setFormData({ ...formData, retailMarkup: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0.6"
                />
                <p className="text-xs text-gray-500 mt-1">標準: 0.6 (60%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  個人向け価格 (¥)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.customRetailPrice}
                  onChange={(e) => setFormData({ ...formData, customRetailPrice: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={suggestedRetailPrice}
                />
                <p className="text-xs text-gray-500 mt-1">
                  推奨: ¥{Math.ceil(parseFloat(suggestedRetailPrice) || 0)}
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-green-700 mb-3">
                  <Percent className="h-4 w-4" />
                  <span className="text-sm font-medium">特売価格</span>
                </div>

                <div className="space-y-3">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.promoPrice}
                    onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    placeholder="250"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={formData.promoStartDate}
                      onChange={(e) => setFormData({ ...formData, promoStartDate: e.target.value })}
                      className="px-3 py-2 text-sm border rounded-lg"
                    />
                    <input
                      type="date"
                      value={formData.promoEndDate}
                      onChange={(e) => setFormData({ ...formData, promoEndDate: e.target.value })}
                      className="px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {pricePreview && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 space-y-4">
                <div className="flex items-center gap-2 text-blue-900">
                  <Calculator className="h-5 w-5" />
                  <h3 className="font-semibold">価格プレビュー</h3>
                </div>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-xs text-gray-500">個人 + 消費税8%</div>
                    <div className="text-2xl font-bold">{pricePreview.pf.total}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <div className="text-xs text-gray-500">法人 (15%割引) + 消費税8%</div>
                    <div className="text-2xl font-bold">{pricePreview.pj.total}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Estoque */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">在庫 / Estoque</h2>
              <input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="0"
              />
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    変更を保存
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full px-6 py-3 border text-gray-700 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}