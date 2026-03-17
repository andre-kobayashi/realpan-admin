'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const pathMap: Record<string, { pt: string; ja: string }> = {
  dashboard: { pt: 'Dashboard', ja: 'ダッシュボード' },
  products: { pt: 'Produtos', ja: '製品' },
  categories: { pt: 'Categorias', ja: 'カテゴリー' },
  orders: { pt: 'Pedidos', ja: '注文' },
  customers: { pt: 'Clientes', ja: '顧客' },
  settings: { pt: 'Configurações', ja: '設定' },
  kits: { pt: 'Kits Premium', ja: 'キット' },
  finance: { pt: 'Financeiro', ja: '財務管理' },
  pending: { pt: 'Pendentes', ja: '入金待ち' },
  invoices: { pt: 'Faturas PJ', ja: '請求書管理' },
  reports: { pt: 'Relatórios', ja: 'レポート' },
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link href="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      
      {paths.map((path, index) => {
        const href = '/' + paths.slice(0, index + 1).join('/');
        const isLast = index === paths.length - 1;
        const label = pathMap[path] || { pt: path, ja: path };

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-900">
                {label.pt} <span className="text-gray-500">/ {label.ja}</span>
              </span>
            ) : (
              <Link href={href} className="text-gray-500 hover:text-gray-900 transition-colors">
                {label.pt}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
