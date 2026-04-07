'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building, Eye, XCircle, CheckCircle, UserCheck, Edit, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import type { Customer, ApiResponse } from '@/types';

export default function CustomersPJPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get<ApiResponse<Customer[]>>('/api/customers?type=PJ');
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes PJ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (customerId: string) => {
    try {
      await api.patch(`/api/customers/${customerId}/approve`);
      fetchCustomers();
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Erro ao aprovar cliente:', error);
    }
  };

  const isApproved = (customer: Customer) => {
    return customer.businessStatus === 'APPROVED' || customer.approvedAt !== null;
  };

  const hasCompleteAddress = (customer: Customer) => {
    return !!(customer.postalCode && customer.prefecture && customer.city && customer.streetAddress);
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      (customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'APPROVED' && isApproved(customer)) ||
      (statusFilter === 'PENDING' && !isApproved(customer));
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: customers.length,
    approved: customers.filter(c => isApproved(c)).length,
    pending: customers.filter(c => !isApproved(c)).length,
  };

  if (loading) {
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
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes Atacado</h1>
            <p className="text-gray-500 mt-1">法人顧客管理</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/customers-pj/new')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Novo Cliente PJ / 新規法人顧客
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-1">Total de Clientes Atacado</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-6">
          <div className="text-sm text-green-800 mb-1">Aprovados / 承認済み</div>
          <div className="text-3xl font-bold text-green-900">{stats.approved}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
          <div className="text-sm text-yellow-800 mb-1">Pendentes / 保留中</div>
          <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por razão social ou email... / 会社名またはメールで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Todos os Status / すべてのステータス</option>
            <option value="APPROVED">Aprovados / 承認済み</option>
            <option value="PENDING">Aguardando Aprovação / 承認待ち</option>
          </select>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cliente encontrado</h3>
          <p className="text-gray-500 mb-6">法人顧客が見つかりません</p>
          <button
            onClick={() => router.push('/dashboard/customers-pj/new')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Cadastrar Primeiro Cliente Atacado / 最初の法人顧客を登録
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Empresa / 会社</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contato / 連絡先</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cadastro / 登録日</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Ações / アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {customer.companyName || customer.email}
                        </div>
                        {customer.companyNameKana && (
                          <div className="text-sm text-gray-500">{customer.companyNameKana}</div>
                        )}
                        {!hasCompleteAddress(customer) && (
                          <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            Endereço incompleto
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    {isApproved(customer) ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        Aprovado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        <XCircle className="h-3 w-3" />
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/customers-pj/${customer.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/customers-pj/${customer.id}/edit`)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {!isApproved(customer) && (
                        <button
                          onClick={() => handleApprove(customer.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Aprovar"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCustomer.companyName || selectedCustomer.email}
              </h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Alerta de endereço */}
              {!hasCompleteAddress(selectedCustomer) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-orange-900">Endereço Incompleto</div>
                    <div className="text-sm text-orange-700 mt-1">
                      Este cliente não poderá fazer pedidos até que o endereço esteja completo.
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/customers-pj/${selectedCustomer.id}/edit`)}
                      className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                    >
                      Completar Endereço
                    </button>
                  </div>
                </div>
              )}

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600 mb-1">Email</div>
                  <div className="font-medium text-gray-900">{selectedCustomer.email}</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600 mb-1">Telefone / 電話</div>
                  <div className="font-medium text-gray-900">{selectedCustomer.phone || '-'}</div>
                </div>

                {selectedCustomer.discountRate && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs text-green-700 mb-1">Taxa de Desconto</div>
                    <div className="text-2xl font-bold text-green-900">
                      {(selectedCustomer.discountRate * 100).toFixed(0)}%
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600 mb-1">Cadastro / 登録日</div>
                  <div className="font-medium text-gray-900">
                    {new Date(selectedCustomer.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-900 mb-3">Endereço de Entrega</div>
                {hasCompleteAddress(selectedCustomer) ? (
                  <div className="space-y-2 text-sm">
                    <div>〒 {selectedCustomer.postalCode}</div>
                    <div>{selectedCustomer.prefecture} {selectedCustomer.city} {selectedCustomer.ward}</div>
                    <div>{selectedCustomer.streetAddress}</div>
                    {selectedCustomer.building && <div>{selectedCustomer.building}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-orange-600">⚠️ Endereço não cadastrado</div>
                )}
              </div>

              {!isApproved(selectedCustomer) && (
                <button
                  onClick={() => handleApprove(selectedCustomer.id)}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Aprovar Cliente Atacado / 法人顧客を承認
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
