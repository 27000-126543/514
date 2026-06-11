import { useState, useEffect } from 'react';
import { FeaturePage, StatusBadge, formatDate } from './FeaturePage.js';
import { messagesApi } from '../lib/api.js';
import { eventBus, EVENTS } from '../utils/eventBus.js';
import { MessageSquare, CheckCheck, Download, Bell, Fish, AlertTriangle, FishSymbol, ShoppingCart, Settings } from 'lucide-react';
import type { Message, MessageType } from '../types.js';

const typeIcons: Record<MessageType, React.ElementType> = {
  fry_release: Fish,
  warning: AlertTriangle,
  harvest: FishSymbol,
  sale: ShoppingCart,
  system: Settings,
};

const typeLabels: Record<MessageType, string> = {
  fry_release: '鱼苗投放',
  warning: '预警通知',
  harvest: '捕捞通知',
  sale: '销售通知',
  system: '系统通知',
};

const typeVariants: Record<MessageType, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  fry_release: 'success',
  warning: 'warning',
  harvest: 'info',
  sale: 'success',
  system: 'default',
};

export const Messages = () => {
  const [filter, setFilter] = useState<MessageType | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const columns = [
    { key: 'type', label: '类型', render: (row: Message) => {
      const Icon = typeIcons[row.type];
      return (
        <Badge variant={typeVariants[row.type]}>
          <Icon className="w-3 h-3" />
          {typeLabels[row.type]}
        </Badge>
      );
    }},
    { key: 'title', label: '标题', render: (row: Message) => (
      <div className="flex items-center gap-2">
        {!row.isRead && <span className="w-2 h-2 bg-coral-500 rounded-full"></span>}
        <span className={`${!row.isRead ? 'text-white font-medium' : 'text-white/70'}`}>{row.title}</span>
      </div>
    )},
    { key: 'content', label: '内容', render: (row: Message) => (
      <span className="text-white/60 truncate max-w-md">{row.content}</span>
    )},
    { key: 'hasVoucher', label: '凭证', render: (row: Message) => (
      row.hasVoucher ? (
        <span className="flex items-center gap-1 text-teal-400 text-sm">
          <Download className="w-4 h-4" />
          可下载
        </span>
      ) : (
        <span className="text-white/40 text-sm">无</span>
      )
    )},
    { key: 'isRead', label: '状态', render: (row: Message) => (
      row.isRead ? <StatusBadge status="completed">已读</StatusBadge> : <StatusBadge status="pending">未读</StatusBadge>
    )},
    { key: 'createdAt', label: '时间', render: (row: Message) => formatDate(row.createdAt) },
  ];

  const fetchData = async () => {
    const type = filter === 'all' ? undefined : filter;
    const isRead = unreadOnly ? false : undefined;
    return messagesApi.getList(type, isRead);
  };

  const handleMarkAsRead = async (row: Message) => {
    try {
      const response = await messagesApi.markAsRead(row.id);
      if (response.success) {
        eventBus.emit(EVENTS.MESSAGES_READ);
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (confirm('确定要标记所有消息为已读吗？')) {
      try {
        const response = await messagesApi.markAllAsRead();
        if (response.success) {
          eventBus.emit(EVENTS.MESSAGES_READ);
        }
      } catch (error) {
        console.error('全部已读失败:', error);
      }
    }
  };

  const handleDownloadVoucher = async (row: Message) => {
    if (row.hasVoucher) {
      const response = await messagesApi.downloadVoucher(row.id);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `凭证_${row.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const Badge = ({ children, variant }: { children: React.ReactNode; variant: string }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
      variant === 'success' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
      variant === 'warning' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
      variant === 'danger' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
      variant === 'info' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
      'bg-white/10 text-white/70 border-white/20'
    }`}>
      {children}
    </span>
  );

  return (
    <FeaturePage
      title="消息中心"
      description="查看系统通知、预警信息和业务凭证"
      addButtonText=""
      columns={columns}
      fetchData={fetchData}
      onView={(row: Message) => {
        if (!row.isRead) handleMarkAsRead(row);
        if (row.hasVoucher) handleDownloadVoucher(row);
        alert(`${row.title}\n\n${row.content}`);
      }}
      extraActions={
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as MessageType | 'all')}
            className="input-field w-auto"
          >
            <option value="all">全部类型</option>
            <option value="fry_release">鱼苗投放</option>
            <option value="warning">预警通知</option>
            <option value="harvest">捕捞通知</option>
            <option value="sale">销售通知</option>
            <option value="system">系统通知</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/20 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-white/70">仅显示未读</span>
          </label>
          <button onClick={handleMarkAllAsRead} className="btn-secondary flex items-center gap-2">
            <CheckCheck className="w-4 h-4" />
            全部已读
          </button>
        </div>
      }
    />
  );
};
