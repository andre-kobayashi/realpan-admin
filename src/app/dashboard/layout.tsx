'use client';
import type { User as UserType } from '@/types';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Gift,
  FolderTree,
  ShoppingCart,
  User,
  Building,
  Settings,
  Bell,
  Search,
  LogOut,
  DollarSign,
  ChevronDown,
  ChevronRight,
  LucideIcon,
  Truck,
  UserCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface SubMenuItem {
  icon: LucideIcon;
  label: string;
  labelJa: string;
  href: string;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  labelJa: string;
  href?: string;
  submenu?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', labelJa: 'ダッシュボード', href: '/dashboard' },
  { icon: Package, label: 'Produtos', labelJa: '製品', href: '/dashboard/products' },
  { icon: Gift, label: 'Kits Premium', labelJa: 'キット', href: '/dashboard/kits' },
  { icon: DollarSign, label: 'Financeiro', labelJa: '財務管理', href: '/dashboard/finance' },
  { icon: ShoppingCart, label: 'Pedidos PF', labelJa: '個人注文', href: '/dashboard/orders-pf' },
  { icon: Building, label: 'Pedidos PJ', labelJa: '法人注文', href: '/dashboard/orders-pj' },
  { icon: FolderTree, label: 'Categorias', labelJa: 'カテゴリー', href: '/dashboard/categories' },
  { icon: User, label: 'Clientes PF', labelJa: '個人顧客', href: '/dashboard/customers-pf' },
  { icon: Building, label: 'Clientes PJ', labelJa: '法人顧客', href: '/dashboard/customers-pj' },
  { 
    icon: Settings, 
    label: 'Configurações', 
    labelJa: '設定',
    submenu: [
      { icon: UserCircle, label: 'Usuários', labelJa: 'ユーザー', href: '/dashboard/users' },
      { icon: DollarSign, label: 'Impostos', labelJa: '税金', href: '/dashboard/taxes' },
      { icon: Truck, label: 'Transportadoras', labelJa: '運送会社', href: '/dashboard/carriers' },
      { icon: Settings, label: 'Geral', labelJa: '一般', href: '/dashboard/settings' },
    ]
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<Partial<UserType>>({ firstName: '', lastName: '' });
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Auto-abrir submenu se estiver em uma de suas páginas
    menuItems.forEach((item, index) => {
      if (item.submenu) {
        const isInSubmenu = item.submenu.some(sub => pathname.startsWith(sub.href));
        if (isInSubmenu) {
          setOpenSubmenus(prev => ({ ...prev, [index]: true }));
        }
      }
    });
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const toggleSubmenu = (index: number) => {
    setOpenSubmenus(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 hidden lg:block z-40 overflow-y-auto">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-700 px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">RP</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Real Pan</h1>
              <p className="text-gray-400 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isSubmenuOpen = openSubmenus[index];
            const isActive = pathname === item.href;
            const isInSubmenu = hasSubmenu && item.submenu!.some(sub => pathname.startsWith(sub.href));

            if (hasSubmenu) {
              return (
                <div key={index}>
                  {/* Menu principal com submenu */}
                  <button
                    onClick={() => toggleSubmenu(index)}
                    className={`
                      group w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${isInSubmenu
                        ? 'bg-gray-700/50 text-white'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isInSubmenu ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.labelJa}</div>
                    </div>
                    {isSubmenuOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Submenu */}
                  {isSubmenuOpen && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.submenu!.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname.startsWith(subItem.href);

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`
                              group flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                              ${isSubActive
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50'
                                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                              }
                            `}
                          >
                            <SubIcon className={`h-4 w-4 ${isSubActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{subItem.label}</div>
                              <div className="text-xs opacity-75">{subItem.labelJa}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Menu normal sem submenu
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs opacity-75">{item.labelJa}</div>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-gray-200 z-30">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar... / 検索..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4 ml-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm hidden md:block">Sair</span>
            </button>

            <div className="h-8 w-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="lg:ml-64 pt-20 px-8 pb-8">
        {children}
      </main>
    </div>
  );
}
