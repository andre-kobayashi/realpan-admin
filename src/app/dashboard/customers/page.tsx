'use client';

import { useState, useEffect } from 'react';
import { Search, User, Building, CheckCircle, XCircle, Eye, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import type { Customer, ApiResponse } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get<ApiResponse<Customer[]>>('/api/customers');
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
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

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (customer.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (customer.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = 
      typeFilter === 'ALL' || 
      (typeFilter === 'INDIVIDUAL' && customer.type === 'INDIVIDUAL') ||
      (typeFilter === 'BUSINESS' && customer.type === 'BUSINESS');
    
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'APPROVED' && isApproved(customer)) ||
      (statusFilter === 'PENDING' && !isApproved(customer));
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: customers.length,
    pf: customers.filter(c => c.type === 'INDIVIDUAL').length,
    pj: customers.filter(c => c.type === 'BUSINESS').length,
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
      {/* Header */}
      <div>
        <Breadcrumbs />
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">顧客管理</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-sm text-blue-800 mb-1">
            <User className="h-4 w-4" />
            Pessoa Física
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.pf}</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center gap-2 text-sm text-purple-800 mb-1">
            <Building className="h-4 w-4" />
            Pessoa Jurídica
          </div>
          <div className="text-2xl font-bold text-purple-900">{stats.pj}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-800 mb-1">Aprovados</div>
          <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="text-sm text-yellow-800 mb-1">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email... / 名前またはメールで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Todos os Tipos / すべてのタイプ</option>
            <option value="INDIVIDUAL">Pessoa Física / 個人</option>
            <option value="BUSINESS">Pessoa Jurídica / 法人</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Todos os Status / すべてのステータス</option>
            <option value="APPROVED">Aprovados / 承認済み</option>
            <option value="PENDING">Pendentes / 保留中</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum cliente encontrado
          </h3>
          <p className="text-gray-500">顧客が見つかりません</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Cliente / 顧客
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Tipo / タイプ
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Telefone / 電話
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Cadastro / 登録日
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Ações / アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        customer.type === 'INDIVIDUAL' 
                          ? 'bg-blue-100' 
                          : 'bg-purple-100'
                      }`}>
                        {customer.type === 'INDIVIDUAL' ? (
                          <User className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Building className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {customer.type === 'INDIVIDUAL' 
                            ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                            : customer.companyName || customer.email
                          }
                        </div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                      customer.type === 'INDIVIDUAL'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {customer.type === 'INDIVIDUAL' ? (
                        <>
                          <User className="h-3 w-3" />
                          Pessoa Física
                        </>
                      ) : (
                        <>
                          <Building className="h-3 w-3" />
                          Pessoa Jurídica
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.phone || '-'}
                  </td>
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
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!isApproved(customer) && (
                        <button
                          onClick={() => handleApprove(customer.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
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

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedCustomer.type === 'INDIVIDUAL'
                    ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()
                    : selectedCustomer.companyName || selectedCustomer.email
                  }
                </h2>
                <p className="text-sm text-gray-500 mt-1">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Type */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Tipo de Cliente / 顧客タイプ</h3>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  selectedCustomer.type === 'INDIVIDUAL'
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-purple-50 text-purple-800'
                }`}>
                  {selectedCustomer.type === 'INDIVIDUAL' ? (
                    <>
                      <User className="h-5 w-5" />
                      <span className="font-medium">Pessoa Física / 個人</span>
                    </>
                  ) : (
                    <>
                      <Building className="h-5 w-5" />
                      <span className="font-medium">Pessoa Jurídica / 法人</span>
                    </>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Informações de Contato / 連絡先情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Email</div>
                    <div className="font-medium text-gray-900">{selectedCustomer.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Telefone / 電話</div>
                    <div className="font-medium text-gray-900">{selectedCustomer.phone || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Data de Cadastro / 登録日</div>
                    <div className="font-medium text-gray-900">
                      {new Date(selectedCustomer.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Status de Aprovação / 承認ステータス</h3>
                {isApproved(selectedCustomer) ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Aprovado / 承認済み</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-yellow-600 mb-4">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Aguardando Aprovação / 承認待ち</span>
                    </div>
                    <button
                      onClick={() => handleApprove(selectedCustomer.id)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Aprovar Cliente / 顧客を承認
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
