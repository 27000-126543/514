import { useEffect, useState } from 'react';
import { PageTemplate, DataTable, Badge, Modal, EmptyState } from '../components/PageTemplate.js';
import { Eye, Edit, Trash2, Plus, Download, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
export { PageTemplate, DataTable, Badge, Modal, EmptyState, StatCard } from "../components/PageTemplate.js";

interface FeaturePageProps {
  title: string;
  description: string;
  addButtonText: string;
  columns: { key: string; label: string; width?: string; render?: (row: any) => React.ReactNode }[];
  fetchData: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  onAdd?: () => void;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  extraFilters?: React.ReactNode;
  extraActions?: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export const FeaturePage = ({
  title,
  description,
  addButtonText,
  columns,
  fetchData,
  onAdd,
  onView,
  onEdit,
  onDelete,
  extraFilters,
  extraActions,
  onRefresh,
}: FeaturePageProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const response = await fetchData();
    if (response.success && response.data) {
      setData(response.data);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const actionColumns = {
    key: 'actions',
    label: '操作',
    width: '150px',
    render: (row: any) => (
      <div className="flex items-center gap-2">
        {onView && (
          <button
            onClick={() => {
              setSelectedItem(row);
              setViewModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors"
            title="查看"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(row)}
            className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(row)}
            className="p-1.5 rounded-lg bg-coral-500/20 text-coral-300 hover:bg-coral-500/30 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    ),
  };

  const allColumns = onView || onEdit || onDelete ? [...columns, actionColumns] : columns;

  return (
    <PageTemplate
      title={title}
      description={description}
      showAddButton={!!onAdd}
      addButtonText={addButtonText}
      onAdd={onAdd}
      onRefresh={handleRefresh}
      extraActions={
        <>
          {extraActions}
          {extraFilters}
        </>
      }
    >
      {extraFilters && <div className="mb-4">{extraFilters}</div>}
      
      <DataTable
        columns={allColumns}
        data={data}
        loading={loading}
        onRowClick={onView ? (row) => {
          setSelectedItem(row);
          setViewModalOpen(true);
        } : undefined}
      />

      {selectedItem && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title="详情"
          size="lg"
        >
          <div className="space-y-4">
            {Object.entries(selectedItem).map(([key, value]) => {
              if (key === 'id') return null;
              return (
                <div key={key} className="grid grid-cols-3 gap-4">
                  <span className="text-white/60">{key}:</span>
                  <span className="col-span-2 text-white">
                    {typeof value === 'boolean' ? (value ? '是' : '否') : String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </PageTemplate>
  );
};

export const StatusBadge = ({ status, children }: { status: string; children?: React.ReactNode }) => {
  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; icon: React.ElementType }> = {
    normal: { label: '正常', variant: 'success', icon: CheckCircle },
    active: { label: '正常', variant: 'success', icon: CheckCircle },
    warning: { label: '预警', variant: 'warning', icon: AlertTriangle },
    pending: { label: '待处理', variant: 'warning', icon: Clock },
    processing: { label: '处理中', variant: 'info', icon: Clock },
    in_progress: { label: '进行中', variant: 'info', icon: Clock },
    completed: { label: '已完成', variant: 'success', icon: CheckCircle },
    resolved: { label: '已解决', variant: 'success', icon: CheckCircle },
    locked: { label: '已锁定', variant: 'danger', icon: AlertTriangle },
    inactive: { label: '未激活', variant: 'danger', icon: AlertTriangle },
    shipped: { label: '已发货', variant: 'info', icon: CheckCircle },
  };

  const config = statusConfig[status] || { label: status, variant: 'default', icon: CheckCircle };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className="w-3 h-3" />
      {children || config.label}
    </Badge>
  );
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (value: number) => {
  return `¥${value.toLocaleString()}`;
};
