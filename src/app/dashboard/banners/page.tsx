'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, GripVertical, Eye, EyeOff, Upload, Save, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Banner {
  id: string;
  titlePt: string;
  titleJa: string;
  subtitlePt: string;
  subtitleJa: string;
  ctaPt: string;
  ctaJa: string;
  linkUrl: string;
  imageUrl: string;
  position: number;
  active: boolean;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const res = await api.get('/api/banners');
      setBanners(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createBanner = async () => {
    try {
      setSaving('new');
      const res = await api.post('/api/banners', {
        titlePt: 'Novo Banner',
        titleJa: '新しいバナー',
        subtitlePt: '',
        subtitleJa: '',
        ctaPt: 'Ver mais',
        ctaJa: 'もっと見る',
      });
      setBanners([...banners, res.data.data]);
    } catch (e) { console.error(e); alert('Erro ao criar banner'); }
    finally { setSaving(null); }
  };

  const updateBanner = async (id: string, data: Partial<Banner>) => {
    try {
      setSaving(id);
      await api.put(`/api/banners/${id}`, data);
      setBanners(banners.map(b => b.id === id ? { ...b, ...data } : b));
    } catch (e) { console.error(e); alert('Erro ao salvar'); }
    finally { setSaving(null); }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Excluir este banner permanentemente?')) return;
    try {
      await api.delete(`/api/banners/${id}`);
      setBanners(banners.filter(b => b.id !== id));
    } catch (e) { console.error(e); alert('Erro ao excluir'); }
  };

  const uploadImage = async (id: string, file: File) => {
    try {
      setUploading(id);
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post(`/api/banners/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBanners(banners.map(b => b.id === id ? { ...b, imageUrl: res.data.data.imageUrl } : b));
    } catch (e) { console.error(e); alert('Erro no upload da imagem'); }
    finally { setUploading(null); }
  };

  const moveUp = async (idx: number) => {
    if (idx === 0) return;
    const newBanners = [...banners];
    [newBanners[idx - 1], newBanners[idx]] = [newBanners[idx], newBanners[idx - 1]];
    const items = newBanners.map((b, i) => ({ id: b.id, position: i }));
    setBanners(newBanners);
    try { await api.put('/banners/reorder/positions', { items }); } catch (e) { console.error(e); }
  };

  const moveDown = async (idx: number) => {
    if (idx === banners.length - 1) return;
    const newBanners = [...banners];
    [newBanners[idx], newBanners[idx + 1]] = [newBanners[idx + 1], newBanners[idx]];
    const items = newBanners.map((b, i) => ({ id: b.id, position: i }));
    setBanners(newBanners);
    try { await api.put('/banners/reorder/positions', { items }); } catch (e) { console.error(e); }
  };

  const Field = ({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
      />
    </div>
  );

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Banners / バナー管理</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os slides do banner da página inicial</p>
        </div>
        <button
          onClick={createBanner}
          disabled={saving === 'new'}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum banner cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Clique em &quot;Adicionar Banner&quot; para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                !banner.active ? 'opacity-60 border-gray-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-stretch">
                {/* Image area */}
                <div className="relative w-72 flex-shrink-0 bg-gray-100">
                  {banner.imageUrl ? (
                    <img
                      src={`https://api.realpan.jp${banner.imageUrl}`}
                      alt={banner.titlePt}
                      className="w-full h-full object-cover min-h-[180px]"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[180px]">
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => { fileInputRef.current[banner.id] = el; }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(banner.id, file);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current[banner.id]?.click()}
                    disabled={uploading === banner.id}
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {uploading === banner.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {banner.imageUrl ? 'Trocar' : 'Upload'}
                  </button>
                </div>

                {/* Fields */}
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button>
                      <button onClick={() => moveDown(idx)} disabled={idx === banners.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateBanner(banner.id, { active: !banner.active })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          banner.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {banner.active ? <><Eye className="w-3 h-3" /> Ativo</> : <><EyeOff className="w-3 h-3" /> Oculto</>}
                      </button>
                      <button onClick={() => deleteBanner(banner.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Field label="Título (PT)" value={banner.titlePt} onChange={v => setBanners(banners.map(b => b.id === banner.id ? { ...b, titlePt: v } : b))} placeholder="Sabor do Brasil" />
                    <Field label="タイトル (JA)" value={banner.titleJa} onChange={v => setBanners(banners.map(b => b.id === banner.id ? { ...b, titleJa: v } : b))} placeholder="本場ブラジルの味" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Field label="Subtítulo (PT)" value={banner.subtitlePt} onChange={v => setBanners(banners.map(b => b.id === banner.id ? { ...b, subtitlePt: v } : b))} />
                    <Field label="サブタイトル (JA)" value={banner.subtitleJa} onChange={v => setBanners(banners.map(b => b.id === banner.id ? { ...b, subtitleJa: v } : b))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="CTA (PT)" value={banner.ctaPt} onChange={v => setBanners(banners.map(b => b.id === banner.id ? { ...b, ctaPt: v } : b))} placeholder="Ver mais" />
                    <Field label="CTA (JA)" value={banner.ctaJa} onChange={v => setBanners(banners.map(b => b.id === banner.id ? { ...b, ctaJa: v } : b))} placeholder="もっと見る" />
                    <Field label="Link URL" value={banner.linkUrl} onChange={v => setBanners(banners.map(b => b.id === banner.id ? { ...b, linkUrl: v } : b))} placeholder="/pt/products" />
                  </div>

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => updateBanner(banner.id, {
                        titlePt: banner.titlePt, titleJa: banner.titleJa,
                        subtitlePt: banner.subtitlePt, subtitleJa: banner.subtitleJa,
                        ctaPt: banner.ctaPt, ctaJa: banner.ctaJa,
                        linkUrl: banner.linkUrl,
                      })}
                      disabled={saving === banner.id}
                      className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      {saving === banner.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Salvar / 保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {banners.filter(b => b.active && b.imageUrl).length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-700 mb-3">Preview (como aparece no site)</h2>
          <div className="relative h-[300px] rounded-2xl overflow-hidden">
            {(() => {
              const active = banners.filter(b => b.active && b.imageUrl);
              const first = active[0];
              return first ? (
                <>
                  <img src={`https://api.realpan.jp${first.imageUrl}`} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
                  <div className="absolute bottom-8 left-8 text-white">
                    <h2 className="text-3xl font-bold mb-2">{first.titlePt}</h2>
                    <p className="text-white/80 mb-4">{first.subtitlePt}</p>
                    {first.ctaPt && (
                      <span className="bg-amber-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                        {first.ctaPt} →
                      </span>
                    )}
                  </div>
                </>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
