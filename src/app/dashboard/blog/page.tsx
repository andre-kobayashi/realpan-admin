'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, Upload, Image as ImageIcon, Loader2, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import api from '@/lib/api';

interface BlogPost {
  id: string;
  slug: string;
  titlePt: string;
  titleJa: string;
  summaryPt: string;
  summaryJa: string;
  contentPt: string;
  contentJa: string;
  imageUrl: string;
  category: string;
  linkUrl: string;
  formType: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'news', labelPt: 'Notícia', labelJa: 'ニュース', color: 'bg-amber-100 text-amber-700' },
  { value: 'hiring', labelPt: 'Vagas', labelJa: '採用', color: 'bg-red-100 text-red-700' },
  { value: 'b2b', labelPt: 'B2B', labelJa: 'B2B', color: 'bg-gray-800 text-white' },
  { value: 'product', labelPt: 'Produto', labelJa: '商品', color: 'bg-green-100 text-green-700' },
  { value: 'event', labelPt: 'Evento', labelJa: 'イベント', color: 'bg-purple-100 text-purple-700' },
];

const FORM_TYPES = [
  { value: '', label: 'Nenhum formulário' },
  { value: 'careers', label: '📋 Formulário de Vagas (Contratação)' },
  { value: 'contact', label: '✉️ Formulário de Contato' },
  { value: 'b2b', label: '🏢 Formulário B2B (Empresas)' },
];

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/api/blog');
      setPosts(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createPost = async () => {
    try {
      setSaving(true);
      const res = await api.post('/api/blog', {
        titlePt: 'Nova publicação',
        titleJa: '新しい記事',
        category: 'news',
      });
      setEditing(res.data.data);
      setPosts([res.data.data, ...posts]);
    } catch (e) { console.error(e); alert('Erro ao criar'); }
    finally { setSaving(false); }
  };

  const savePost = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await api.put(`/api/blog/${editing.id}`, editing);
      setPosts(posts.map(p => p.id === editing.id ? editing : p));
      alert('Salvo com sucesso!');
    } catch (e) { console.error(e); alert('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Excluir esta publicação permanentemente?')) return;
    try {
      await api.delete(`/api/blog/${id}`);
      setPosts(posts.filter(p => p.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (e) { console.error(e); }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      const updated = { ...post, published: !post.published };
      await api.put(`/api/blog/${post.id}`, { published: !post.published });
      setPosts(posts.map(p => p.id === post.id ? updated : p));
      if (editing?.id === post.id) setEditing(updated);
    } catch (e) { console.error(e); }
  };

  const uploadImage = async (file: File) => {
    if (!editing) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post(`/api/blog/${editing.id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = { ...editing, imageUrl: res.data.data.imageUrl };
      setEditing(updated);
      setPosts(posts.map(p => p.id === editing.id ? updated : p));
    } catch (e) { console.error(e); alert('Erro no upload'); }
    finally { setUploading(false); }
  };

  const Field = ({ label, value, onChange, placeholder = '', multiline = false }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
  }) => {
    const [local, setLocal] = useState(value);
    const ref = useRef(value);
    useEffect(() => { if (value !== ref.current) { setLocal(value); ref.current = value; } }, [value]);
    const cls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        {multiline ? (
          <textarea value={local} onChange={e => setLocal(e.target.value)}
            onBlur={() => { if (local !== value) onChange(local); }}
            placeholder={placeholder} rows={6} className={cls + " resize-y"} />
        ) : (
          <input type="text" value={local} onChange={e => setLocal(e.target.value)}
            onBlur={() => { if (local !== value) onChange(local); }}
            placeholder={placeholder} className={cls} />
        )}
      </div>
    );
  };

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

  // ── EDITOR VIEW ──
  if (editing) {
    const catInfo = getCategoryInfo(editing.category);
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setEditing(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar à lista
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => togglePublish(editing)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                editing.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {editing.published ? <><Eye className="w-3 h-3" /> Publicado</> : <><EyeOff className="w-3 h-3" /> Rascunho</>}
            </button>
            <button onClick={savePost} disabled={saving}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar / 保存
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-4">
            {/* Image */}
            <div className="relative aspect-[1200/630] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              {editing.imageUrl ? (
                <img src={`https://api.realpan.jp${editing.imageUrl}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1.5">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {editing.imageUrl ? 'Trocar imagem' : 'Upload imagem'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); (e.target as HTMLInputElement).value = ''; }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Título (PT)" value={editing.titlePt} onChange={v => setEditing({...editing, titlePt: v})} placeholder="Título em português" />
              <Field label="タイトル (JA)" value={editing.titleJa} onChange={v => setEditing({...editing, titleJa: v})} placeholder="日本語タイトル" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Resumo (PT)" value={editing.summaryPt} onChange={v => setEditing({...editing, summaryPt: v})} placeholder="Breve descrição" />
              <Field label="要約 (JA)" value={editing.summaryJa} onChange={v => setEditing({...editing, summaryJa: v})} placeholder="簡単な説明" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Conteúdo (PT)" value={editing.contentPt} onChange={v => setEditing({...editing, contentPt: v})} multiline placeholder="Conteúdo completo em português..." />
              <Field label="本文 (JA)" value={editing.contentJa} onChange={v => setEditing({...editing, contentJa: v})} multiline placeholder="日本語の本文..." />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Categoria / カテゴリ</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setEditing({...editing, category: cat.value})}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        editing.category === cat.value ? cat.color + ' border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}>
                      {cat.labelPt} / {cat.labelJa}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Slug (URL)" value={editing.slug} onChange={v => setEditing({...editing, slug: v})} placeholder="minha-publicacao" />
              <Field label="Link externo (opcional)" value={editing.linkUrl} onChange={v => setEditing({...editing, linkUrl: v})} placeholder="https://..." />

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Formulário anexo / フォーム</label>
                <select value={editing.formType}
                  onChange={e => setEditing({...editing, formType: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                  {FORM_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>

              {editing.formType && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-700">
                    📋 Este post incluirá o formulário de <strong>{FORM_TYPES.find(f => f.value === editing.formType)?.label}</strong> ao final do conteúdo.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400 space-y-1">
              <div>ID: {editing.id}</div>
              <div>Criado: {new Date(editing.createdAt).toLocaleDateString('pt-BR')}</div>
              {editing.publishedAt && <div>Publicado: {new Date(editing.publishedAt).toLocaleDateString('pt-BR')}</div>}
            </div>

            <button onClick={() => deletePost(editing.id)}
              className="w-full flex items-center justify-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg text-sm">
              <Trash2 className="w-4 h-4" /> Excluir publicação
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  if (loading) return (
    <div className="p-6"><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div></div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Blog / ブログ</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie publicações e notícias</p>
        </div>
        <button onClick={createPost} disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Nova Publicação
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma publicação</p>
          <p className="text-gray-400 text-sm mt-1">Clique em &quot;Nova Publicação&quot; para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const catInfo = getCategoryInfo(post.category);
            return (
              <div key={post.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden flex cursor-pointer hover:shadow-md transition-all ${
                  !post.published ? 'opacity-70' : ''
                }`}
                onClick={() => setEditing(post)}>
                <div className="w-40 h-28 flex-shrink-0 bg-gray-100">
                  {post.imageUrl ? (
                    <img src={`https://api.realpan.jp${post.imageUrl}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                  )}
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catInfo.color}`}>{catInfo.labelPt}</span>
                      {post.formType && <span className="text-xs text-gray-400">📋 Formulário</span>}
                      {!post.published && <span className="text-xs text-gray-400 italic">Rascunho</span>}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm">{post.titlePt || post.titleJa}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{post.summaryPt || post.summaryJa}</p>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                    {post.slug && <span className="ml-2">/{post.slug}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
