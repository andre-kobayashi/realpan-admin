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
Image as LucideImage, FileText, Newspaper, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

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
  { icon: ShoppingCart, label: 'Pedidos Varejo', labelJa: '個人注文', href: '/dashboard/orders-pf' },
  { icon: Building, label: 'Pedidos Atacado', labelJa: '法人注文', href: '/dashboard/orders-pj' },
  { icon: FolderTree, label: 'Categorias', labelJa: 'カテゴリー', href: '/dashboard/categories' },
  {
    icon: Users,
    label: 'Clientes',
    labelJa: '顧客',
    submenu: [
      { icon: User, label: 'Varejo', labelJa: '個人', href: '/dashboard/customers-pf' },
      { icon: Building, label: 'Atacado', labelJa: '法人', href: '/dashboard/customers-pj' },
    ]
  },
  {
    icon: FileText,
    label: 'Páginas',
    labelJa: 'ページ',
    submenu: [
      { icon: LucideImage, label: 'Banners', labelJa: 'バナー', href: '/dashboard/banners' },
      { icon: Newspaper, label: 'Blog', labelJa: 'ブログ', href: '/dashboard/blog' },
    ]
  },
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingPF, setPendingPF] = useState(0);
  const [pendingPJ, setPendingPJ] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/api/notifications?limit=10');
        if (data.success) {
          setNotifications(data.data || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {}
      // Fetch pending order counts
      try {
        const { data: pfData } = await api.get('/api/orders?status=PENDING&customerType=INDIVIDUAL&limit=1');
        setPendingPF(pfData.pagination?.total || pfData.data?.length || 0);
      } catch {}
      try {
        const { data: pjData } = await api.get('/api/orders?status=PENDING&customerType=CORPORATE&limit=1');
        setPendingPJ(pjData.pagination?.total || pjData.data?.length || 0);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

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
                {item.href === '/dashboard/orders-pf' && pendingPF > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">{pendingPF}</span>
                )}
                {item.href === '/dashboard/orders-pj' && pendingPJ > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">{pendingPJ}</span>
                )}
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
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                      <span className="font-semibold text-sm text-gray-800">Notificações</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-blue-500 hover:text-blue-700">Marcar todas como lidas</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">Nenhuma notificação</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id}
                            onClick={() => { markAsRead(n.id); if (n.link) window.location.href = n.link; setShowNotifications(false); }}
                            className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-lg flex-shrink-0">{n.type === 'order' ? '📦' : n.type === 'customer' ? '👤' : 'ℹ️'}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!n.read ? 'font-semibold text-gray-800' : 'text-gray-600'} truncate`}>{n.titlePt}</p>
                                <p className="text-xs text-gray-400 truncate">{n.message}</p>
                                <p className="text-xs text-gray-300 mt-1">
                                  {new Date(n.createdAt).toLocaleDateString('pt-BR')} {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
