'use client';

import React, { useState, useRef, useCallback, useEffect, Component } from 'react';
import {
  Upload, X, ZoomIn, ZoomOut, RotateCw, Check,
  Move, Sun, Loader2, Maximize2
} from 'lucide-react';
import api from '@/lib/api';

// ErrorBoundary
interface EBProps { children: React.ReactNode; onError?: () => void }
interface EBState { hasError: boolean; error: string }
class BannerEditorErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  componentDidCatch(error: Error) { console.error('[BannerEditor]', error); this.props.onError?.(); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-red-600 mb-2">Erro no editor</p>
          <button type="button" onClick={() => this.setState({ hasError: false, error: '' })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Tentar novamente</button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface BannerImageEditorProps {
  bannerId: string;
  currentImage: string;
  onUploaded: (imageUrl: string) => void;
}

interface CropState { scale: number; rotation: number; offsetX: number; offsetY: number; }
interface AdjustState { brightness: number; contrast: number; temperature: number; preset: string; }
type EditorTab = 'crop' | 'adjust';

// Banner dimensions: 1920x1080 (16:9)
const OUTPUT_W = 1920;
const OUTPUT_H = 1080;
const ASPECT = OUTPUT_W / OUTPUT_H; // 1.777...
const PREVIEW_MAX = 800;

const PRESETS: Record<string, Partial<AdjustState>> = {
  none:    { brightness: 0,   contrast: 0,   temperature: 0   },
  natural: { brightness: 5,   contrast: 10,  temperature: 5   },
  vibrant: { brightness: 10,  contrast: 25,  temperature: 15  },
  cool:    { brightness: 5,   contrast: 10,  temperature: -30 },
  warm:    { brightness: 8,   contrast: 5,   temperature: 40  },
};

const PRESET_LABELS: Record<string, string> = {
  none:    '⬜ Original',
  natural: '🌿 Natural',
  vibrant: '🌈 Vibrante',
  cool:    '❄️ Frio',
  warm:    '🔆 Quente',
};

function applyColorAdjustments(ctx: CanvasRenderingContext2D, w: number, h: number, adj: AdjustState) {
  if (adj.brightness === 0 && adj.contrast === 0 && adj.temperature === 0) return;
  try {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const brightness = adj.brightness * 2.55;
    const contrast = (adj.contrast + 100) / 100;
    const tempR = adj.temperature > 0 ? adj.temperature * 0.8 : 0;
    const tempB = adj.temperature < 0 ? -adj.temperature * 0.8 : 0;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      r += brightness; g += brightness; b += brightness;
      r = (r - 128) * contrast + 128; g = (g - 128) * contrast + 128; b = (b - 128) * contrast + 128;
      r += tempR; b += tempB;
      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(imageData, 0, 0);
  } catch (err) { console.warn('[BannerEditor] color adjust failed:', err); }
}

function BannerImageEditorInner({ bannerId, currentImage, onUploaded }: BannerImageEditorProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 });
  const [activeTab, setActiveTab] = useState<EditorTab>('crop');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [crop, setCrop] = useState<CropState>({ scale: 1, rotation: 0, offsetX: 0, offsetY: 0 });
  const [adjust, setAdjust] = useState<AdjustState>({ brightness: 0, contrast: 0, temperature: 0, preset: 'none' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const sourceUrlValid = useRef(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setSourceUrl(url);
      sourceUrlValid.current = true;
      setCrop({ scale: 1, rotation: 0, offsetX: 0, offsetY: 0 });
      setAdjust({ brightness: 0, contrast: 0, temperature: 0, preset: 'none' });
      setActiveTab('crop');
      setError(null);
      setIsOpen(true);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setError('Imagem inválida'); };
    img.src = url;
  }, []);

  const closeEditor = useCallback(() => {
    if (uploading) return;
    if (sourceUrl && sourceUrlValid.current) { try { URL.revokeObjectURL(sourceUrl); } catch {} }
    sourceUrlValid.current = false;
    setSourceUrl(null);
    setIsOpen(false);
    setError(null);
  }, [uploading, sourceUrl]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeEditor(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [closeEditor]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (activeTab !== 'crop') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.offsetX, y: e.clientY - crop.offsetY });
  }, [activeTab, crop.offsetX, crop.offsetY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setCrop(c => ({ ...c, offsetX: e.clientX - dragStart.x, offsetY: e.clientY - dragStart.y }));
  }, [isDragging, dragStart]);

  const onPointerUp = useCallback(() => setIsDragging(false), []);

  // Adjust preview
  useEffect(() => {
    if (activeTab !== 'adjust' || !sourceUrl || !sourceUrlValid.current) return;
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = previewRef.current;
        if (!canvas) return;
        const img = new window.Image();
        img.onload = () => {
          try {
            if (!previewRef.current || !sourceUrlValid.current) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const scale = Math.min(1, PREVIEW_MAX / Math.max(img.naturalWidth, img.naturalHeight));
            const pw = Math.round(img.naturalWidth * scale);
            const ph = Math.round(img.naturalHeight * scale);
            canvas.width = pw; canvas.height = ph;
            ctx.drawImage(img, 0, 0, pw, ph);
            applyColorAdjustments(ctx, pw, ph, adjust);
          } catch {}
        };
        img.src = sourceUrl;
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [adjust, activeTab, sourceUrl]);

  // Render final 1920x1080
  const renderFinal = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!sourceUrl || !sourceUrlValid.current || !canvasRef.current) return reject('no source');
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d')!;
          canvas.width = OUTPUT_W;
          canvas.height = OUTPUT_H;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);
          ctx.save();
          ctx.translate(OUTPUT_W / 2, OUTPUT_H / 2);
          const rad = (crop.rotation * Math.PI) / 180;
          const cosA = Math.cos(rad), sinA = Math.sin(rad);
          ctx.translate(
            crop.offsetX * cosA + crop.offsetY * sinA,
            -crop.offsetX * sinA + crop.offsetY * cosA
          );
          ctx.rotate(rad);
          // Cover: fill the 16:9 frame
          const coverScale = Math.max(OUTPUT_W / img.naturalWidth, OUTPUT_H / img.naturalHeight);
          const finalScale = coverScale * crop.scale;
          ctx.scale(finalScale, finalScale);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          ctx.restore();
          applyColorAdjustments(ctx, OUTPUT_W, OUTPUT_H, adjust);
          canvas.toBlob(blob => {
            if (blob) resolve(blob); else reject('toBlob null');
          }, 'image/webp', 0.85);
        } catch (err) { reject(err); }
      };
      img.onerror = () => reject('load failed');
      img.src = sourceUrl;
    });
  }, [sourceUrl, crop, adjust]);

  // Upload to banner endpoint
  const handleConfirm = useCallback(async () => {
    setUploading(true); setError(null);
    try {
      const blob = await renderFinal();
      const formData = new FormData();
      formData.append('image', blob, 'banner.webp');
      const { data } = await api.post(`/api/banners/${bannerId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        onUploaded(data.data.imageUrl);
        closeEditor();
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('[banner upload]', err);
      setError('Erro ao enviar. Tente novamente.');
    } finally { setUploading(false); }
  }, [renderFinal, bannerId, onUploaded, closeEditor]);

  const cropImgStyle: React.CSSProperties = {
    transform: `translate(${crop.offsetX}px, ${crop.offsetY}px) rotate(${crop.rotation}deg) scale(${crop.scale})`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.15s ease',
    width: '100%', height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none', userSelect: 'none',
  };

  return (
    <div>
      {/* Trigger button */}
      <div className="relative">
        {currentImage ? (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            <img src={`https://api.realpan.jp${currentImage}`} alt="Banner" className="w-full h-full object-cover" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
              <Upload className="w-3 h-3" /> Trocar imagem
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-amber-400 hover:bg-amber-50 flex flex-col items-center justify-center gap-2 transition-all">
            <Upload className="w-8 h-8 text-gray-300" />
            <span className="text-xs text-gray-400">Upload banner (1920×1080)</span>
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
        onChange={e => { handleFileSelect(e.target.files); (e.target as HTMLInputElement).value = ''; }} />

      <canvas ref={canvasRef} className="hidden" width={OUTPUT_W} height={OUTPUT_H} />

      {/* Modal editor */}
      {isOpen && sourceUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) closeEditor(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '96vh' }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
              <p className="font-semibold text-sm text-gray-900">Editor de Banner / バナー編集</p>
              <button type="button" onClick={closeEditor} disabled={uploading}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-40">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b flex-shrink-0">
              {([
                { id: 'crop' as EditorTab, icon: <Move className="h-4 w-4" />, label: 'Corte' },
                { id: 'adjust' as EditorTab, icon: <Sun className="h-4 w-4" />, label: 'Ajustes' },
              ]).map(tab => (
                <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.id ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Preview area - 16:9 aspect */}
            <div className="relative bg-gray-900 flex-shrink-0 overflow-hidden select-none"
              style={{ width: '100%', paddingBottom: `${100 / ASPECT}%`,
                cursor: activeTab === 'crop' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <canvas ref={previewRef} className="w-full h-full"
                  style={{ objectFit: 'contain', display: activeTab === 'adjust' ? 'block' : 'none' }} />
                <img src={sourceUrl} alt="preview" draggable={false}
                  style={{ ...cropImgStyle, display: activeTab === 'crop' ? 'block' : 'none' }} />
              </div>
              {activeTab === 'crop' && (
                <>
                  <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
                    backgroundSize: '33.33% 33.33%' }} />
                  <div className="absolute inset-0 border-2 border-white/30 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    <Maximize2 className="h-3 w-3" /> {imgNatural.w}×{imgNatural.h} → 1920×1080
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="px-4 py-3 space-y-3">
                {activeTab === 'crop' && (
                  <>
                    <div className="flex items-center gap-2">
                      <ZoomOut className="h-4 w-4 text-gray-400" />
                      <input type="range" min="50" max="400" step="5"
                        value={Math.round(crop.scale * 100)}
                        onChange={e => setCrop(c => ({ ...c, scale: Math.max(0.5, Math.min(4, parseInt(e.target.value) / 100)) }))}
                        className="flex-1 accent-amber-500" />
                      <ZoomIn className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-400 w-9 text-right">{Math.round(crop.scale * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setCrop(c => ({ ...c, rotation: (c.rotation + 90) % 360, offsetX: 0, offsetY: 0 }))}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        <RotateCw className="h-4 w-4" /> Girar 90°
                      </button>
                      <button type="button" onClick={() => setCrop({ scale: 1, rotation: 0, offsetX: 0, offsetY: 0 })}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        <Move className="h-4 w-4" /> Reset
                      </button>
                    </div>
                    <p className="text-xs text-center text-gray-400">Arraste para reposicionar • Zoom para enquadrar • Formato 16:9</p>
                  </>
                )}

                {activeTab === 'adjust' && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Filtros</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {Object.entries(PRESET_LABELS).map(([key, label]) => (
                          <button key={key} type="button" onClick={() => {
                            const p = PRESETS[key] || PRESETS.none;
                            setAdjust({ brightness: p.brightness!, contrast: p.contrast!, temperature: p.temperature!, preset: key });
                          }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              adjust.preset === key ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
                            }`}>{label}</button>
                        ))}
                      </div>
                    </div>
                    {([
                      { key: 'brightness' as const, label: '☀️ Brilho', min: -100, max: 100 },
                      { key: 'contrast' as const, label: '◑ Contraste', min: -100, max: 100 },
                      { key: 'temperature' as const, label: '🌡 Temperatura', min: -100, max: 100 },
                    ]).map(({ key, label, min, max }) => (
                      <div key={key}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-600">{label}</span>
                          <span className="text-xs text-gray-400 font-mono">{adjust[key] > 0 ? '+' : ''}{adjust[key]}</span>
                        </div>
                        <input type="range" min={min} max={max} step="1" value={adjust[key]}
                          onChange={e => setAdjust(a => ({ ...a, [key]: parseInt(e.target.value), preset: 'none' }))}
                          className="w-full accent-amber-500" />
                      </div>
                    ))}
                  </>
                )}

                {error && <div className="px-3 py-2 bg-red-50 rounded-lg"><p className="text-xs text-red-600">{error}</p></div>}

                <p className="text-xs text-center text-gray-400">📐 Saída: 1920×1080px • WebP • Otimizado para banner</p>

                <button type="button" onClick={handleConfirm} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-60 transition-colors">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Check className="h-5 w-5" /> Confirmar e Salvar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BannerImageEditor(props: BannerImageEditorProps) {
  return (
    <BannerEditorErrorBoundary>
      <BannerImageEditorInner {...props} />
    </BannerEditorErrorBoundary>
  );
}
