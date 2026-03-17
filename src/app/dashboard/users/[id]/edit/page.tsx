'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'STAFF',
    isActive: true,
  });

  useEffect(() => {
    // Pegar usuário logado
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const { data } = await api.get(`/api/users/${userId}`);
      const user = data.data;
      
      setFormData({
        email: user.email,
        password: '',
        confirmPassword: '',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        role: user.role,
        isActive: user.isActive,
      });
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      alert('❌ Erro ao carregar usuário');
      router.push('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar senha se foi preenchida
    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        alert('❌ As senhas não coincidem\nパスワードが一致しません');
        return;
      }

      if (formData.password.length < 6) {
        alert('❌ A senha deve ter pelo menos 6 caracteres\nパスワードは6文字以上である必要があります');
        return;
      }
    }

    setSaving(true);

    try {
      const payload: any = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
      };

      // Apenas ADMIN pode alterar role e isActive
      if (currentUser?.role === 'ADMIN') {
        payload.role = formData.role;
        payload.isActive = formData.isActive;
      }

      // Só envia senha se foi preenchida
      if (formData.password) {
        payload.password = formData.password;
      }

      await api.put(`/api/users/${userId}`, payload);

      alert('✅ Usuário atualizado com sucesso!\nユーザーが更新されました');
      router.push('/dashboard/users');
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      const message = error.response?.data?.message?.pt || 'Erro ao atualizar usuário';
      alert(`❌ ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (currentUser?.id === userId) {
      alert('❌ Você não pode desativar sua própria conta\n自分のアカウントを無効にすることはできません');
      return;
    }

    if (!confirm('⚠️ Tem certeza que deseja desativar este usuário?\nこのユーザーを無効化してもよろしいですか？')) {
      return;
    }

    try {
      await api.delete(`/api/users/${userId}`);
      alert('✅ Usuário desativado com sucesso!\nユーザーが無効化されました');
      router.push('/dashboard/users');
    } catch (error: any) {
      console.error('Erro ao desativar usuário:', error);
      const message = error.response?.data?.message?.pt || 'Erro ao desativar usuário';
      alert(`❌ ${message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <div className="mt-4 flex items-center gap-4">
          <Link
            href="/dashboard/users"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Usuário</h1>
            <p className="text-gray-500 mt-1">ユーザー編集</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Dados Pessoais / 個人情報
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sobrenome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone / 電話
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Alterar Senha */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Alterar Senha / パスワード変更
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Deixe em branco para manter a senha atual / 現在のパスワードを維持するには空白のままにします
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Permissões - Apenas ADMIN pode editar */}
          {isAdmin && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Permissões / 権限設定
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nível de Acesso / 役割 *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="STAFF">Funcionário / スタッフ</option>
                    <option value="MANAGER">Gerente / マネージャー</option>
                    <option value="ADMIN">Administrador / 管理者</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status da Conta / アカウント状態
                  </label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="true">Ativo / 有効</option>
                    <option value="false">Inativo / 無効</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Salvando...' : 'Salvar Alterações / 変更を保存'}
              </button>

              <Link
                href="/dashboard/users"
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar / キャンセル
              </Link>
            </div>

            {/* Botão de desativar - apenas ADMIN e não pode desativar a si mesmo */}
            {isAdmin && !isOwnProfile && formData.isActive && (
              <button
                type="button"
                onClick={handleDeactivate}
                className="flex items-center gap-2 px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                Desativar Usuário / 無効化
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
