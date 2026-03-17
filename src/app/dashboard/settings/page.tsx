'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Building, CreditCard, Mail, Bell, Globe, Upload, Image as ImageIcon } from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import api from '@/lib/api';

interface Settings {
  id: string;
  companyKey: string;
  companyName: string;
  companyNameKana?: string;
  companyNameJa?: string;
  taxId?: string;
  invoiceNumber?: string;
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
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  defaultTaxRate: number;
  minOrderAmount?: number;
  freeShippingThreshold?: number;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  line?: string;
  businessHours?: string;
  stripePublicKey?: string;
  stripeSecretKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
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
      
      // Atualizar URL no estado
      setSettings({
        ...settings,
        [type === 'logo' ? 'logoUrl' : 'hankoUrl']: data.data.url
      });
      
      alert(`✅ ${type === 'logo' ? 'Logo' : 'Hanko'} atualizado com sucesso!`);
    } catch (error) {
      console.error(`Erro ao fazer upload de ${type}:`, error);
      alert(`❌ Erro ao fazer upload de ${type}`);
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', labelJa: '一般', icon: Building },
    { id: 'payment', label: 'Pagamento', labelJa: '支払い', icon: CreditCard },
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
      {/* Header */}
      <div>
        <Breadcrumbs />
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 mt-1">設定管理</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-red-50 text-red-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
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
            {/* Geral */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Informações da Empresa / 会社情報
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会社名 (日本語)
                    </label>
                    <input
                      type="text"
                      value={settings.companyNameJa || ''}
                      onChange={(e) => setSettings({ ...settings, companyNameJa: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TAX ID 
                    </label>
                    <input
                      type="text"
                      value={settings.taxId || ''}
                      onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Number / 適格請求書番号
                    </label>
                    <input
                      type="text"
                      value={settings.invoiceNumber || ''}
                      onChange={(e) => setSettings({ ...settings, invoiceNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="T1234567890123"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de Contato
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone / 電話
                    </label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Endereço / 住所</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CEP / 郵便番号
                      </label>
                      <input
                        type="text"
                        value={settings.postalCode}
                        onChange={(e) => setSettings({ ...settings, postalCode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provincia / 都道府県
                      </label>
                      <input
                        type="text"
                        value={settings.prefecture}
                        onChange={(e) => setSettings({ ...settings, prefecture: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cidade / 市区町村
                      </label>
                      <input
                        type="text"
                        value={settings.city}
                        onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banchi, Complemento / 番地
                      </label>
                      <input
                        type="text"
                        value={settings.streetAddress}
                        onChange={(e) => setSettings({ ...settings, streetAddress: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Branding */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Logo e Hanko
                  </h2>
                  <p className="text-sm text-gray-600">
                    Faça upload do logo e hanko (carimbo) da empresa
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo da Empresa
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-500 transition-colors cursor-pointer"
                         onClick={() => logoInputRef.current?.click()}>
                      {settings.logoUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}${settings.logoUrl}`}
                          alt="Logo"
                          className="max-h-32 mx-auto mb-2"
                        />
                      ) : (
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      )}
                      <p className="text-sm text-gray-600">Clique para fazer upload</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('logo', file);
                      }}
                    />
                  </div>

                  {/* Hanko */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hanko / 印鑑
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-500 transition-colors cursor-pointer"
                         onClick={() => hankoInputRef.current?.click()}>
                      {settings.hankoUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}${settings.hankoUrl}`}
                          alt="Hanko"
                          className="max-h-32 mx-auto mb-2"
                        />
                      ) : (
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      )}
                      <p className="text-sm text-gray-600">Clique para fazer upload</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                    </div>
                    <input
                      ref={hankoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('hanko', file);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Configurações do Stripe
                  </h2>
                  <p className="text-sm text-gray-600">
                    Configure suas chaves de API do Stripe para processar pagamentos
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Importante:</strong> Use as chaves de teste durante o desenvolvimento. 
                    Em produção, substitua pelas chaves reais (live keys).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Publishable Key (Public)
                  </label>
                  <input
                    type="text"
                    value={settings.stripePublicKey || ''}
                    onChange={(e) => setSettings({ ...settings, stripePublicKey: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                    placeholder="pk_test_..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Secret Key
                  </label>
                  <input
                    type="password"
                    value={settings.stripeSecretKey || ''}
                    onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                    placeholder="sk_test_..."
                  />
                </div>
              </div>
            )}

            {/* Email */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Configurações de Email / メール設定
                  </h2>
                  <p className="text-sm text-gray-600">
                    Configure o servidor SMTP para envio de emails
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Servidor SMTP
                    </label>
                    <input
                      type="text"
                      value={settings.smtpHost || ''}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porta
                    </label>
                    <input
                      type="number"
                      value={settings.smtpPort || 587}
                      onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuário SMTP / Email
                  </label>
                  <input
                    type="email"
                    value={settings.smtpUser || ''}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="noreply@realpan.jp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha SMTP
                  </label>
                  <input
                    type="password"
                    value={settings.smtpPassword || ''}
                    onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Remetente
                    </label>
                    <input
                      type="text"
                      value={settings.smtpFromName || ''}
                      onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Real Pan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Remetente
                    </label>
                    <input
                      type="email"
                      value={settings.smtpFromEmail || ''}
                      onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="noreply@realpan.jp"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notificações */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Preferências de Notificações / 通知設定
                  </h2>
                  <p className="text-sm text-gray-600">
                    Escolha quais notificações você deseja receber
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Notificações por Email</div>
                      <div className="text-sm text-gray-600">Receber emails sobre atividades importantes</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Novos Pedidos / 新規注文</div>
                      <div className="text-sm text-gray-600">Receber notificação quando houver novos pedidos</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.orderNotifications}
                      onChange={(e) => setSettings({ ...settings, orderNotifications: e.target.checked })}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Novos Clientes / 新規顧客</div>
                      <div className="text-sm text-gray-600">Receber notificação sobre novos cadastros de clientes</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.customerNotifications}
                      onChange={(e) => setSettings({ ...settings, customerNotifications: e.target.checked })}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {loading ? 'Salvando...' : 'Salvar Alterações / 変更を保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
