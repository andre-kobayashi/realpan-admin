'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, FileText, Calendar, Percent, Search, Lock, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

export default function NewCustomerPJPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingZipcode, setLoadingZipcode] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [formData, setFormData] = useState({
    businessType: 'HOUJIN',
    companyName: '',
    companyNameKana: '',
    houjinBangou: '',
    invoiceNumber: '',
    representativeName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneAlt: '',
    password: generatePassword(),
    postalCode: '',
    prefecture: '',
    city: '',
    ward: '',
    streetAddress: '',
    building: '',
    discountRate: '0.15',
    billingClosingDay: '31',
    billingDueDay: '10',
    paymentTerms: '30',
    creditLimit: '',
    businessStatus: 'APPROVED',
    contractNotes: '',
  });

  const handleZipcodeSearch = async () => {
    const cleanZip = formData.postalCode.replace(/[-\s]/g, '');
    if (cleanZip.length < 7) {
      alert('CEP completo (7 dígitos)');
      return;
    }
    setLoadingZipcode(true);
    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
      const data = await response.json();
      if (data.status === 200 && data.results?.length > 0) {
        const r = data.results[0];
        setFormData(prev => ({ ...prev, prefecture: r.address1, city: r.address2, ward: r.address3 || '' }));
      } else {
        alert('CEP não encontrado');
      }
    } catch { alert('Erro ao buscar CEP'); }
    finally { setLoadingZipcode(false); }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password || formData.password.length < 6) {
      alert('Senha provisória deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        type: 'BUSINESS',
        businessType: formData.businessType,
        businessStatus: formData.businessStatus,
        companyName: formData.companyName,
        companyNameKana: formData.companyNameKana,
        houjinBangou: formData.houjinBangou || null,
        invoiceNumber: formData.invoiceNumber || null,
        representativeName: formData.representativeName || null,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        email: formData.email,
        phone: formData.phone,
        phoneAlt: formData.phoneAlt || null,
        password: formData.password,
        postalCode: formData.postalCode || null,
        prefecture: formData.prefecture || null,
        city: formData.city || null,
        ward: formData.ward || null,
        streetAddress: formData.streetAddress || null,
        building: formData.building || null,
        discountRate: parseFloat(formData.discountRate),
        billingClosingDay: parseInt(formData.billingClosingDay),
        billingDueDay: parseInt(formData.billingDueDay),
        paymentTerms: parseInt(formData.paymentTerms),
        creditLimit: formData.creditLimit ? parseInt(formData.creditLimit) : null,
        contractNotes: formData.contractNotes || null,
      };
      await api.post('/api/customers', payload);
      router.push('/dashboard/customers-pj');
    } catch (error) {
      console.error('Erro ao cadastrar cliente PJ:', error);
      alert('Erro ao cadastrar cliente');
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
            <h1 className="text-3xl font-bold text-gray-900">Novo Cliente Pessoa Jurídica</h1>
            <p className="text-gray-500 mt-1">新規法人顧客登録</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Tipo de Negócio */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Tipo de Negócio / 事業形態</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['KOJIN_JIGYOU', 'HOUJIN'].map(bt => (
                  <label key={bt} className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.businessType === bt ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="businessType" value={bt}
                      checked={formData.businessType === bt}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-4 h-4 text-red-600" />
                    <div>
                      <div className="font-medium text-gray-900">{bt === 'KOJIN_JIGYOU' ? '個人事業' : '法人'}</div>
                      <div className="text-sm text-gray-500">{bt === 'KOJIN_JIGYOU' ? 'Kojin Jigyou' : 'Houjin'}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Dados da Empresa */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Dados da Empresa / 会社情報</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Razão Social / 会社名 *</label>
                  <input type="text" required value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ex: Real Pan Ltda" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">会社名 (カナ) *</label>
                  <input type="text" required value={formData.companyNameKana}
                    onChange={(e) => setFormData({ ...formData, companyNameKana: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="例: レアルパン" />
                </div>
              </div>
              {formData.businessType === 'HOUJIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">法人番号 (Houjin Bangou)</label>
                  <input type="text" maxLength={13} value={formData.houjinBangou}
                    onChange={(e) => setFormData({ ...formData, houjinBangou: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    placeholder="0000000000000 (13 dígitos)" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number (適格請求書発行事業者)</label>
                <input type="text" value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  placeholder="T0000000000000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Representante Legal / 代表者名</label>
                <input type="text" value={formData.representativeName}
                  onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Nome do responsável" />
              </div>
            </div>

            {/* Contato + Acesso */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Contato e Acesso / 連絡先・ログイン</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">名 (Nome) *</label>
                  <input type="text" required value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="太郎" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">姓 (Sobrenome) *</label>
                  <input type="text" required value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="山田" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input type="email" required value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="contato@empresa.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                  <input type="tel" required value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="053-000-0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone Alternativo</label>
                <input type="tel" value={formData.phoneAlt}
                  onChange={(e) => setFormData({ ...formData, phoneAlt: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="090-0000-0000" />
              </div>

              {/* ═══ SENHA PROVISÓRIA ═══ */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <label className="text-sm font-semibold text-gray-900">Senha Provisória / 仮パスワード *</label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Esta senha será usada pelo cliente para o primeiro login. Envie por email ou telefone.
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-lg tracking-wider"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setFormData(p => ({ ...p, password: generatePassword() })); setCopiedPassword(false); }}
                    className="px-3 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" title="Gerar nova senha">
                    <RefreshCw className="h-5 w-5 text-gray-600" />
                  </button>
                  <button type="button" onClick={handleCopyPassword}
                    className={`px-3 py-3 border rounded-lg transition-all ${copiedPassword ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                    title="Copiar senha">
                    {copiedPassword ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                {copiedPassword && <p className="text-xs text-green-600 mt-1">Senha copiada!</p>}
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Endereço de Entrega / 配送先</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">〒 CEP (郵便番号)</label>
                  <input type="text" value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    placeholder="000-0000" maxLength={8} />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={handleZipcodeSearch} disabled={loadingZipcode}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loadingZipcode ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Buscando...</> : <><Search className="h-4 w-4" />Buscar</>}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">都道府県</label>
                  <input type="text" value={formData.prefecture} onChange={(e) => setFormData({ ...formData, prefecture: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50" placeholder="静岡県" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">市区町村</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50" placeholder="袋井市" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">町域</label>
                <input type="text" value={formData.ward} onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50" placeholder="神南" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">番地・号</label>
                <input type="text" value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="1-2-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">建物名・部屋番号</label>
                <input type="text" value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="〇〇マンション101号室" />
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações do Contrato / 契約メモ</h2>
              <textarea rows={4} value={formData.contractNotes}
                onChange={(e) => setFormData({ ...formData, contractNotes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Observações internas sobre o contrato..." />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Status / ステータス</h3>
              <div className="space-y-2">
                {[
                  { value: 'APPROVED', label: 'Aprovado / 承認済み', desc: 'Pode comprar imediatamente', color: 'green' },
                  { value: 'PENDING', label: 'Pendente / 保留中', desc: 'Aguardando aprovação', color: 'yellow' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.businessStatus === opt.value ? `border-${opt.color}-500 bg-${opt.color}-50` : 'border-gray-200'
                  }`}>
                    <input type="radio" name="businessStatus" value={opt.value}
                      checked={formData.businessStatus === opt.value}
                      onChange={(e) => setFormData({ ...formData, businessStatus: e.target.value })}
                      className={`w-4 h-4 text-${opt.color}-600`} />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Taxa de Desconto */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Percent className="h-5 w-5 text-green-700" />
                <h3 className="font-semibold text-green-900">Taxa de Desconto</h3>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Desconto</span>
                <span className="text-2xl font-bold text-green-700">{(parseFloat(formData.discountRate) * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="0.30" step="0.05" value={formData.discountRate}
                onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0%</span><span>15%</span><span>30%</span></div>
              <div className="text-xs text-gray-600 mt-3 space-y-1">
                <div className="flex justify-between"><span>5%:</span><span>Básico</span></div>
                <div className="flex justify-between"><span>10%:</span><span>Bronze</span></div>
                <div className="flex justify-between"><span>15%:</span><span>Prata ⭐</span></div>
                <div className="flex justify-between"><span>20%:</span><span>Ouro 🏆</span></div>
              </div>
            </div>

            {/* Faturamento */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Faturamento / 請求</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dia de Fechamento / 締め日</label>
                  <select value={formData.billingClosingDay} onChange={(e) => setFormData({ ...formData, billingClosingDay: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="31">Fim do Mês (31)</option>
                    <option value="5">Dia 5</option><option value="10">Dia 10</option>
                    <option value="15">Dia 15</option><option value="20">Dia 20</option><option value="25">Dia 25</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dia de Vencimento / 支払期限</label>
                  <select value={formData.billingDueDay} onChange={(e) => setFormData({ ...formData, billingDueDay: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="10">Dia 10 do mês seguinte</option><option value="15">Dia 15</option>
                    <option value="20">Dia 20</option><option value="25">Dia 25</option><option value="30">Dia 30</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prazo de Pagamento</label>
                  <select value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="15">15 dias</option><option value="30">30 dias</option>
                    <option value="45">45 dias</option><option value="60">60 dias</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Limite de Crédito */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Limite de Crédito / 与信限度額</h3>
              </div>
              <input type="number" min="0" step="10000" value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="100000" />
              <p className="text-xs text-gray-500 mt-1">Opcional — em YEN</p>
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <button type="submit" disabled={loading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium">
                {loading ? 'Cadastrando...' : 'Cadastrar Cliente PJ'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Lembrete:</strong> Após cadastrar, envie ao cliente o email e a senha provisória para que ele possa fazer login e realizar pedidos.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}