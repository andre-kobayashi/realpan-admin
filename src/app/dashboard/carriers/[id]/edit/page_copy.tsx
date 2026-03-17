'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, Clock, Users, Truck, Settings, ChevronDown, ChevronRight, MapPin, Package } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

interface Rate {
  id?: string;
  minWeight: number;
  maxWeight: number;
  price: number;
  regionId?: string | null;
  isActive?: boolean;
}

interface Region {
  id: string;
  name: string;
  prefectures: string[];
  extraDays: number;
  rates: Rate[];
}

interface TimeSlot {
  label: string;
  start: string;
  end: string;
}

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { label: '午前中', start: '08:00', end: '12:00' },
  { label: '14:00〜16:00', start: '14:00', end: '16:00' },
  { label: '16:00〜18:00', start: '16:00', end: '18:00' },
  { label: '18:00〜20:00', start: '18:00', end: '20:00' },
  { label: '19:00〜21:00', start: '19:00', end: '21:00' },
];

const ALL_PREFECTURES = [
  '北海道',
  '青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県',
  '三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県',
  '沖縄県',
];

export default function EditCarrierPage() {
  const router = useRouter();
  const params = useParams();
  const carrierId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingCarrier, setLoadingCarrier] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    namePt: '',
    trackingUrlTemplate: '',
    isActive: true,
    allowedCustomerTypes: ['PF', 'PJ'] as string[],
    cutoffTime: '12:00',
    cutoffDayOffset: 1,
    leadTimeDays: 1,
    minOrderAmount: '',
    maxWeightGrams: '',
    sortOrder: '0',
  });
  const [regions, setRegions] = useState<Region[]>([]);
  const [flatRates, setFlatRates] = useState<Rate[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [newRegion, setNewRegion] = useState({ name: '', prefectures: [] as string[], extraDays: 0 });
  const [editingCell, setEditingCell] = useState<string | null>(null);

  useEffect(() => {
    fetchCarrier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCarrier = async () => {
    try {
      // 1. Fetch carrier (includes all rates)
      const { data: carrierData } = await api.get(`/api/carriers/${carrierId}`);
      const c = carrierData.data;

      setFormData({
        name: c.name || '',
        namePt: c.namePt || '',
        trackingUrlTemplate: c.trackingUrlTemplate || '',
        isActive: c.isActive ?? true,
        allowedCustomerTypes: c.allowedCustomerTypes?.length > 0 ? c.allowedCustomerTypes : ['PF', 'PJ'],
        cutoffTime: c.cutoffTime || '12:00',
        cutoffDayOffset: c.cutoffDayOffset ?? 1,
        leadTimeDays: c.leadTimeDays ?? 1,
        minOrderAmount: c.minOrderAmount?.toString() || '',
        maxWeightGrams: c.maxWeightGrams?.toString() || '',
        sortOrder: c.sortOrder?.toString() || '0',
      });
      setTimeSlots(Array.isArray(c.deliveryTimeSlots) ? c.deliveryTimeSlots : []);

      const allRates: Rate[] = c.rates || [];

      // 2. Fetch regions — CORRECT: path param, not query param
      //    GET /api/shipping/regions/:carrierId
      let regionsData: Region[] = [];
      try {
        const regionsRes = await api.get(`/api/shipping/regions/${carrierId}`);
        const rawRegions = regionsRes.data.data || regionsRes.data || [];

        regionsData = rawRegions.map((region: any) => {
          // If API already includes rates in region (include: rates)
          if (region.rates && region.rates.length > 0) {
            return {
              id: region.id,
              name: region.name,
              prefectures: region.prefectures || [],
              extraDays: region.extraDays || 0,
              rates: region.rates.map((r: any) => ({
                id: r.id,
                minWeight: r.minWeight,
                maxWeight: r.maxWeight,
                price: r.price,
                regionId: region.id,
                isActive: r.isActive ?? true,
              })),
            };
          }

          // Fallback: match rates from carrier by regionId
          const regionRates = allRates.filter((r: Rate) => r.regionId === region.id);
          return {
            id: region.id,
            name: region.name,
            prefectures: region.prefectures || [],
            extraDays: region.extraDays || 0,
            rates: regionRates.map((r: Rate) => ({
              id: r.id,
              minWeight: r.minWeight,
              maxWeight: r.maxWeight,
              price: r.price,
              regionId: region.id,
              isActive: r.isActive ?? true,
            })),
          };
        });
      } catch {
        // If regions endpoint fails, try grouping carrier rates by regionId
        console.log('Regions endpoint failed, grouping rates by regionId');
        const regionMap = new Map<string, Rate[]>();
        for (const rate of allRates) {
          if (rate.regionId) {
            if (!regionMap.has(rate.regionId)) regionMap.set(rate.regionId, []);
            regionMap.get(rate.regionId)!.push(rate);
          }
        }
        // Build regions from grouped rates (no name/prefectures info)
        regionMap.forEach((rates, regionId) => {
          regionsData.push({
            id: regionId,
            name: regionId.substring(0, 8) + '...',
            prefectures: [],
            extraDays: 0,
            rates,
          });
        });
      }

      setRegions(regionsData);

      // 3. Flat rates = rates not assigned to any region
      const regionRateIds = new Set(
        regionsData.flatMap((r: Region) => r.rates.map((rate: Rate) => rate.id))
      );
      const flat = allRates.filter((r: Rate) => !r.regionId && !regionRateIds.has(r.id));
      setFlatRates(flat);

    } catch (error) {
      console.error('Erro:', error);
      alert('❌ 読み込みに失敗しました');
      router.back();
    } finally {
      setLoadingCarrier(false);
    }
  };

  // ── Weight brackets from regions ──
  const weightBrackets = useMemo(() => {
    const brackets = new Map<string, { min: number; max: number }>();
    for (const region of regions) {
      for (const rate of region.rates) {
        const key = `${rate.minWeight}-${rate.maxWeight}`;
        if (!brackets.has(key)) brackets.set(key, { min: rate.minWeight, max: rate.maxWeight });
      }
    }
    for (const rate of flatRates) {
      const key = `${rate.minWeight}-${rate.maxWeight}`;
      if (!brackets.has(key)) brackets.set(key, { min: rate.minWeight, max: rate.maxWeight });
    }
    return Array.from(brackets.values()).sort((a, b) => a.min - b.min);
  }, [regions, flatRates]);

  const toggleCustomerType = (type: string) => {
    setFormData(prev => {
      const types = prev.allowedCustomerTypes.includes(type)
        ? prev.allowedCustomerTypes.filter(t => t !== type)
        : [...prev.allowedCustomerTypes, type];
      return { ...prev, allowedCustomerTypes: types.length > 0 ? types : [type] };
    });
  };

  const toggleRegion = (regionId: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) { next.delete(regionId); } else { next.add(regionId); }
      return next;
    });
  };

  const getRateForRegionWeight = (region: Region, minW: number, maxW: number): Rate | undefined => {
    return region.rates.find(r => r.minWeight === minW && r.maxWeight === maxW);
  };

  const updateRegionRatePrice = (regionId: string, minW: number, maxW: number, newPrice: number) => {
    setRegions(prev => prev.map(region => {
      if (region.id !== regionId) return region;
      const exists = region.rates.find(r => r.minWeight === minW && r.maxWeight === maxW);
      if (exists) {
        return { ...region, rates: region.rates.map(r => r.minWeight === minW && r.maxWeight === maxW ? { ...r, price: newPrice } : r) };
      }
      return { ...region, rates: [...region.rates, { minWeight: minW, maxWeight: maxW, price: newPrice, regionId }] };
    }));
  };

  // ── Flat rates ──
  const addFlatRate = () => {
    const last = flatRates[flatRates.length - 1];
    setFlatRates([...flatRates, { minWeight: last ? last.maxWeight + 1 : 0, maxWeight: last ? last.maxWeight + 3000 : 2000, price: last ? last.price + 200 : 800, isActive: true }]);
  };
  const updateFlatRate = (i: number, field: keyof Rate, value: number | boolean) => { const r = [...flatRates]; (r[i] as any)[field] = value; setFlatRates(r); };
  const removeFlatRate = async (i: number) => {
    const rate = flatRates[i];
    if (rate.id) { if (!confirm('この料金帯を削除しますか？')) return; try { await api.delete(`/api/carriers/rates/${rate.id}`); } catch { return; } }
    setFlatRates(flatRates.filter((_, idx) => idx !== i));
  };

  // ── Region management ──
  const assignedPrefectures = useMemo(() => {
    const set = new Set<string>();
    regions.forEach(r => r.prefectures.forEach(p => set.add(p)));
    return set;
  }, [regions]);

  const togglePrefecture = (pref: string) => {
    setNewRegion(prev => ({ ...prev, prefectures: prev.prefectures.includes(pref) ? prev.prefectures.filter(p => p !== pref) : [...prev.prefectures, pref] }));
  };

  const addRegion = async () => {
    if (!newRegion.name || newRegion.prefectures.length === 0) { alert('地域名と都道府県を入力してください'); return; }
    try {
      const { data } = await api.post('/api/shipping/regions', { carrierId, name: newRegion.name, prefectures: newRegion.prefectures, extraDays: newRegion.extraDays });
      const region = data.data || data;
      setRegions(prev => [...prev, { id: region.id, name: region.name, prefectures: region.prefectures || [], extraDays: region.extraDays || 0, rates: [] }]);
      setNewRegion({ name: '', prefectures: [], extraDays: 0 });
      setShowRegionForm(false);
    } catch (error) { console.error(error); alert('❌ エラーが発生しました'); }
  };

  const deleteRegion = async (regionId: string) => {
    if (!confirm('この地域とすべての料金を削除しますか？')) return;
    try { await api.delete(`/api/shipping/regions/${regionId}`); setRegions(prev => prev.filter(r => r.id !== regionId)); }
    catch (error) { console.error(error); alert('❌ エラーが発生しました'); }
  };

  // ── Time Slots ──
  const addTimeSlot = () => setTimeSlots([...timeSlots, { label: '', start: '', end: '' }]);
  const loadDefaultSlots = () => setTimeSlots([...DEFAULT_TIME_SLOTS]);
  const updateTimeSlot = (i: number, field: keyof TimeSlot, value: string) => {
    const s = [...timeSlots]; s[i][field] = value;
    if ((field === 'start' || field === 'end') && s[i].start && s[i].end) s[i].label = `${s[i].start}〜${s[i].end}`;
    setTimeSlots(s);
  };
  const removeTimeSlot = (i: number) => setTimeSlots(timeSlots.filter((_, idx) => idx !== i));

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Update carrier
      await api.put(`/api/carriers/${carrierId}`, {
        name: formData.name, namePt: formData.namePt || null, trackingUrlTemplate: formData.trackingUrlTemplate || null,
        isActive: formData.isActive, allowedCustomerTypes: formData.allowedCustomerTypes,
        cutoffTime: formData.cutoffTime, cutoffDayOffset: formData.cutoffDayOffset, leadTimeDays: formData.leadTimeDays,
        deliveryTimeSlots: timeSlots, minOrderAmount: formData.minOrderAmount ? parseInt(formData.minOrderAmount) : null,
        maxWeightGrams: formData.maxWeightGrams ? parseInt(formData.maxWeightGrams) : null, sortOrder: parseInt(formData.sortOrder) || 0,
      });

      // 2. Update flat rates
      for (const rate of flatRates) {
        if (rate.id) { await api.put(`/api/carriers/rates/${rate.id}`, { minWeight: rate.minWeight, maxWeight: rate.maxWeight, price: rate.price }); }
        else { await api.post(`/api/carriers/${carrierId}/rates`, { minWeight: rate.minWeight, maxWeight: rate.maxWeight, price: rate.price }); }
      }

      // 3. Update region rates
      for (const region of regions) {
        try { await api.put(`/api/shipping/regions/${region.id}`, { name: region.name, prefectures: region.prefectures, extraDays: region.extraDays }); } catch {}
        for (const rate of region.rates) {
          if (rate.price <= 0) continue;
          if (rate.id) { await api.put(`/api/carriers/rates/${rate.id}`, { minWeight: rate.minWeight, maxWeight: rate.maxWeight, price: rate.price }); }
          else { await api.post(`/api/carriers/${carrierId}/rates`, { minWeight: rate.minWeight, maxWeight: rate.maxWeight, price: rate.price, regionId: region.id }); }
        }
      }

      alert('✅ 更新しました / Transportadora atualizada!');
      router.push('/dashboard/carriers');
    } catch (error) { console.error(error); alert('❌ 更新に失敗しました'); }
    finally { setLoading(false); }
  };

  if (loadingCarrier) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">運送会社編集 / Editar Transportadora</h1>
            <p className="text-gray-500 mt-1">{formData.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl space-y-6">
        {/* ═══ DADOS BÁSICOS ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">基本情報 / Dados Básicos</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">名前 (JA) *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome (PT) *</label>
              <input type="text" required value={formData.namePt} onChange={e => setFormData({ ...formData, namePt: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">追跡URL</label>
            <input type="text" value={formData.trackingUrlTemplate} onChange={e => setFormData({ ...formData, trackingUrlTemplate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm" />
          </div>
          <div className="mt-4 flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 text-red-600 rounded" />
              <span className="text-sm font-medium text-gray-700">有効 / Ativa</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">表示順:</label>
              <input type="number" min="0" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: e.target.value })}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        {/* ═══ TIPO DE CLIENTE ═══ */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-purple-900">顧客タイプ / Tipo de Cliente</h2>
          </div>
          <div className="flex gap-4">
            {(['PF', 'PJ'] as const).map(type => (
              <label key={type} className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                formData.allowedCustomerTypes.includes(type) ? 'border-purple-500 bg-purple-100/50' : 'border-gray-200 bg-white'}`}>
                <input type="checkbox" checked={formData.allowedCustomerTypes.includes(type)}
                  onChange={() => toggleCustomerType(type)} className="w-5 h-5 text-purple-600 rounded" />
                <div>
                  <p className="font-semibold text-gray-900">{type === 'PF' ? '🧑 個人 (PF)' : '🏢 法人 (PJ)'}</p>
                  <p className="text-xs text-gray-500">{type === 'PF' ? 'Cliente Final' : 'Empresa'}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ═══ HORÁRIO DE CORTE ═══ */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900">締め切り時間 / Horário de Corte</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">締切時間</label>
              <input type="time" value={formData.cutoffTime} onChange={e => setFormData({ ...formData, cutoffTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">遅延日数</label>
              <input type="number" min="0" max="7" value={formData.cutoffDayOffset}
                onChange={e => setFormData({ ...formData, cutoffDayOffset: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最短配送日数</label>
              <input type="number" min="0" max="14" value={formData.leadTimeDays}
                onChange={e => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最低注文金額 (¥)</label>
              <input type="number" min="0" value={formData.minOrderAmount} onChange={e => setFormData({ ...formData, minOrderAmount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" placeholder="任意" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最大重量 (g)</label>
              <input type="number" min="0" value={formData.maxWeightGrams} onChange={e => setFormData({ ...formData, maxWeightGrams: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" placeholder="任意" />
            </div>
          </div>
        </div>

        {/* ═══ FAIXAS DE HORÁRIO ═══ */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-green-900">時間帯指定 / Faixas de Horário</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={loadDefaultSlots} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium">📋 テンプレート</button>
              <button type="button" onClick={addTimeSlot} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"><Plus className="h-3 w-3" /> 追加</button>
            </div>
          </div>
          {timeSlots.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm"><Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />時間帯指定なし</div>
          ) : (
            <div className="space-y-2">
              {timeSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <input type="text" value={slot.label} onChange={e => updateTimeSlot(i, 'label', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="午前中" />
                    <input type="time" value={slot.start} onChange={e => updateTimeSlot(i, 'start', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <input type="time" value={slot.end} onChange={e => updateTimeSlot(i, 'end', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <button type="button" onClick={() => removeTimeSlot(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ TABELA DE FRETE POR REGIÃO ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                地域別料金表 / Tabela de Frete por Região
                {regions.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({regions.length}地域 / {regions.reduce((s, r) => s + r.rates.length, 0)}料金)</span>}
              </h2>
            </div>
            <button type="button" onClick={() => setShowRegionForm(!showRegionForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
              <Plus className="h-3 w-3" /> 地域追加
            </button>
          </div>

          {/* Add region form */}
          {showRegionForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">新しい地域を追加 / Adicionar Região</h3>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">地域名</label>
                  <input type="text" value={newRegion.name} onChange={e => setNewRegion({ ...newRegion, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="例: 関東" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">追加日数</label>
                  <input type="number" min="0" max="10" value={newRegion.extraDays} onChange={e => setNewRegion({ ...newRegion, extraDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex items-end gap-2">
                  <button type="button" onClick={addRegion} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">追加</button>
                  <button type="button" onClick={() => setShowRegionForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">キャンセル</button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2">都道府県を選択</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PREFECTURES.map(pref => {
                    const isAssigned = assignedPrefectures.has(pref);
                    const isSelected = newRegion.prefectures.includes(pref);
                    return (
                      <button key={pref} type="button" disabled={isAssigned} onClick={() => togglePrefecture(pref)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isAssigned ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {regions.length > 0 ? (
            <>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700 border-b border-gray-200 sticky left-0 bg-gray-50 min-w-[160px] z-10">地域</th>
                      {weightBrackets.map((wb, i) => (
                        <th key={i} className="text-center px-1 py-2.5 font-semibold text-gray-700 border-b border-gray-200 min-w-[85px]">
                          <div className="text-[11px] leading-tight">{wb.min === 0 ? '0' : (wb.min / 1000).toFixed(1)}〜{(wb.max / 1000).toFixed(1)}kg</div>
                        </th>
                      ))}
                      <th className="text-center px-2 py-2.5 font-semibold text-gray-700 border-b border-gray-200 w-[60px]">+日数</th>
                      <th className="w-[36px] border-b border-gray-200"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {regions.map((region, rIdx) => (
                      <tr key={region.id} className={`border-b border-gray-100 hover:bg-blue-50/30 ${rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                          <button type="button" onClick={() => toggleRegion(region.id)} className="flex items-center gap-1 text-left w-full">
                            {expandedRegions.has(region.id) ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                            <span className="font-medium text-gray-900 text-xs">{region.name}</span>
                            <span className="text-[10px] text-gray-400 ml-0.5">({region.prefectures.length})</span>
                          </button>
                          {expandedRegions.has(region.id) && (
                            <div className="mt-1 ml-5 flex flex-wrap gap-0.5">
                              {region.prefectures.map(p => <span key={p} className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{p}</span>)}
                            </div>
                          )}
                        </td>
                        {weightBrackets.map((wb, i) => {
                          const rate = getRateForRegionWeight(region, wb.min, wb.max);
                          const cellKey = `${region.id}-${wb.min}-${wb.max}`;
                          return (
                            <td key={i} className="text-center px-0.5 py-1">
                              {editingCell === cellKey ? (
                                <input type="number" autoFocus value={rate?.price ?? 0}
                                  onChange={e => updateRegionRatePrice(region.id, wb.min, wb.max, parseInt(e.target.value) || 0)}
                                  onBlur={() => setEditingCell(null)} onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
                                  className="w-full px-1 py-1 border border-blue-400 rounded text-xs text-center bg-blue-50 focus:outline-none" />
                              ) : (
                                <button type="button" onClick={() => setEditingCell(cellKey)}
                                  className={`w-full px-1 py-1 rounded cursor-pointer transition-colors text-xs font-medium ${rate && rate.price > 0 ? 'text-gray-900 hover:bg-blue-100' : 'text-gray-300 hover:bg-gray-100'}`}>
                                  {rate && rate.price > 0 ? `¥${rate.price.toLocaleString()}` : '—'}
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center px-1 py-1">
                          {region.extraDays > 0 ? <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">+{region.extraDays}日</span> : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="text-center px-0.5 py-1">
                          <button type="button" onClick={() => deleteRegion(region.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">💡 料金をクリックして編集できます / Clique no valor para editar</p>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">地域が設定されていません / Nenhuma região configurada</p>
              <p className="text-xs mt-1">「地域追加」で配送地域を追加してください</p>
            </div>
          )}
        </div>

        {/* ═══ FLAT RATES (LEGACY) ═══ */}
        {(flatRates.length > 0 || regions.length === 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">{regions.length > 0 ? '料金 (地域なし)' : '料金表 / Faixas de Preço'}</h2>
                {regions.length > 0 && flatRates.length > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">レガシー</span>}
              </div>
              <button type="button" onClick={addFlatRate} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"><Plus className="h-3 w-3" /> 追加</button>
            </div>
            {flatRates.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">料金が設定されていません</div>
            ) : (
              <div className="space-y-2">
                {flatRates.map((rate, i) => (
                  <div key={rate.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">最小 (g)</label><input type="number" value={rate.minWeight} onChange={e => updateFlatRate(i, 'minWeight', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">最大 (g)</label><input type="number" value={rate.maxWeight} onChange={e => updateFlatRate(i, 'maxWeight', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">料金 (¥)</label><input type="number" value={rate.price} onChange={e => updateFlatRate(i, 'price', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                    </div>
                    <div className="text-xs text-gray-500 min-w-[80px] text-right">{(rate.minWeight / 1000).toFixed(1)}〜{(rate.maxWeight / 1000).toFixed(1)}kg<br /><span className="font-semibold text-gray-900">¥{rate.price.toLocaleString()}</span></div>
                    <button type="button" onClick={() => removeFlatRate(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ BOTÕES ═══ */}
        <div className="flex gap-4">
          <button type="submit" disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
            {loading ? '保存中...' : <><Save className="h-5 w-5" /> 変更を保存 / Salvar</>}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">キャンセル</button>
        </div>
      </form>
    </div>
  );
}