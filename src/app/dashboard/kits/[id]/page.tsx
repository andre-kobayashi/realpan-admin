'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Save, Gift, Plus, Trash2, Search, X, Sparkles,
  Image as ImageIcon, Package, Calculator
} from 'lucide-react';
import api from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

interface Product {
  id: string;
  namePt: string;
  nameJa: string;
  hinban: string;
  images: string[];
  originalPrice: number;
  retailPrice: number;
  retailPriceWithTax: number;
  storageType: string;
  unit: string;
}

interface KitItemForm {
  productId: string;
  product: Product;
  quantity: number;
}


function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ー～〜]/g, '').trim();
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.realpan.jp';

export default function KitFormPage() {
  const router = useRouter();
  const params = useParams();
  const kitId = params.id as string;
  const isNew = kitId === 'new';

  // ── Form state ──
  const [namePt, setNamePt] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [descPt, setDescPt] = useState('');
  const [descJa, setDescJa] = useState('');
  const [slug, setSlug] = useState('');
  const [promoPrice, setPromoPrice] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  // ── Items ──
  const [items, setItems] = useState<KitItemForm[]>([]);

  // ── Gift ──
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [giftProductId, setGiftProductId] = useState('');
  const [giftProduct, setGiftProduct] = useState<Product | null>(null);

  // ── Images ──
  const [images, setImages] = useState<string[]>([]);

  // ── Product search ──
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showGiftSearch, setShowGiftSearch] = useState(false);

  // ── State ──
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // ── Calculated base price ──
  const basePrice = items.reduce((sum, item) => {
    return sum + (item.product.retailPriceWithTax || Math.ceil((item.product.retailPrice || item.product.originalPrice || 0) * 1.08)) * item.quantity;
  }, 0);

  // ── Load all products ──
  useEffect(() => {
    api.get('/api/products').then(({ data }) => {
      if (data.success) setAllProducts(data.data || []);
    }).catch(console.error);
  }, []);

  // ── Load kit for editing ──
  useEffect(() => {
    if (isNew) return;
    api.get(`/api/kits/${kitId}`).then(({ data }) => {
      if (!data.success) return router.push('/dashboard/kits');
      const kit = data.data;
      setNamePt(kit.namePt);
      setNameJa(kit.nameJa);
      setDescPt(kit.descriptionPt || '');
      setDescJa(kit.descriptionJa || '');
      setSlug(kit.slug);
      setPromoPrice(kit.promoPrice ? String(kit.promoPrice) : '');
      setIsActive(kit.isActive);
      setIsFeatured(kit.isFeatured);
      setSortOrder(kit.sortOrder || 0);
      setGiftEnabled(kit.giftEnabled);
      setGiftProductId(kit.giftProductId || '');
      setGiftProduct(kit.giftProduct || null);

      setItems(kit.items.map((i: any) => ({
        productId: i.product.id,
        product: i.product,
        quantity: i.quantity,
      })));

      setImages(kit.images.map((img: any) => img.imageUrl));
    }).catch(() => router.push('/dashboard/kits'))
      .finally(() => setLoading(false));
  }, [isNew, kitId, router]);

  // ── Auto-slug from name ──
  useEffect(() => {
    if (isNew && namePt) {
      setSlug(namePt.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [namePt, isNew]);

  // ── Search products ──
  const filteredProducts = allProducts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = normalize(searchQuery);
    return normalize(p.namePt).includes(q)
      || normalize(p.nameJa).includes(q)
      || normalize(p.hinban).includes(q);
  });

  // ── Add product to kit ──
  const addProduct = (product: Product) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(prev => prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, { productId: product.id, product, quantity: 1 }]);
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  // ── Remove product ──
  const removeProduct = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  // ── Update quantity ──
  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) return removeProduct(productId);
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  // ── Set gift ──
  const selectGift = (product: Product) => {
    setGiftProductId(product.id);
    setGiftProduct(product);
    setShowGiftSearch(false);
    setSearchQuery('');
  };

  // ── Image upload ──



  // ── Save ──
  const handleSave = async () => {
    if (!namePt || !nameJa || !slug) {
      alert('Nome PT, Nome JA e Slug são obrigatórios');
      return;
    }
    if (items.length === 0) {
      alert('Adicione pelo menos 1 produto ao kit');
      return;
    }

    setSaving(true);
    try {
      // Images already uploaded by ImageUpload component

      const payload = {
        slug,
        namePt,
        nameJa,
        descriptionPt: descPt || null,
        descriptionJa: descJa || null,
        basePrice,
        promoPrice: promoPrice ? parseInt(promoPrice, 10) : null,
        isActive,
        isFeatured,
        sortOrder,
        giftEnabled,
        giftProductId: giftEnabled && giftProductId ? giftProductId : null,
        items: items.map((item, i) => ({
          productId: item.productId,
          quantity: item.quantity,
          sortOrder: i,
        })),
        images: images.map((img, i) => ({
          imageUrl: img,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      };

      if (isNew) {
        await api.post('/api/kits', payload);
      } else {
        await api.put(`/api/kits/${kitId}`, payload);
      }

      router.push('/dashboard/kits');
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(`保存に失敗しました: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Product search modal ──
  const ProductSearchModal = ({ onSelect, onClose }: { onSelect: (p: Product) => void; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input type="text" autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="商品名・品番で検索 / Buscar por nome ou código..."
            className="flex-1 text-sm outline-none" />
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">商品が見つかりません</p>
          ) : (
            <div className="space-y-1">
              {filteredProducts.map(p => {
                const inKit = items.some(i => i.productId === p.id);
                const img = p.images?.[0];
                const imgUrl = img ? (img.startsWith('http') ? img : `${API_URL}/uploads/products/${img}`) : null;
                return (
                  <button key={p.id} type="button" onClick={() => onSelect(p)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      inKit ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                    }`}>
                    <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                      {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-contain" /> : <Package className="h-5 w-5 text-gray-300 m-auto mt-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.namePt}</p>
                      <p className="text-xs text-gray-400 truncate">{p.nameJa} • {p.hinban}</p>
                    </div>
                    <span className="text-sm font-mono text-gray-600">¥{(p.retailPriceWithTax || Math.ceil((p.retailPrice || p.originalPrice || 0) * 1.08)).toLocaleString()}</span>
                    {inKit && <span className="text-xs text-orange-600 font-medium">No kit</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumbs />
      {/* 
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Kits', href: '/dashboard/kits' },
        { label: isNew ? 'Novo Kit' : 'Editar Kit' },
 */}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? '🎁 Novo Kit / 新規キット' : '🎁 Editar Kit / キット編集'}
          </h1>
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Save className="h-4 w-4" /> {saving ? '保存中...' : '保存 / Salvar'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ═══ LEFT: Main info ═══ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Basic Info ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Gift className="h-4 w-4 text-orange-500" /> Informações / 基本情報
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome PT *</label>
                <input type="text" value={namePt} onChange={e => setNamePt(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  placeholder="Kit Café da Manhã" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome JA *</label>
                <input type="text" value={nameJa} onChange={e => setNameJa(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  placeholder="朝食キット" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slug *</label>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                placeholder="kit-cafe-da-manha" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição PT</label>
                <textarea value={descPt} onChange={e => setDescPt(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição JA</label>
                <textarea value={descJa} onChange={e => setDescJa(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500" />
              </div>
            </div>
          </div>

          {/* ── Products in Kit ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" /> Produtos do Kit / セット内容
              </h2>
              <button type="button" onClick={() => setShowSearch(true)}
                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium">
                <Plus className="h-4 w-4" /> Adicionar produto
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Clique em "Adicionar produto" para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const img = item.product.images?.[0];
                  const imgUrl = img ? (img.startsWith('http') ? img : `${API_URL}/uploads/products/${img}`) : null;
                  const unitPrice = item.product.retailPriceWithTax || Math.ceil((item.product.retailPrice || item.product.originalPrice || 0) * 1.08);
                  return (
                    <div key={item.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded bg-white overflow-hidden flex-shrink-0 border border-gray-200">
                        {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-contain" /> : <Package className="h-5 w-5 text-gray-300 m-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product.namePt}</p>
                        <p className="text-xs text-gray-400">{item.product.hinban} • ¥{unitPrice.toLocaleString()}/個</p>
                      </div>
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <button type="button" onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="px-2 py-1.5 hover:bg-gray-100 text-gray-500">−</button>
                        <span className="px-2 py-1.5 text-sm font-bold min-w-[2rem] text-center">{item.quantity}</span>
                        <button type="button" onClick={() => updateQty(item.productId, item.quantity + 1)}
                          className="px-2 py-1.5 hover:bg-gray-100 text-gray-500">+</button>
                      </div>
                      <span className="text-sm font-mono font-bold text-gray-700 w-20 text-right">
                        ¥{(unitPrice * item.quantity).toLocaleString()}
                      </span>
                      <button type="button" onClick={() => removeProduct(item.productId)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  );
                })}

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calculator className="h-4 w-4" />
                    Preço base calculado (税込)
                  </div>
                  <span className="text-xl font-bold text-gray-900 tabular-nums">¥{basePrice.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Images ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-500" /> Imagens do Kit / キット画像
            </h2>
            <ImageUpload images={images} onChange={setImages} maxImages={3} />
          </div>
        </div>

        {/* ═══ RIGHT: Settings ═══ */}
        <div className="space-y-6">
          {/* ── Price ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Preço / 価格</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Preço Base (auto)</label>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-lg font-bold text-gray-900 tabular-nums">
                ¥{basePrice.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Preço Promocional (opcional)</label>
              <input type="number" value={promoPrice} onChange={e => setPromoPrice(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                placeholder="Ex: 3980" />
            </div>
            {promoPrice && parseInt(promoPrice) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <span className="text-xs text-red-600">Desconto:</span>
                <span className="block text-lg font-bold text-red-600">
                  -{Math.round(((basePrice - parseInt(promoPrice)) / basePrice) * 100)}% (¥{(basePrice - parseInt(promoPrice)).toLocaleString()} OFF)
                </span>
              </div>
            )}
          </div>

          {/* ── Gift ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-orange-500" /> Brinde
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={giftEnabled} onChange={e => setGiftEnabled(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
            {giftEnabled && (
              <>
                {giftProduct ? (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <Sparkles className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{giftProduct.namePt}</p>
                      <p className="text-xs text-gray-400">{giftProduct.nameJa}</p>
                    </div>
                    <button type="button" onClick={() => { setGiftProduct(null); setGiftProductId(''); }}
                      className="p-1 text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowGiftSearch(true)}
                    className="w-full py-3 border-2 border-dashed border-orange-300 text-sm text-orange-600 rounded-lg hover:bg-orange-50 transition-colors">
                    + Selecionar produto brinde
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Status ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Status</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-600">Ativo / 有効</span>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-600">Destaque / おすすめ</span>
              <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" />
            </label>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ordem</label>
              <input type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Product search modals ── */}
      {showSearch && <ProductSearchModal onSelect={addProduct} onClose={() => { setShowSearch(false); setSearchQuery(''); }} />}
      {showGiftSearch && <ProductSearchModal onSelect={selectGift} onClose={() => { setShowGiftSearch(false); setSearchQuery(''); }} />}
    </div>
  );
}