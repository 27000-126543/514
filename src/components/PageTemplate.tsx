import { ReactNode } from 'react';
import { Plus, RefreshCw } from 'lucide-react';

interface PageTemplateProps {
  title: string;
  description?: string;
  children: ReactNode;
  showAddButton?: boolean;
  addButtonText?: string;
  onAdd?: () => void;
  onRefresh?: () => void;
  extraActions?: ReactNode;
}

export const PageTemplate = ({
  title,
  description,
  children,
  showAddButton = false,
  addButtonText = '新增',
  onAdd,
  onRefresh,
  extraActions,
}: PageTemplateProps) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && <p className="text-white/60 mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {extraActions}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
              title="刷新"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          {showAddButton && (
            <button onClick={onAdd} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {addButtonText}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) => {
  return (
    <div className="glass-card p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
        <Icon className="w-8 h-8 text-white/40" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-white/50 max-w-sm mx-auto mb-6">{description}</p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionText}
        </button>
      )}
    </div>
  );
};

interface DataTableProps {
  columns: { key: string; label: string; width?: string; render?: (row: any) => ReactNode }[];
  data: any[];
  loading?: boolean;
  onRowClick?: (row: any) => void;
}

export const DataTable = ({ columns, data, loading, onRowClick }: DataTableProps) => {
  if (loading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-white/50">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="table-header" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`hover:bg-white/5 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="table-cell">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} glass-card p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
  const variantClasses = {
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-300 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    default: 'bg-white/10 text-white/70 border-white/20',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${variantClasses[variant]}`}>
      {children}
    </span>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  suffix?: string;
  color?: string;
}

export const StatCard = ({ label, value, icon: Icon, trend, suffix = '', color = 'from-teal-400 to-teal-600' }: StatCardProps) => {
  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix && <span className="text-sm font-normal text-white/50 ml-1">{suffix}</span>}
          </p>
          {trend !== undefined && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-green-400' : 'text-coral-400'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              <span className="text-white/40">较上月</span>
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};
