'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Calendar, Clock, Truck, Plus, Search, X } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import type { Order, Product, ApiResponse } from '@/types';

interface Carrier {
  id: string;
  name: string;
  namePt: string;
  rates: Array<{
    id: string;
    minWeight: number;
    maxWeight: number;
    price: number;
  }>;
}

const DELIVERY_TIMES = [
  { value: '午前中', label: '午前中 (8:00-12:00)' },
  { value: '14:00〜16:00', label: '14:00〜16:00' },
  { value: '16:00〜18:00', label: '16:00〜18:00' },
  { value: '18:00〜20:00', label: '18:00〜20:00' },
  { value: '19:00〜21:00', label: '19:00〜21:00' },
];

export default function EditOrderPFPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    unit: 'UNIT' | 'BOX';
  }>>([]);
  
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [shippingCost, setShippingCost] = useState('0');
  const [autoCalculateShipping, setAutoCalculateShipping] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchOrder();
    fetchProducts();
    fetchCarriers();
  }, []);

  useEffect(() => {
    if (autoCalculateShipping && selectedCarrier) {
      const totals = calculateTotals();
      const weightInGrams = totals.totalWeight;
      
      const carrier = carriers.find(c => c.id === selectedCarrier);
      if (!carrier) return;
      
      const applicableRate = carrier.rates.find(rate => 
        weightInGrams >= rate.minWeight && weightInGrams <= rate.maxWeight
      );
      
      if (applicableRate) {
        setShippingCost(applicableRate.price.toString());
      }
    }
  }, [items, selectedCarrier, autoCalculateShipping, carriers]);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get<ApiResponse<Order>>(`/api/orders/${orderId}`);
      const orderData = data.data;
      
      console.log('📦 Order data:', orderData);
      console.log('📦 Order items:', orderData.items);
      
      setOrder(orderData);
      
      // Mapear items corretamente com product info
      const mappedItems = orderData.items?.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: (item.product?.wholesaleUnit === 'BOX' ? 'BOX' : 'UNIT') as 'UNIT' | 'BOX'
      })) || [];
      
      console.log('✅ Mapped items:', mappedItems);
      setItems(mappedItems);
      setShippingCost(orderData.shippingCost.toString());
      setSelectedCarrier(orderData.carrierId || '');
      setTrackingCode(orderData.trackingCode || '');
      setDeliveryDate(orderData.deliveryDate?.split('T')[0] || '');
      setDeliveryTime(orderData.deliveryTime || '');
      setNotes(orderData.notes || '');
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      alert('注文の読み込みに失敗しました / Erro ao carregar pedido');
      router.back();
    } finally {
      setLoadingOrder(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get<ApiResponse<Product[]>>('/api/products');
      setProducts(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const fetchCarriers = async () => {
    try {
      const { data } = await api.get<ApiResponse<Carrier[]>>('/api/carriers');
      setCarriers(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true;
    const search = productSearch.toLowerCase();
    return (
      (p.hinban?.toLowerCase().includes(search)) ||
      (p.namePt?.toLowerCase().includes(search)) ||
      (p.nameJa?.toLowerCase().includes(search))
    );
  });

  const addProduct = (product: Product) => {
    const exists = items.find(i => i.productId === product.id);
    if (exists) {
      alert('Este produto já está no pedido / この製品は既に注文に含まれています');
      return;
    }

    const basePrice = product.originalPrice;
    const discountedPrice = order?.customer?.discountRate 
      ? basePrice - Math.round(basePrice * order.customer.discountRate)
      : basePrice;
    
    const newItem = {
      productId: product.id,
      quantity: 1,
      unitPrice: discountedPrice,
      unit: (product.wholesaleUnit || 'UNIT') as 'UNIT' | 'BOX'
    };

    setItems([...items, newItem]);
    setShowAddProducts(false);
    setProductSearch('');
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const updatePrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].unitPrice = price;
    setItems(newItems);
  };

  const updateUnit = (index: number, unit: 'UNIT' | 'BOX') => {
    const newItems = [...items];
    const item = newItems[index];
    const product = products.find(p => p.id === item.productId);
    
    if (product) {
      const baseUnitPrice = product.originalPrice;
      const baseBoxPrice = product.boxPrice || (product.unitsPerBox ? baseUnitPrice * product.unitsPerBox : baseUnitPrice);
      
      const discountedUnitPrice = order?.customer?.discountRate 
        ? baseUnitPrice - Math.round(baseUnitPrice * order.customer.discountRate)
        : baseUnitPrice;
      
      const discountedBoxPrice = order?.customer?.discountRate 
        ? baseBoxPrice - Math.round(baseBoxPrice * order.customer.discountRate)
        : baseBoxPrice;
      
      newItems[index].unit = unit;
      newItems[index].unitPrice = unit === 'BOX' ? discountedBoxPrice : discountedUnitPrice;
    } else {
      newItems[index].unit = unit;
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalWeight = 0;

    items.forEach((item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;

      subtotal += item.unitPrice * item.quantity;
      
      if (product.weightGrams) {
        const multiplier = item.unit === 'BOX' ? (product.unitsPerBox || 1) : 1;
        totalWeight += product.weightGrams * item.quantity * multiplier;
      }
    });

    const tax = Math.round(subtotal * 0.08);
    const shipping = parseInt(shippingCost) || 0;
    const total = subtotal + tax + shipping;

    return { subtotal, tax, shipping, total, totalWeight };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('商品を追加してください / Adicione pelo menos um produto');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        carrierId: selectedCarrier || undefined,
        trackingCode: trackingCode || undefined,
        deliveryDate: deliveryDate || undefined,
        deliveryTime: deliveryTime || undefined,
        shippingCost: parseInt(shippingCost) || 0,
        notes: notes || undefined,
      };

      console.log('Enviando payload:', payload);

      await api.put(`/api/orders/${orderId}`, payload);
      alert('注文が更新されました / Pedido atualizado com sucesso!');
      router.push('/dashboard/orders-pf');
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      alert('注文の更新に失敗しました / Erro ao atualizar pedido');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  if (loadingOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!order) {
    return <div>注文が見つかりません / Pedido não encontrado</div>;
  }

  const discountRate = order.customer?.discountRate || 0;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">注文編集 {order.orderNumber}</h1>
            <p className="text-gray-500 mt-1">Edit Order / 注文を編集</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Info do Cliente */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">顧客情報 / Cliente</h3>
          <div className="text-sm text-blue-800">
            <div className="font-medium">
              {order.customer?.companyName || [order.customer?.lastName, order.customer?.firstName].filter(Boolean).join(' ') || 'N/A'}
            </div>
            <div>{order.customer?.email} • {order.customer?.phone}</div>
            {/* Endereço de entrega */}
            {order.shippingName && (
              <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-700">
                <div className="font-medium mb-1">📦 配送先 / Endereço de Entrega:</div>
                <div>{order.shippingName}</div>
                <div>〒{order.shippingPostalCode} {order.shippingPrefecture} {order.shippingCity} {order.shippingWard}</div>
                <div>{order.shippingStreet} {order.shippingBuilding}</div>
                <div>TEL: {order.shippingPhone}</div>
              </div>
            )}
            {discountRate > 0 && (
              <div className="text-green-700 font-medium mt-1">
                ✓ 法人割引適用済: {(discountRate * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* Transportadora e Dados de Entrega */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5" />
            配送情報 / Informações de Entrega
          </h3>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                配達日 / Data de Entrega
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                配達時間帯 / Horário
              </label>
              <select
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">指定なし / Sem preferência</option>
                {DELIVERY_TIMES.map(time => (
                  <option key={time.value} value={time.value}>{time.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                運送会社 / Transportadora
              </label>
              <select
                value={selectedCarrier}
                onChange={(e) => setSelectedCarrier(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">選択してください / Selecionar...</option>
                {carriers.map(carrier => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.namePt} / {carrier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                追跡番号 / Código de Rastreio
              </label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="例: 1234-5678-9012"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                送料 / Frete (¥)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => {
                    setShippingCost(e.target.value);
                    setAutoCalculateShipping(false);
                  }}
                  disabled={autoCalculateShipping}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => setAutoCalculateShipping(!autoCalculateShipping)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    autoCalculateShipping
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  自動
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                重量: {(totals.totalWeight / 1000).toFixed(2)} kg
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">注文商品 / Itens do Pedido</h3>
            <button
              type="button"
              onClick={() => setShowAddProducts(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              製品を追加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品名</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">単位</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">数量</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 bg-blue-50">卸値</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 bg-green-50">小計</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{product.namePt}</div>
                        <div className="text-sm text-gray-500">{product.nameJa}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.wholesaleUnit === 'BOX' ? (
                          <select
                            value={item.unit}
                            onChange={(e) => updateUnit(index, e.target.value as 'UNIT' | 'BOX')}
                            className="px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="UNIT">個</option>
                            <option value="BOX">箱/{product.unitsPerBox}</option>
                          </select>
                        ) : (
                          <span className="text-gray-500 text-xs">個</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right bg-blue-50">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice.toLocaleString('ja-JP')}
                          onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 text-right border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium font-mono bg-green-50">
                        ¥{((item.unitPrice * item.quantity)).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className="bg-gray-50 border-t-2 border-gray-300 p-6">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">小計:</span>
                <span className="font-medium font-mono">¥{totals.subtotal.toLocaleString('ja-JP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">消費税 (8%):</span>
                <span className="font-medium font-mono">¥{totals.tax.toLocaleString('ja-JP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">送料:</span>
                <span className="font-medium font-mono">¥{totals.shipping.toLocaleString('ja-JP')}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>合計:</span>
                <span className="text-red-600 font-mono">¥{totals.total.toLocaleString('ja-JP')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            備考 / Observações
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="注文に関する内部メモ..."
          />
        </div>

        {/* Botões */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
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
            className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            キャンセル
          </button>
        </div>
      </form>

      {/* Modal Adicionar Produtos */}
      {showAddProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">製品を追加 / Adicionar Produtos</h2>
              <button
                onClick={() => {
                  setShowAddProducts(false);
                  setProductSearch('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="品番または製品名で検索..."
                  autoFocus
                />
              </div>

              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">品番</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">製品名</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-700">在庫</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">卸値</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((product) => {
                      const alreadyAdded = items.some(i => i.productId === product.id);
                      const basePrice = product.originalPrice;
                      const discountedPrice = discountRate 
                        ? basePrice - Math.round(basePrice * discountRate)
                        : basePrice;

                      return (
                        <tr key={product.id} className={`hover:bg-gray-50 ${alreadyAdded ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-2 font-mono text-xs">{product.hinban}</td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{product.namePt}</div>
                            <div className="text-xs text-gray-500">{product.nameJa}</div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-medium ${product.stock > 10 ? 'text-green-600' : 'text-red-600'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            ¥{discountedPrice.toLocaleString('ja-JP')}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => addProduct(product)}
                              disabled={alreadyAdded}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs"
                            >
                              {alreadyAdded ? '追加済' : '追加'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
