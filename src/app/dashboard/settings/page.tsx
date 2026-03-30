'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Building, CreditCard, Mail, Bell, Upload, Image as ImageIcon, Landmark, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import api from '@/lib/api';

interface Settings {
  id: string;
  companyKey: string;
  companyName: string;
  companyNameKana?: string;
  companyNameJa?: string;
  nameEn?: string;
  subtitle?: string;
  taxId?: string;
  email: string;
  phone: string;
  fax?: string;
  website?: string;
  postalCode: string;
  prefecture: string;
  city: string;
  ward?: string;
  streetAddress: string;
  building?: string;
  logoUrl?: string;
  hankoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  defaultTaxRate: number;
  minOrderAmount?: number;
  freeShippingThreshold?: number;
  bank1Name?: string;
  bank1Type?: string;
  bank1Number?: string;
  bank1Holder?: string;
  bank2Name?: string;
  bank2Number?: string;
  bank2Holder?: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
  emailNotifications: boolean;
  orderNotifications: boolean;
  customerNotifications: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testEmailMsg, setTestEmailMsg] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const hankoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/api/settings/realpan');
      setSettings(data.data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setLoading(true);
    try {
      await api.put(`/api/settings/${settings.companyKey}`, settings);
      alert('✅ Configurações salvas com sucesso!\n設定が保存されました');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('❌ Erro ao salvar configurações\n設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type: 'logo' | 'hanko', file: File) => {
    if (!settings) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyKey', settings.companyKey);
    try {
      const { data } = await api.post(`/api/settings/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings({
        ...settings,
        [type === 'logo' ? 'logoUrl' : 'hankoUrl']: data.data.url
      });
      alert(`✅ ${type === 'logo' ? 'Logo' : 'Hanko'} atualizado com sucesso!`);
    } catch (error) {
      alert(`❌ Erro ao fazer upload de ${type}`);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTo) {
      alert('Digite um email de destino');
      return;
    }
    setTestEmailStatus('sending');
    try {
      const { data } = await api.post('/api/email/test', { to: testEmailTo });
      if (data.success) {
        setTestEmailStatus('success');
        setTestEmailMsg('Email enviado com sucesso!');
      } else {
        setTestEmailStatus('error');
        setTestEmailMsg(data.error || 'Erro ao enviar');
      }
    } catch (err: any) {
      setTestEmailStatus('error');
      setTestEmailMsg(err.response?.data?.error || 'Erro de conexão');
    }
    setTimeout(() => setTestEmailStatus('idle'), 5000);
  };

  const tabs = [
    { id: 'general', label: 'Geral', labelJa: '一般', icon: Building },
    { id: 'bank', label: 'Dados Bancários', labelJa: '銀行情報', icon: Landmark },
    { id: 'email', label: 'Email', labelJa: 'メール', icon: Mail },
    { id: 'notifications', label: 'Notificações', labelJa: '通知', icon: Bell },
    { id: 'branding', label: 'Marca', labelJa: 'ブランド', icon: ImageIcon },
  ];

  if (loadingData || !settings) {
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
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Configurações / 設定</h1>
          <p className="text-gray-500 mt-1">Gerencie as configurações da empresa e do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-sm">{tab.label}</div>
                    <div className="text-xs opacity-75">{tab.labelJa}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

            {/* ═══ GERAL ═══ */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Informações da Empresa / 会社情報</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                    <input type="text" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">会社名 (日本語)</label>
                    <input type="text" value={settings.companyNameJa || ''} onChange={(e) => setSettings({ ...settings, companyNameJa: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome em Inglês</label>
                    <input type="text" value={settings.nameEn || ''} onChange={(e) => setSettings({ ...settings, nameEn: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="REAL PAN" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle / Slogan</label>
                    <input type="text" value={settings.subtitle || ''} onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="PRODUTOS ALIMENTICIOS CONGELADOS" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TAX ID / 適格請求書番号</label>
                    <input type="text" value={settings.taxId || ''} onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="T5080401023513" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input type="url" value={settings.website || ''} onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="https://realpan.jp" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / 電話</label>
                    <input type="tel" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FAX</label>
                    <input type="tel" value={settings.fax || ''} onChange={(e) => setSettings({ ...settings, fax: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 pt-2">Endereço / 住所</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP / 郵便番号</label>
                    <input type="text" value={settings.postalCode} onChange={(e) => setSettings({ ...settings, postalCode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
                    <input type="text" value={settings.prefecture} onChange={(e) => setSettings({ ...settings, prefecture: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">市区町村</label>
                    <input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">町域</label>
                    <input type="text" value={settings.ward || ''} onChange={(e) => setSettings({ ...settings, ward: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">番地・建物</label>
                    <input type="text" value={settings.streetAddress} onChange={(e) => setSettings({ ...settings, streetAddress: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ BANCO ═══ */}
            {activeTab === 'bank' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Dados Bancários / 銀行情報</h2>
                <p className="text-sm text-gray-500">Informações utilizadas nos documentos fiscais (請求書 / 納品書)</p>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Landmark className="h-4 w-4" /> Banco 1 / 銀行口座 1
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Banco / 銀行名・支店名</label>
                      <input type="text" value={settings.bank1Name || ''} onChange={(e) => setSettings({ ...settings, bank1Name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="浜松磐田信用金庫 可美支店" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo / 種別</label>
                        <input type="text" value={settings.bank1Type || ''} onChange={(e) => setSettings({ ...settings, bank1Type: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="普" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número / 口座番号</label>
                        <input type="text" value={settings.bank1Number || ''} onChange={(e) => setSettings({ ...settings, bank1Number: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="2106589" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titular / 口座名義</label>
                    <input type="text" value={settings.bank1Holder || ''} onChange={(e) => setSettings({ ...settings, bank1Holder: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="リアルパン㈱ 代表取締役 増子利光" />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-green-900 flex items-center gap-2">
                    <Landmark className="h-4 w-4" /> Banco 2 / 銀行口座 2
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Banco / 銀行名</label>
                      <input type="text" value={settings.bank2Name || ''} onChange={(e) => setSettings({ ...settings, bank2Name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="ゆうちょ銀行" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número / 記号番号</label>
                      <input type="text" value={settings.bank2Number || ''} onChange={(e) => setSettings({ ...settings, bank2Number: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="12320 - 61244031" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titular / 口座名義</label>
                    <input type="text" value={settings.bank2Holder || ''} onChange={(e) => setSettings({ ...settings, bank2Holder: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="リアルパン株式会社" />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ EMAIL ═══ */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Configurações de Email / メール設定</h2>
                <p className="text-sm text-gray-500">
                  Emails são enviados via <strong>Resend</strong> (API key configurada no servidor).
                  Aqui você pode definir o nome e email do remetente.
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <strong>Resend conectado</strong> — Domínio: realpan.jp &nbsp;|&nbsp; Limite: 3.000 emails/mês
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Remetente / 送信者名</label>
                    <input type="text" value={settings.smtpFromName || ''} onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Real Pan / リアルパン" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email do Remetente / 送信元メール</label>
                    <input type="email" value={settings.smtpFromEmail || ''} onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="noreply@realpan.jp" />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Send className="h-4 w-4" /> Testar Envio / メール送信テスト
                  </h3>
                  <div className="flex gap-3">
                    <input type="email" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="email@example.com" />
                    <button type="button" onClick={handleTestEmail} disabled={testEmailStatus === 'sending'}
                      className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                      {testEmailStatus === 'sending' ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                      ) : (
                        <><Send className="h-4 w-4" /> Enviar Teste</>
                      )}
                    </button>
                  </div>
                  {testEmailStatus === 'success' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle className="h-4 w-4" /> {testEmailMsg}
                    </div>
                  )}
                  {testEmailStatus === 'error' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      <XCircle className="h-4 w-4" /> {testEmailMsg}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ NOTIFICAÇÕES ═══ */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Notificações / 通知設定</h2>
                <p className="text-sm text-gray-500">Escolha quais notificações automáticas deseja receber</p>

                <div className="space-y-3">
                  {[
                    { key: 'emailNotifications', label: 'Notificações por Email', labelJa: 'メール通知', desc: 'Receber emails sobre atividades importantes' },
                    { key: 'orderNotifications', label: 'Novos Pedidos', labelJa: '新規注文通知', desc: 'Receber notificação quando houver novos pedidos' },
                    { key: 'customerNotifications', label: 'Novos Clientes', labelJa: '新規顧客通知', desc: 'Receber notificação sobre novos cadastros' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="font-medium text-gray-900">{item.label} / {item.labelJa}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                      <input type="checkbox"
                        checked={(settings as any)[item.key]}
                        onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                        className="h-5 w-5 text-red-600 focus:ring-red-500 rounded" />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ BRANDING ═══ */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Logo e Hanko / ロゴ・印鑑</h2>
                <p className="text-sm text-gray-500">Logo e carimbo usados em emails e documentos fiscais</p>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo da Empresa / 会社ロゴ</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-red-400 transition-colors cursor-pointer"
                      onClick={() => logoInputRef.current?.click()}>
                      {settings.logoUrl ? (
                        <img src={`${process.env.NEXT_PUBLIC_API_URL}${settings.logoUrl}`} alt="Logo" className="max-h-32 mx-auto mb-2" />
                      ) : (
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      )}
                      <p className="text-sm text-gray-600">Clique para upload</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('logo', f); }} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hanko / 印鑑</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-red-400 transition-colors cursor-pointer"
                      onClick={() => hankoInputRef.current?.click()}>
                      {settings.hankoUrl ? (
                        <img src={`${process.env.NEXT_PUBLIC_API_URL}${settings.hankoUrl}`} alt="Hanko" className="max-h-32 mx-auto mb-2" />
                      ) : (
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      )}
                      <p className="text-sm text-gray-600">Clique para upload</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                    </div>
                    <input ref={hankoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('hanko', f); }} />
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 mt-6 border-t border-gray-200">
              <button type="button" onClick={handleSave} disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                <Save className="h-5 w-5" />
                {loading ? 'Salvando... / 保存中...' : 'Salvar Alterações / 変更を保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}