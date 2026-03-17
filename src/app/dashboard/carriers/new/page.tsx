'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Clock, Users, Truck, Settings, MapPin, Package } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

// ── Types ──
interface Rate {
  minWeight: number;
  maxWeight: number;
  price: number;
}

interface RegionDraft {
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

const DEFAULT_WEIGHT_BRACKETS: { min: number; max: number }[] = [
  { min: 0, max: 2000 },
  { min: 2001, max: 5000 },
  { min: 5001, max: 10000 },
  { min: 10001, max: 20000 },
  { min: 20001, max: 30000 },
  { min: 30001, max: 50000 },
];

// ── All 47 prefectures ──
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

// ── Sagawa-style default regions ──
const SAGAWA_REGIONS: { name: string; prefectures: string[]; extraDays: number }[] = [
  { name: '北海道', prefectures: ['北海道'], extraDays: 2 },
  { name: '北東北', prefectures: ['青森県','岩手県','秋田県'], extraDays: 1 },
  { name: '南東北', prefectures: ['宮城県','山形県','福島県'], extraDays: 1 },
  { name: '関東', prefectures: ['茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県'], extraDays: 0 },
  { name: '信越', prefectures: ['新潟県','長野県'], extraDays: 0 },
  { name: '北陸', prefectures: ['富山県','石川県','福井県'], extraDays: 0 },
  { name: '東海', prefectures: ['山梨県','岐阜県','静岡県','愛知県'], extraDays: 0 },
  { name: '関西', prefectures: ['三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県'], extraDays: 0 },
  { name: '中国', prefectures: ['鳥取県','島根県','岡山県','広島県','山口県'], extraDays: 0 },
  { name: '四国', prefectures: ['徳島県','香川県','愛媛県','高知県'], extraDays: 0 },
  { name: '北九州', prefectures: ['福岡県','佐賀県','長崎県','大分県'], extraDays: 0 },
  { name: '南九州', prefectures: ['熊本県','宮崎県','鹿児島県'], extraDays: 1 },
  { name: '沖縄', prefectures: ['沖縄県'], extraDays: 3 },
];

export default function NewCarrierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [useRegions, setUseRegions] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    namePt: '',
    trackingUrlTemplate: '',
    allowedCustomerTypes: ['PF', 'PJ'] as string[],
    cutoffTime: '12:00',
    cutoffDayOffset: 1,
    leadTimeDays: 1,
    minOrderAmount: '',
    maxWeightGrams: '',
    sortOrder: '0',
  });
  const [flatRates, setFlatRates] = useState<Rate[]>([
    { minWeight: 0, maxWeight: 2000, price: 800 },
  ]);
  const [regionDrafts, setRegionDrafts] = useState<RegionDraft[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [newRegion, setNewRegion] = useState({ name: '', prefectures: [] as string[], extraDays: 0 });
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // ── Weight brackets ──
  const weightBrackets = useMemo(() => {
    if (regionDrafts.length === 0) return DEFAULT_WEIGHT_BRACKETS;
    const brackets = new Map<string, { min: number; max: number }>();
    for (const region of regionDrafts) {
      for (const rate of region.rates) {
        const key = `${rate.minWeight}-${rate.maxWeight}`;
        if (!brackets.has(key)) {
          brackets.set(key, { min: rate.minWeight, max: rate.maxWeight });
        }
      }
    }
    return brackets.size > 0
      ? Array.from(brackets.values()).sort((a, b) => a.min - b.min)
      : DEFAULT_WEIGHT_BRACKETS;
  }, [regionDrafts]);

  // ── Customer Types ──
  const toggleCustomerType = (type: string) => {
    setFormData(prev => {
      const types = prev.allowedCustomerTypes.includes(type)
        ? prev.allowedCustomerTypes.filter(t => t !== type)
        : [...prev.allowedCustomerTypes, type];
      return { ...prev, allowedCustomerTypes: types.length > 0 ? types : [type] };
    });
  };

  // ── Flat Rates ──
  const addFlatRate = () => {
    const last = flatRates[flatRates.length - 1];
    setFlatRates([...flatRates, {
      minWeight: last.maxWeight + 1,
      maxWeight: last.maxWeight + 3000,
      price: last.price + 200,
    }]);
  };

  const updateFlatRate = (i: number, field: keyof Rate, value: number) => {
    const r = [...flatRates];
    r[i][field] = value;
    setFlatRates(r);
  };

  const removeFlatRate = (i: number) => setFlatRates(flatRates.filter((_, idx) => idx !== i));

  // ── Region rates ──
  const getRateForRegionWeight = (regionIdx: number, minW: number, maxW: number): Rate | undefined => {
    return regionDrafts[regionIdx].rates.find(r => r.minWeight === minW && r.maxWeight === maxW);
  };

  const updateRegionRatePrice = (regionIdx: number, minW: number, maxW: number, newPrice: number) => {
    setRegionDrafts(prev => prev.map((region, idx) => {
      if (idx !== regionIdx) return region;
      const rateExists = region.rates.find(r => r.minWeight === minW && r.maxWeight === maxW);
      if (rateExists) {
        return {
          ...region,
          rates: region.rates.map(r =>
            r.minWeight === minW && r.maxWeight === maxW ? { ...r, price: newPrice } : r
          ),
        };
      }
      return {
        ...region,
        rates: [...region.rates, { minWeight: minW, maxWeight: maxW, price: newPrice }],
      };
    }));
  };

  // ── Region management ──
  const assignedPrefectures = useMemo(() => {
    const set = new Set<string>();
    for (const region of regionDrafts) {
      for (const p of region.prefectures) set.add(p);
    }
    return set;
  }, [regionDrafts]);

  const togglePrefecture = (pref: string) => {
    setNewRegion(prev => ({
      ...prev,
      prefectures: prev.prefectures.includes(pref)
        ? prev.prefectures.filter(p => p !== pref)
        : [...prev.prefectures, pref]
    }));
  };

  const addRegionDraft = () => {
    if (!newRegion.name || newRegion.prefectures.length === 0) {
      alert('地域名と都道府県を入力してください');
      return;
    }
    setRegionDrafts(prev => [...prev, {
      name: newRegion.name,
      prefectures: newRegion.prefectures,
      extraDays: newRegion.extraDays,
      rates: [], // empty, user fills in the matrix
    }]);
    setNewRegion({ name: '', prefectures: [], extraDays: 0 });
    setShowRegionForm(false);
  };

  const removeRegionDraft = (idx: number) => {
    setRegionDrafts(regionDrafts.filter((_, i) => i !== idx));
  };

  const loadSagawaTemplate = () => {
    const drafts: RegionDraft[] = SAGAWA_REGIONS.map(r => ({
      name: r.name,
      prefectures: r.prefectures,
      extraDays: r.extraDays,
      rates: DEFAULT_WEIGHT_BRACKETS.map(wb => ({
        minWeight: wb.min,
        maxWeight: wb.max,
        price: 0,
      })),
    }));
    setRegionDrafts(drafts);
    setUseRegions(true);
  };

  // ── Time Slots ──
  const addTimeSlot = () => setTimeSlots([...timeSlots, { label: '', start: '', end: '' }]);
  const loadDefaultSlots = () => setTimeSlots([...DEFAULT_TIME_SLOTS]);
  const updateTimeSlot = (i: number, field: keyof TimeSlot, value: string) => {
    const s = [...timeSlots];
    s[i][field] = value;
    if ((field === 'start' || field === 'end') && s[i].start && s[i].end) {
      s[i].label = `${s[i].start}〜${s[i].end}`;
    }
    setTimeSlots(s);
  };
  const removeTimeSlot = (i: number) => setTimeSlots(timeSlots.filter((_, idx) => idx !== i));

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create carrier
      const carrierRes = await api.post('/api/carriers', {
        name: formData.name,
        namePt: formData.namePt || null,
        trackingUrlTemplate: formData.trackingUrlTemplate || null,
        allowedCustomerTypes: formData.allowedCustomerTypes,
        cutoffTime: formData.cutoffTime,
        cutoffDayOffset: formData.cutoffDayOffset,
        leadTimeDays: formData.leadTimeDays,
        deliveryTimeSlots: timeSlots,
        minOrderAmount: formData.minOrderAmount ? parseInt(formData.minOrderAmount) : null,
        maxWeightGrams: formData.maxWeightGrams ? parseInt(formData.maxWeightGrams) : null,
        sortOrder: parseInt(formData.sortOrder) || 0,
        rates: useRegions ? [] : flatRates, // Only send flat rates if not using regions
      });

      const newCarrierId = carrierRes.data.data.id;

      // 2. If using regions, create regions + rates
      if (useRegions && regionDrafts.length > 0) {
        for (const region of regionDrafts) {
          const regionRes = await api.post('/api/shipping/regions', {
            carrierId: newCarrierId,
            name: region.name,
            prefectures: region.prefectures,
            extraDays: region.extraDays,
          });
          const regionId = regionRes.data.data.id;

          // Create rates for this region
          for (const rate of region.rates) {
            if (rate.price > 0) {
              await api.post(`/api/carriers/${newCarrierId}/rates`, {
                minWeight: rate.minWeight,
                maxWeight: rate.maxWeight,
                price: rate.price,
                regionId: regionId,
              });
            }
          }
        }
      }

      alert('✅ 運送会社を作成しました / Transportadora criada!');
      router.push('/dashboard/carriers');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ エラーが発生しました / Erro ao criar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">新規運送会社 / Nova Transportadora</h1>
            <p className="text-gray-500 mt-1">配送設定を入力してください</p>
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
              <input type="text" required value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="佐川急便" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome (PT) *</label>
              <input type="text" required value={formData.namePt}
                onChange={e => setFormData({ ...formData, namePt: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Sagawa Express" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">追跡URL / URL de Rastreamento</label>
            <input type="text" value={formData.trackingUrlTemplate}
              onChange={e => setFormData({ ...formData, trackingUrlTemplate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
              placeholder="https://tracking.example.com?code={CODE}" />
            <p className="text-xs text-gray-500 mt-1">{'{CODE}'} = 追跡番号</p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">表示順 / Ordem</label>
            <input type="number" min="0" value={formData.sortOrder}
              onChange={e => setFormData({ ...formData, sortOrder: e.target.value })}
              className="w-32 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="0" />
          </div>
        </div>

        {/* ═══ TIPO DE CLIENTE ═══ */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-purple-900">顧客タイプ / Tipo de Cliente</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">この運送会社を利用できる顧客タイプを選択してください</p>

          <div className="flex gap-4">
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              formData.allowedCustomerTypes.includes('PF') ? 'border-purple-500 bg-purple-100/50' : 'border-gray-200 bg-white'
            }`}>
              <input type="checkbox" checked={formData.allowedCustomerTypes.includes('PF')}
                onChange={() => toggleCustomerType('PF')} className="w-5 h-5 text-purple-600 rounded" />
              <div>
                <p className="font-semibold text-gray-900">🧑 個人 (PF)</p>
                <p className="text-xs text-gray-500">Cliente Final / 個人のお客様</p>
              </div>
            </label>
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              formData.allowedCustomerTypes.includes('PJ') ? 'border-purple-500 bg-purple-100/50' : 'border-gray-200 bg-white'
            }`}>
              <input type="checkbox" checked={formData.allowedCustomerTypes.includes('PJ')}
                onChange={() => toggleCustomerType('PJ')} className="w-5 h-5 text-purple-600 rounded" />
              <div>
                <p className="font-semibold text-gray-900">🏢 法人 (PJ)</p>
                <p className="text-xs text-gray-500">Empresa / 法人のお客様</p>
              </div>
            </label>
          </div>
        </div>

        {/* ═══ HORÁRIO DE CORTE ═══ */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900">締め切り時間 / Horário de Corte</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            この時間までの注文は当日出荷、以降は翌営業日出荷 / Pedidos até este horário são enviados no mesmo dia
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">締切時間 / Horário</label>
              <input type="time" value={formData.cutoffTime}
                onChange={e => setFormData({ ...formData, cutoffTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">遅延日数 / Dias extra após corte</label>
              <input type="number" min="0" max="7" value={formData.cutoffDayOffset}
                onChange={e => setFormData({ ...formData, cutoffDayOffset: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
              <p className="text-xs text-gray-500 mt-1">通常 1 = 翌日</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最短配送日数 / Lead time (dias)</label>
              <input type="number" min="0" max="14" value={formData.leadTimeDays}
                onChange={e => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
              <p className="text-xs text-gray-500 mt-1">注文からお届けまでの最短日数</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最低注文金額 (¥)</label>
              <input type="number" min="0" value={formData.minOrderAmount}
                onChange={e => setFormData({ ...formData, minOrderAmount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                placeholder="任意" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最大重量 (g)</label>
              <input type="number" min="0" value={formData.maxWeightGrams}
                onChange={e => setFormData({ ...formData, maxWeightGrams: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                placeholder="任意" />
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
              <button type="button" onClick={loadDefaultSlots}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium">
                📋 標準テンプレート / Padrão Yamato
              </button>
              <button type="button" onClick={addTimeSlot}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                <Plus className="h-3 w-3" /> 追加
              </button>
            </div>
          </div>

          {timeSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">時間帯指定なし / Sem faixas de horário</p>
              <p className="text-xs mt-1">「標準テンプレート」で一般的な時間帯を追加できます</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ラベル</label>
                      <input type="text" value={slot.label}
                        onChange={e => updateTimeSlot(i, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="午前中" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始</label>
                      <input type="time" value={slot.start}
                        onChange={e => updateTimeSlot(i, 'start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了</label>
                      <input type="time" value={slot.end}
                        onChange={e => updateTimeSlot(i, 'end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeTimeSlot(i)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ MODO DE TARIFAS ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">料金設定モード / Modo de Tarifas</h2>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              !useRegions ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            }`}>
              <input type="radio" name="rateMode" checked={!useRegions}
                onChange={() => setUseRegions(false)} className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">📦 料金一律 / Tarifa Única</p>
                <p className="text-xs text-gray-500">全国一律の料金設定 / Preço único para todo o Japão</p>
              </div>
            </label>
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              useRegions ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            }`}>
              <input type="radio" name="rateMode" checked={useRegions}
                onChange={() => setUseRegions(true)} className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">🗾 地域別 / Por Região</p>
                <p className="text-xs text-gray-500">地域ごとに異なる料金 / Preços diferentes por região</p>
              </div>
            </label>
          </div>

          {/* ── FLAT RATES ── */}
          {!useRegions && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">料金表 / Faixas de Preço por Peso</h3>
                <button type="button" onClick={addFlatRate}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                  <Plus className="h-3 w-3" /> 追加
                </button>
              </div>
              <div className="space-y-2">
                {flatRates.map((rate, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">最小重量 (g)</label>
                        <input type="number" value={rate.minWeight}
                          onChange={e => updateFlatRate(i, 'minWeight', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">最大重量 (g)</label>
                        <input type="number" value={rate.maxWeight}
                          onChange={e => updateFlatRate(i, 'maxWeight', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">料金 (¥)</label>
                        <input type="number" value={rate.price}
                          onChange={e => updateFlatRate(i, 'price', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 min-w-[80px] text-right">
                      {(rate.minWeight / 1000).toFixed(1)}〜{(rate.maxWeight / 1000).toFixed(1)}kg
                      <br />
                      <span className="font-semibold text-gray-900">¥{rate.price.toLocaleString()}</span>
                    </div>
                    {flatRates.length > 1 && (
                      <button type="button" onClick={() => removeFlatRate(i)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── REGION-BASED RATES ── */}
          {useRegions && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">地域別料金 / Tarifas por Região</h3>
                <div className="flex gap-2">
                  {regionDrafts.length === 0 && (
                    <button type="button" onClick={loadSagawaTemplate}
                      className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-xs font-medium">
                      🚚 佐川テンプレート (13地域)
                    </button>
                  )}
                  <button type="button" onClick={() => setShowRegionForm(!showRegionForm)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                    <Plus className="h-3 w-3" /> 地域追加
                  </button>
                </div>
              </div>

              {/* Add region form */}
              {showRegionForm && (
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">新しい地域 / Nova Região</h4>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">地域名</label>
                      <input type="text" value={newRegion.name}
                        onChange={e => setNewRegion({ ...newRegion, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="例: 関東" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">追加日数</label>
                      <input type="number" min="0" max="10" value={newRegion.extraDays}
                        onChange={e => setNewRegion({ ...newRegion, extraDays: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="button" onClick={addRegionDraft}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        追加
                      </button>
                      <button type="button" onClick={() => setShowRegionForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        キャンセル
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">都道府県を選択</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_PREFECTURES.map(pref => {
                        const isAssigned = assignedPrefectures.has(pref);
                        const isSelected = newRegion.prefectures.includes(pref);
                        return (
                          <button
                            key={pref}
                            type="button"
                            disabled={isAssigned}
                            onClick={() => togglePrefecture(pref)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isAssigned
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                : isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {pref}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {regionDrafts.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b min-w-[180px]">
                            地域 / Região
                          </th>
                          {weightBrackets.map((wb, i) => (
                            <th key={i} className="text-center px-2 py-2 font-semibold text-gray-700 border-b min-w-[100px]">
                              <div className="text-xs">
                                {wb.min === 0 ? '0' : (wb.min / 1000).toFixed(1)}〜{(wb.max / 1000).toFixed(1)}kg
                              </div>
                            </th>
                          ))}
                          <th className="text-center px-2 py-2 font-semibold text-gray-700 border-b w-[60px]">+日数</th>
                          <th className="w-[50px] border-b"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {regionDrafts.map((region, rIdx) => (
                          <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{region.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {region.prefectures.slice(0, 3).join(', ')}
                                {region.prefectures.length > 3 && ` +${region.prefectures.length - 3}`}
                              </div>
                            </td>
                            {weightBrackets.map((wb, i) => {
                              const rate = getRateForRegionWeight(rIdx, wb.min, wb.max);
                              const cellKey = `${rIdx}-${wb.min}-${wb.max}`;
                              return (
                                <td key={i} className="text-center px-1 py-2">
                                  {editingCell === cellKey ? (
                                    <input
                                      type="number"
                                      autoFocus
                                      value={rate?.price || 0}
                                      onChange={e => updateRegionRatePrice(rIdx, wb.min, wb.max, parseInt(e.target.value) || 0)}
                                      onBlur={() => setEditingCell(null)}
                                      onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
                                      className="w-full px-2 py-1 border border-blue-400 rounded text-sm text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditingCell(cellKey)}
                                      className={`w-full px-2 py-1 text-center rounded cursor-pointer transition-colors font-medium ${
                                        rate && rate.price > 0
                                          ? 'text-gray-900 hover:bg-blue-50'
                                          : 'text-gray-300 hover:bg-gray-100'
                                      }`}
                                    >
                                      {rate && rate.price > 0 ? `¥${rate.price.toLocaleString()}` : '—'}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center px-2 py-2">
                              {region.extraDays > 0 ? (
                                <span className="inline-flex items-center text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                  +{region.extraDays}日
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="text-center px-1 py-2">
                              <button type="button" onClick={() => removeRegionDraft(rIdx)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 料金をクリックして編集できます / Clique no valor para editar inline
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">地域が設定されていません</p>
                  <p className="text-xs mt-1">「佐川テンプレート」で標準的な13地域を一括追加できます</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ BOTÕES ═══ */}
        <div className="flex gap-4">
          <button type="submit" disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
            {loading ? '作成中...' : '✅ 運送会社を作成 / Criar Transportadora'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}