'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Calendar, Clock, Truck, Plus, Search, X, Building2, Users } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import type { Product, ApiResponse } from '@/types';

interface PJCustomer {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyNameKana?: string;
  email?: string;
  phone?: string;
  type: string;
  businessStatus?: string;
  discountRate?: number;
  billingClosingDay?: number;
  billingDueDay?: number;
  paymentTerms?: number;
  creditLimit?: number;
  addresses?: Array<{
    id: string;
    name?: string;
    phone?: string;
    postalCode?: string;
    prefecture?: string;
    city?: string;
    ward?: string;
    streetAddress?: string;
    building?: string;
    isDefault?: boolean;
  }>;
}

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

export default function NewOrderPJPage() {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<PJCustomer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  // Selected customer
  const [selectedCustomer, setSelectedCustomer] = useState<PJCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);

  // Selected address
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  // Items
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    unit: 'UNIT' | 'BOX';
  }>>([]);

  // Product search modal
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Shipping
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [shippingCost, setShippingCost] = useState('0');
  const [autoCalculateShipping, setAutoCalculateShipping] = useState(false);

  // Notes & Payment
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'INVOICE' | 'BANK_TRANSFER'>('INVOICE');

  // Fetch data
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchCarriers();
  }, []);

  // Auto calculate shipping
  useEffect(() => {
    if (autoCalculateShipping && selectedCarrier) {
      const totals = calculateTotals();
      const carrier = carriers.find(c => c.id === selectedCarrier);
      if (!carrier) return;
      const applicableRate = carrier.rates.find(rate =>
        totals.totalWeight >= rate.minWeight && totals.totalWeight <= rate.maxWeight
      );
      if (applicableRate) setShippingCost(applicableRate.price.toString());
    }
  }, [items, selectedCarrier, autoCalculateShipping, carriers]);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get<ApiResponse<PJCustomer[]>>('/api/customers?type=BUSINESS&status=APPROVED');
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error loading PJ customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get<ApiResponse<Product[]>>('/api/products');
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const fetchCarriers = async () => {
    try {
      const { data } = await api.get<ApiResponse<Carrier[]>>('/api/carriers');
      setCarriers(data.data || []);
    } catch (error) {
      console.error('Error loading carriers:', error);
    }
  };

  // Customer selection
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const s = customerSearch.toLowerCase();
    return (c.companyName || '').toLowerCase().includes(s) ||
           (c.email || '').toLowerCase().includes(s) ||
           (c.companyNameKana || '').toLowerCase().includes(s);
  });

  const selectCustomer = async (customer: PJCustomer) => {
    // Fetch full customer with addresses
    try {
      const { data } = await api.get<ApiResponse<PJCustomer>>(`/api/customers/${customer.id}`);
      const full = data.data;
      setSelectedCustomer(full);
      setShowCustomerSearch(false);
      setCustomerSearch('');
      // Auto-select default address
      const defaultAddr = full.addresses?.find(a => a.isDefault) || full.addresses?.[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      // Reset items when customer changes
      setItems([]);
    } catch {
      setSelectedCustomer(customer);
      setShowCustomerSearch(false);
    }
  };

  // Product handling
  const filteredProducts = products.filter(p => {
    if (!productSearch) return true;
    const s = productSearch.toLowerCase();
    return (p.hinban?.toLowerCase().includes(s)) ||
           (p.namePt?.toLowerCase().includes(s)) ||
           (p.nameJa?.toLowerCase().includes(s));
  });

  const addProduct = (product: Product) => {
    if (items.find(i => i.productId === product.id)) {
      alert('この製品は既に注文に含まれています');
      return;
    }
    const basePrice = product.originalPrice || 0;
    const discountRate = selectedCustomer?.discountRate || 0;
    const discountedPrice = discountRate > 0
      ? basePrice - Math.round(basePrice * discountRate)
      : basePrice;

    setItems([...items, {
      productId: product.id,
      quantity: 1,
      unitPrice: discountedPrice,
      unit: (product.wholesaleUnit === 'BOX' ? 'BOX' : 'UNIT') as 'UNIT' | 'BOX',
    }]);
    setShowAddProducts(false);
    setProductSearch('');
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) { removeItem(index); return; }
    const n = [...items]; n[index].quantity = qty; setItems(n);
  };

  const updatePrice = (index: number, price: number) => {
    const n = [...items]; n[index].unitPrice = price; setItems(n);
  };

  const updateUnit = (index: number, unit: 'UNIT' | 'BOX') => {
    const n = [...items];
    const product = products.find(p => p.id === n[index].productId);
    if (product) {
      const baseUnit = product.originalPrice || 0;
      const baseBox = product.boxPrice || (product.unitsPerBox ? baseUnit * product.unitsPerBox : baseUnit);
      const dr = selectedCustomer?.discountRate || 0;
      n[index].unit = unit;
      n[index].unitPrice = unit === 'BOX'
        ? (dr > 0 ? baseBox - Math.round(baseBox * dr) : baseBox)
        : (dr > 0 ? baseUnit - Math.round(baseUnit * dr) : baseUnit);
    } else {
      n[index].unit = unit;
    }
    setItems(n);
  };

  const removeItem = (index: number) => {
    const n = [...items]; n.splice(index, 1); setItems(n);
  };

  // Totals
  const calculateTotals = () => {
    let subtotal = 0, totalWeight = 0;
    items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      subtotal += item.unitPrice * item.quantity;
      if (product.weightGrams) {
        const mult = item.unit === 'BOX' ? (product.unitsPerBox || 1) : 1;
        totalWeight += product.weightGrams * item.quantity * mult;
      }
    });
    const tax = Math.ceil(subtotal * 0.08);
    const shipping = parseInt(shippingCost) || 0;
    return { subtotal, tax, shipping, total: subtotal + tax + shipping, totalWeight };
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) { alert('顧客を選択してください'); return; }
    if (items.length === 0) { alert('商品を追加してください'); return; }

    setLoading(true);
    try {
      const totals = calculateTotals();
      const selectedAddr = selectedCustomer.addresses?.find(a => a.id === selectedAddressId);

      const payload = {
        customerId: selectedCustomer.id,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod,
        carrierId: selectedCarrier || undefined,
        shippingCost: totals.shipping,
        deliveryDate: deliveryDate || undefined,
        deliveryTimeSlot: deliveryTime || undefined,
        notes: notes || undefined,
        subtotal: totals.subtotal,
        taxAmount: totals.tax,
        total: totals.total,
        shippingAddress: selectedAddr ? {
          name: selectedAddr.name || `${selectedCustomer.lastName || ''} ${selectedCustomer.firstName || ''}`.trim(),
          phone: selectedAddr.phone || selectedCustomer.phone || '',
          postalCode: selectedAddr.postalCode || '',
          prefecture: selectedAddr.prefecture || '',
          city: selectedAddr.city || '',
          ward: selectedAddr.ward || '',
          streetAddress: selectedAddr.streetAddress || '',
          building: selectedAddr.building || '',
        } : undefined,
      };

      await api.post('/api/payments/create-intent', payload);
      alert('注文が作成されました！/ Pedido criado com sucesso!');
      router.push('/dashboard/orders-pj');
    } catch (error: unknown) {
      console.error('Error creating order:', error);
      const msg = (error as { response?: { data?: { message?: { pt?: string } } } })?.response?.data?.message?.pt || 'Erro ao criar pedido';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const discountRate = selectedCustomer?.discountRate || 0;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">新規法人注文</h1>
            <p className="text-gray-500 mt-1">Novo Pedido PJ / 法人注文を作成</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ═══ Customer Selection ═══ */}
        {showCustomerSearch ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              顧客を選択 / Selecionar Cliente PJ
            </h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="会社名、メールで検索... / Buscar por empresa, email..."
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredCustomers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">承認済みの法人顧客が見つかりません</p>
              ) : (
                filteredCustomers.map(c => (
                  <button key={c.id} type="button" onClick={() => selectCustomer(c)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all text-left">
                    <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="h-5 w-5 text-blue-600" /></div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{c.companyName || `${c.lastName || ''} ${c.firstName || ''}`}</p>
                      <p className="text-sm text-gray-500">{c.email}</p>
                      {c.companyNameKana && <p className="text-xs text-gray-400">{c.companyNameKana}</p>}
                    </div>
                    <div className="text-right">
                      {(c.discountRate || 0) > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          割引 {((c.discountRate || 0) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : selectedCustomer && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {selectedCustomer.companyName || `${selectedCustomer.lastName || ''} ${selectedCustomer.firstName || ''}`}
                </h3>
                <p className="text-sm text-blue-700">{selectedCustomer.email} • {selectedCustomer.phone || ''}</p>
                {discountRate > 0 && (
                  <p className="text-sm text-green-700 font-medium mt-1">✓ 法人割引適用: {(discountRate * 100).toFixed(0)}%</p>
                )}
              </div>
              <button type="button" onClick={() => { setShowCustomerSearch(true); setSelectedCustomer(null); setItems([]); }}
                className="px-3 py-1.5 text-sm text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50">
                変更
              </button>
            </div>

            {/* Address selection */}
            {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <label className="block text-sm font-medium text-blue-800 mb-2">配送先 / Endereço de Entrega</label>
                <select value={selectedAddressId} onChange={e => setSelectedAddressId(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  {selectedCustomer.addresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.isDefault ? '★ ' : ''}〒{addr.postalCode} {addr.prefecture} {addr.city} {addr.ward} {addr.streetAddress} {addr.building || ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ═══ Payment Method ═══ */}
        {selectedCustomer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">支払方法 / Método de Pagamento</h3>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPaymentMethod('INVOICE')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'INVOICE' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="font-semibold text-gray-900">請求書払い / Faturamento</p>
                <p className="text-xs text-gray-500 mt-1">
                  締め日: {selectedCustomer.billingClosingDay || 31}日 / 支払: 翌月{selectedCustomer.billingDueDay || 10}日
                </p>
              </button>
              <button type="button" onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="font-semibold text-gray-900">銀行振込 / Transferência</p>
                <p className="text-xs text-gray-500 mt-1">浜松いわた信用金庫</p>
              </button>
            </div>
          </div>
        )}

        {/* ═══ Shipping ═══ */}
        {selectedCustomer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" /> 配送情報 / Informações de Entrega
            </h3>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> 配達日 / Data de Entrega
                </label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> 配達時間帯 / Horário
                </label>
                <select value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">指定なし</option>
                  {DELIVERY_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">運送会社 / Transportadora</label>
                <select value={selectedCarrier} onChange={e => setSelectedCarrier(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">選択...</option>
                  {carriers.map(c => <option key={c.id} value={c.id}>{c.namePt} / {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">追跡番号 / Rastreio</label>
                <input type="text" value={trackingCode} onChange={e => setTrackingCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="例: 1234-5678-9012" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">送料 / Frete (¥)</label>
                <div className="flex gap-2">
                  <input type="number" min="0" value={shippingCost}
                    onChange={e => { setShippingCost(e.target.value); setAutoCalculateShipping(false); }}
                    disabled={autoCalculateShipping}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100" />
                  <button type="button" onClick={() => setAutoCalculateShipping(!autoCalculateShipping)}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${autoCalculateShipping ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                    自動
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">重量: {(totals.totalWeight / 1000).toFixed(2)} kg</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Items ═══ */}
        {selectedCustomer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">注文商品 / Itens do Pedido</h3>
              <button type="button" onClick={() => setShowAddProducts(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                <Plus className="h-4 w-4" /> 製品を追加
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">製品を追加してください</p>
                <button type="button" onClick={() => setShowAddProducts(true)}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  + 製品を追加
                </button>
              </div>
            ) : (
              <>
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
                                <select value={item.unit} onChange={e => updateUnit(index, e.target.value as 'UNIT' | 'BOX')}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs">
                                  <option value="UNIT">個</option>
                                  <option value="BOX">箱/{product.unitsPerBox}</option>
                                </select>
                              ) : (
                                <span className="text-gray-500 text-xs">個</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="number" min="1" value={item.quantity}
                                onChange={e => updateQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-red-500" />
                            </td>
                            <td className="px-4 py-3 text-right bg-blue-50">
                              <input type="number" min="0" step="1" value={item.unitPrice}
                                onChange={e => updatePrice(index, parseInt(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-right border border-blue-300 rounded focus:ring-2 focus:ring-red-500 font-mono" />
                            </td>
                            <td className="px-4 py-3 text-right font-medium font-mono bg-green-50">
                              ¥{(item.unitPrice * item.quantity).toLocaleString('ja-JP')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => removeItem(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 border-t-2 border-gray-300 p-6">
                  <div className="max-w-md ml-auto space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">小計:</span><span className="font-medium font-mono">¥{totals.subtotal.toLocaleString('ja-JP')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">消費税 (8%):</span><span className="font-medium font-mono">¥{totals.tax.toLocaleString('ja-JP')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">送料:</span><span className="font-medium font-mono">¥{totals.shipping.toLocaleString('ja-JP')}</span></div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>合計:</span>
                      <span className="text-red-600 font-mono">¥{totals.total.toLocaleString('ja-JP')}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ Notes ═══ */}
        {selectedCustomer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">備考 / Observações</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="注文に関する内部メモ..." />
          </div>
        )}

        {/* ═══ Submit ═══ */}
        {selectedCustomer && (
          <div className="flex gap-4">
            <button type="submit" disabled={loading || items.length === 0}
              className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
              {loading ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> 作成中...</>
              ) : (
                <><Save className="h-5 w-5" /> 注文を作成 / Criar Pedido</>
              )}
            </button>
            <button type="button" onClick={() => router.back()}
              className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              キャンセル
            </button>
          </div>
        )}
      </form>

      {/* ═══ Add Products Modal ═══ */}
      {showAddProducts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">製品を追加 / Adicionar Produtos</h2>
              <button type="button" onClick={() => { setShowAddProducts(false); setProductSearch(''); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="品番または製品名で検索..." autoFocus />
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
                    {filteredProducts.map(product => {
                      const added = items.some(i => i.productId === product.id);
                      const base = product.originalPrice || 0;
                      const price = discountRate > 0 ? base - Math.round(base * discountRate) : base;
                      return (
                        <tr key={product.id} className={`hover:bg-gray-50 ${added ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-2 font-mono text-xs">{product.hinban}</td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{product.namePt}</div>
                            <div className="text-xs text-gray-500">{product.nameJa}</div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-medium ${(product.stock || 0) > 10 ? 'text-green-600' : 'text-red-600'}`}>{product.stock || 0}</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">¥{price.toLocaleString('ja-JP')}</td>
                          <td className="px-4 py-2 text-center">
                            <button type="button" onClick={() => addProduct(product)} disabled={added}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 text-xs">
                              {added ? '追加済' : '追加'}
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