'use client';

import React, { useState, useRef, useCallback, useEffect, Component } from 'react';
import {
  Upload, X, ZoomIn, ZoomOut, RotateCw, Check, ImageIcon,
  Move, Sun, Loader2, Maximize2
} from 'lucide-react';
import api from '@/lib/api';

// ══════════════════════════════════════════════════════════════════════════════
// ErrorBoundary interno — captura erros do editor sem derrubar a página
// ══════════════════════════════════════════════════════════════════════════════
interface EBProps { children: React.ReactNode; onError?: () => void }
interface EBState { hasError: boolean; error: string }

class ImageEditorErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error) {
    console.error('[ImageUpload ErrorBoundary]', error);
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-red-600 mb-2">Erro no editor de imagem</p>
          <p className="text-xs text-gray-500 mb-4">{this.state.error}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: '' })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ══════════════════════════════════════════════════════════════════════════════

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

interface CropState {
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

interface AdjustState {
  brightness: number;
  contrast: number;
  temperature: number;
  preset: string;
}

type EditorTab = 'crop' | 'adjust';

const OUTPUT_SIZE = 800;
const PREVIEW_MAX = 800;

const PRESETS: Record<string, Partial<AdjustState>> = {
  none:    { brightness: 0,   contrast: 0,   temperature: 0   },
  natural: { brightness: 5,   contrast: 10,  temperature: 5   },
  vibrant: { brightness: 10,  contrast: 25,  temperature: 15  },
  cool:    { brightness: 5,   contrast: 10,  temperature: -30 },
  vintage: { brightness: -10, contrast: -15, temperature: 25  },
  warm:    { brightness: 8,   contrast: 5,   temperature: 40  },
};

const PRESET_LABELS: Record<string, string> = {
  none:    '⬜ Original',
  natural: '🌿 Natural',
  vibrant: '🌈 Vibrante',
  cool:    '❄️ Frio',
  vintage: '📷 Vintage',
  warm:    '🔆 Quente',
};

function ImageUploadInner({ images, onChange, maxImages = 10 }: ImageUploadProps) {
  const [sourceUrl, setSourceUrl]     = useState<string | null>(null);
  const [imgNatural, setImgNatural]   = useState({ w: 1, h: 1 });
  const [activeTab, setActiveTab]     = useState<EditorTab>('crop');
  const [uploading, setUploading]     = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  const [dragStart, setDragStart]     = useState({ x: 0, y: 0 });
  const [error, setError]             = useState<string | null>(null);
  const [isOpen, setIsOpen]           = useState(false);

  const [crop, setCrop] = useState<CropState>({
    scale: 1, rotation: 0, offsetX: 0, offsetY: 0,
  });

  const [adjust, setAdjust] = useState<AdjustState>({
    brightness: 0, contrast: 0, temperature: 0, preset: 'none',
  });

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const previewRef    = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  // Track if sourceUrl is still valid (not revoked)
  const sourceUrlValid = useRef(false);

  // ── Abrir editor ──────────────────────────────────────────────────────
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
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Não foi possível carregar a imagem.');
    };
    img.src = url;
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const closeEditor = useCallback(() => {
    if (uploading) return;
    if (sourceUrl && sourceUrlValid.current) {
      try { URL.revokeObjectURL(sourceUrl); } catch { /* ok */ }
    }
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

  // ── Drag no crop ──────────────────────────────────────────────────────
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

  const rotate = useCallback(() => {
    setCrop(c => ({ ...c, rotation: (c.rotation + 90) % 360, offsetX: 0, offsetY: 0 }));
  }, []);

  const setScaleVal = useCallback((v: number) => {
    setCrop(c => ({ ...c, scale: Math.max(0.5, Math.min(4, v)) }));
  }, []);

  const resetCrop = useCallback(() => {
    setCrop({ scale: 1, rotation: 0, offsetX: 0, offsetY: 0 });
  }, []);

  // ── Aplicar preset ────────────────────────────────────────────────────
  const applyPreset = useCallback((name: string) => {
    const p = PRESETS[name] || PRESETS.none;
    setAdjust({ brightness: p.brightness!, contrast: p.contrast!, temperature: p.temperature!, preset: name });
  }, []);

  // ── Preview de ajustes de cor ─────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'adjust') return;
    if (!sourceUrl || !sourceUrlValid.current) return;

    // Double RAF to ensure canvas is fully mounted after tab switch
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = previewRef.current;
        if (!canvas) {
          console.warn('[ImageUpload] previewRef not available after double RAF');
          return;
        }

        const img = new window.Image();
        img.onload = () => {
          try {
            // Verify canvas is still in DOM
            if (!previewRef.current || !document.body.contains(previewRef.current)) return;
            // Verify sourceUrl hasn't been revoked
            if (!sourceUrlValid.current) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const scale = Math.min(1, PREVIEW_MAX / Math.max(img.naturalWidth, img.naturalHeight));
            const pw = Math.round(img.naturalWidth * scale);
            const ph = Math.round(img.naturalHeight * scale);

            canvas.width  = pw;
            canvas.height = ph;
            ctx.drawImage(img, 0, 0, pw, ph);
            applyColorAdjustments(ctx, pw, ph, adjust);
          } catch (err) {
            console.warn('[ImageUpload] Color adjustment preview error:', err);
          }
        };
        img.onerror = () => {
          console.warn('[ImageUpload] Failed to load image for preview');
        };
        img.src = sourceUrl;
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [adjust, activeTab, sourceUrl]);

  // ── Info da imagem ────────────────────────────────────────────────────
  const isLandscape = imgNatural.w >= imgNatural.h;
  const aspectRatio = imgNatural.w / imgNatural.h;

  // ── Render final (crop → 800×800) ─────────────────────────────────────
  const renderFinal = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!sourceUrl || !sourceUrlValid.current || !canvasRef.current) {
        return reject('no source');
      }
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = canvasRef.current!;
          const ctx    = canvas.getContext('2d')!;
          canvas.width  = OUTPUT_SIZE;
          canvas.height = OUTPUT_SIZE;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

          ctx.save();
          ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

          const rad  = (crop.rotation * Math.PI) / 180;
          const cosA = Math.cos(rad), sinA = Math.sin(rad);
          const ox   = crop.offsetX * cosA + crop.offsetY * sinA;
          const oy   = -crop.offsetX * sinA + crop.offsetY * cosA;
          ctx.translate(ox, oy);
          ctx.rotate(rad);

          const containScale = Math.min(OUTPUT_SIZE / img.naturalWidth, OUTPUT_SIZE / img.naturalHeight);
          const finalScale   = containScale * crop.scale;
          ctx.scale(finalScale, finalScale);

          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          ctx.restore();

          applyColorAdjustments(ctx, OUTPUT_SIZE, OUTPUT_SIZE, adjust);

          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject('toBlob null');
          }, 'image/webp', 0.88);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject('image load failed');
      img.src = sourceUrl;
    });
  }, [sourceUrl, crop, adjust]);

  // ── Upload ────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setUploading(true); setError(null);
    try {
      const blob     = await renderFinal();
      const formData = new FormData();
      formData.append('images', blob, 'photo.webp');
      const { data } = await api.post('/api/upload/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls: string[] = data.data?.urls || [];
      if (!urls.length) throw new Error('No URLs');
      onChange([...images, ...urls]);
      closeEditor();
    } catch (err) {
      console.error('[upload]', err);
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, [renderFinal, images, onChange, closeEditor]);

  // ── Remover imagem salva ──────────────────────────────────────────────
  const handleRemove = useCallback(async (url: string) => {
    if (!confirm('Remover esta imagem?')) return;
    try { await api.delete('/api/upload/images', { data: { url } }); } catch { /* ignore */ }
    onChange(images.filter(u => u !== url));
  }, [images, onChange]);

  const canAddMore = images.length < maxImages;

  // ── Preview style ─────────────────────────────────────────────────────
  const cropImgStyle: React.CSSProperties = {
    transform: `translate(${crop.offsetX}px, ${crop.offsetY}px) rotate(${crop.rotation}deg) scale(${crop.scale})`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.15s ease',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  return (
    <div className="space-y-4">

      {/* ── Modal editor ───────────────────────────────────────────── */}
      {isOpen && sourceUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) closeEditor(); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
            style={{ maxHeight: '96vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
              <p className="font-semibold text-sm text-gray-900">Editor de foto / 写真編集</p>
              <button type="button" onClick={closeEditor} disabled={uploading}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-40">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b flex-shrink-0">
              {([
                { id: 'crop' as EditorTab,   icon: <Move className="h-4 w-4" />,  label: 'Crop'    },
                { id: 'adjust' as EditorTab, icon: <Sun className="h-4 w-4" />,   label: 'Ajustes' },
              ]).map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Área de preview quadrada */}
            <div
              ref={containerRef}
              className="relative bg-gray-900 flex-shrink-0 overflow-hidden select-none"
              style={{
                width: '100%',
                paddingBottom: '100%',
                cursor: activeTab === 'crop' ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {/* BOTH always mounted — toggle via display */}
                <canvas
                  ref={previewRef}
                  className="w-full h-full"
                  style={{
                    objectFit: 'contain',
                    display: activeTab === 'adjust' ? 'block' : 'none',
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourceUrl}
                  alt="preview"
                  draggable={false}
                  style={{
                    ...cropImgStyle,
                    display: activeTab === 'crop' ? 'block' : 'none',
                  }}
                />
              </div>

              {/* Grade 3×3 */}
              {activeTab === 'crop' && (
                <>
                  <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),' +
                      'linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '33.33% 33.33%',
                  }} />
                  <div className="absolute inset-0 border-2 border-white/30 pointer-events-none rounded-sm" />
                </>
              )}

              {/* Badge dimensões */}
              {activeTab === 'crop' && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  <Maximize2 className="h-3 w-3" />
                  {imgNatural.w}×{imgNatural.h}
                </div>
              )}
            </div>

            {/* Conteúdo da aba */}
            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="px-4 py-3 space-y-3">

                {/* ── ABA: CROP ──────────────────────────────────── */}
                {activeTab === 'crop' && (
                  <>
                    {Math.abs(aspectRatio - 1) > 0.15 && crop.scale === 1 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-700">
                          💡 Foto {isLandscape ? 'paisagem' : 'retrato'} ({imgNatural.w}×{imgNatural.h}).
                          Use zoom e arraste para enquadrar no corte 1:1.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <ZoomOut className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <input type="range" min="50" max="400" step="5"
                        value={Math.round(crop.scale * 100)}
                        onChange={e => setScaleVal(parseInt(e.target.value) / 100)}
                        className="flex-1 accent-red-600" />
                      <ZoomIn className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 w-9 text-right">{Math.round(crop.scale * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={rotate}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        <RotateCw className="h-4 w-4" /> Girar 90°
                      </button>
                      <button type="button" onClick={resetCrop}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        <Move className="h-4 w-4" /> Reset
                      </button>
                    </div>
                    <p className="text-xs text-center text-gray-400">
                      Arraste para reposicionar • Zoom para enquadrar
                    </p>
                  </>
                )}

                {/* ── ABA: AJUSTES ───────────────────────────────── */}
                {activeTab === 'adjust' && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Filtros</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {Object.entries(PRESET_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => applyPreset(key)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              adjust.preset === key
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {([
                      { key: 'brightness' as const,  label: '☀️ Brilho',     min: -100, max: 100 },
                      { key: 'contrast' as const,    label: '◑ Contraste',   min: -100, max: 100 },
                      { key: 'temperature' as const, label: '🌡 Temperatura', min: -100, max: 100 },
                    ]).map(({ key, label, min, max }) => (
                      <div key={key}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-600">{label}</span>
                          <span className="text-xs text-gray-400 font-mono">
                            {adjust[key] > 0 ? '+' : ''}{adjust[key]}
                          </span>
                        </div>
                        <input
                          type="range" min={min} max={max} step="1"
                          value={adjust[key]}
                          onChange={e => setAdjust(a => ({ ...a, [key]: parseInt(e.target.value), preset: 'none' }))}
                          className="w-full accent-red-600"
                        />
                        <div className="flex justify-between text-xs text-gray-300 mt-0.5">
                          <span>{key === 'temperature' ? '❄️ Frio' : 'Menos'}</span>
                          <span>{key === 'temperature' ? '🔆 Quente' : 'Mais'}</span>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setAdjust({ brightness: 0, contrast: 0, temperature: 0, preset: 'none' })}
                      className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
                    >
                      Resetar ajustes
                    </button>
                  </>
                )}

                {error && (
                  <div className="px-3 py-2 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <p className="text-xs text-center text-gray-400">
                  📱 Saída: 800×800px • WebP • Otimizado para e-commerce
                </p>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Check className="h-5 w-5" /> Confirmar e Enviar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" width={OUTPUT_SIZE} height={OUTPUT_SIZE} />

      {/* ── Grid de imagens ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {images.map((url, idx) => (
          <div key={url} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Imagem ${idx + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button type="button" onClick={() => handleRemove(url)}
                className="p-2 bg-white/90 rounded-full text-red-600 hover:bg-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {idx === 0 && (
              <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">#1</div>
            )}
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
              dragOver ? 'border-red-400 bg-red-50 scale-105' : 'border-gray-300 bg-gray-50 hover:border-red-400 hover:bg-red-50'
            }`}
          >
            <div className={`p-2 rounded-full ${dragOver ? 'bg-red-100' : 'bg-gray-100'}`}>
              <Upload className={`h-5 w-5 ${dragOver ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
            <span className="text-xs text-gray-400 text-center leading-tight px-1">Adicionar foto</span>
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={e => { handleFileSelect(e.target.files); (e.target as HTMLInputElement).value = ''; }} />

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          {images.length}/{maxImages} • A primeira é a principal
        </span>
        <span>JPG, PNG, WebP • Max 5MB</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Export wrapped with ErrorBoundary
// ══════════════════════════════════════════════════════════════════════════════
export default function ImageUpload(props: ImageUploadProps) {
  return (
    <ImageEditorErrorBoundary>
      <ImageUploadInner {...props} />
    </ImageEditorErrorBoundary>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Color adjustments — fully wrapped in try-catch
// ══════════════════════════════════════════════════════════════════════════════
function applyColorAdjustments(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  adj: AdjustState
) {
  if (adj.brightness === 0 && adj.contrast === 0 && adj.temperature === 0) return;

  try {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d         = imageData.data;

    const brightness  = adj.brightness * 2.55;
    const contrast    = (adj.contrast + 100) / 100;
    const tempR       = adj.temperature > 0 ? adj.temperature * 0.8 : 0;
    const tempB       = adj.temperature < 0 ? -adj.temperature * 0.8 : 0;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];

      r += brightness; g += brightness; b += brightness;
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
      r += tempR; b += tempB;

      d[i]     = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.warn('[ImageUpload] applyColorAdjustments failed:', err);
  }
}