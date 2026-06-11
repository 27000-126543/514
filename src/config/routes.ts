import type { UserRole } from '../types.js';
import {
  LayoutDashboard,
  Fish,
  Droplets,
  AlertTriangle,
  Utensils,
  FishSymbol,
  ShoppingCart,
  Users,
  MapPin,
  Settings,
  BarChart3,
  MessageSquare,
} from 'lucide-react';

export interface RouteConfig {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  showInMenu: boolean;
}

export const routeConfig: RouteConfig[] = [
  {
    path: '/dashboard',
    label: '数据概览',
    icon: LayoutDashboard,
    roles: ['admin', 'farmer', 'technician', 'finance'],
    showInMenu: true,
  },
  {
    path: '/zones',
    label: '养殖区管理',
    icon: MapPin,
    roles: ['admin'],
    showInMenu: true,
  },
  {
    path: '/fry-release',
    label: '鱼苗投放',
    icon: Fish,
    roles: ['farmer', 'admin'],
    showInMenu: true,
  },
  {
    path: '/water-quality',
    label: '水质监测',
    icon: Droplets,
    roles: ['technician', 'admin'],
    showInMenu: true,
  },
  {
    path: '/warnings',
    label: '预警管理',
    icon: AlertTriangle,
    roles: ['technician', 'admin', 'farmer'],
    showInMenu: true,
  },
  {
    path: '/feeding',
    label: '智能投喂',
    icon: Utensils,
    roles: ['farmer', 'admin'],
    showInMenu: true,
  },
  {
    path: '/harvest',
    label: '捕捞管理',
    icon: FishSymbol,
    roles: ['farmer', 'admin'],
    showInMenu: true,
  },
  {
    path: '/traceability',
    label: '产品溯源',
    icon: ShoppingCart,
    roles: ['farmer', 'admin'],
    showInMenu: true,
  },
  {
    path: '/finance',
    label: '财务报表',
    icon: BarChart3,
    roles: ['finance', 'admin'],
    showInMenu: true,
  },
  {
    path: '/messages',
    label: '消息中心',
    icon: MessageSquare,
    roles: ['admin', 'farmer', 'technician', 'finance'],
    showInMenu: true,
  },
  {
    path: '/users',
    label: '用户管理',
    icon: Users,
    roles: ['admin'],
    showInMenu: true,
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: Settings,
    roles: ['admin'],
    showInMenu: true,
  },
];

export const getRoutesForRole = (role: UserRole): RouteConfig[] => {
  return routeConfig.filter((route) => route.roles.includes(role) && route.showInMenu);
};

export const hasAccess = (path: string, role: UserRole): boolean => {
  const route = routeConfig.find((r) => path.startsWith(r.path));
  if (!route) return false;
  return route.roles.includes(role);
};
