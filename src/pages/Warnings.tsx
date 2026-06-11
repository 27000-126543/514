import { useState } from 'react';
import { FeaturePage, StatusBadge, formatDate } from './FeaturePage.js';
import { warningsApi } from '../lib/api.js';
import { AlertTriangle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { Warning } from '../types.js';

const levelColors: Record<string, string> = {
  high: 'text-coral-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
};

const levelLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const Warnings = () => {
  const [filter, setFilter] = useState('all');

  const columns = [
    { key: 'zoneName', label: '养殖区' },
    { key: 'level', label: '级别', render: (row: Warning) => (
      <span className={`flex items-center gap-1 ${levelColors[row.level]}`}>
        <AlertTriangle className="w-4 h-4" />
        {levelLabels[row.level]}级
      </span>
    )},
    { key: 'indicator', label: '异常指标' },
    { key: 'currentValue', label: '当前值', render: (row: Warning) => (
      <span className="text-coral-400 font-medium">{row.currentValue}</span>
    )},
    { key: 'threshold', label: '阈值', render: (row: Warning) => (
      <span className="text-white/60">{row.threshold}</span>
    )},
    { key: 'consecutiveDays', label: '连续天数', render: (row: Warning) => (
      <span className="text-yellow-400">{row.consecutiveDays} 天</span>
    )},
    { key: 'status', label: '状态', render: (row: Warning) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', label: '预警时间', render: (row: Warning) => formatDate(row.createdAt) },
  ];

  const fetchData = async () => {
    const status = filter === 'all' ? undefined : filter;
    return warningsApi.getList(status);
  };

  const handleProcess = async (row: Warning) => {
    const note = prompt('请输入处理说明:');
    if (note) {
      await warningsApi.process(row.id, { status: 'processing', handleNote: note });
    }
  };

  const handleResolve = async (row: Warning) => {
    const note = prompt('请输入处理结果:');
    if (note) {
      await warningsApi.process(row.id, { status: 'resolved', handleNote: note });
    }
  };

  return (
    <FeaturePage
      title="预警管理"
      description="查看和处理系统生成的预警工单，落实整改措施"
      addButtonText="处理预警"
      columns={columns}
      fetchData={fetchData}
      onView={(row: Warning) => {
        alert(`整改建议:\n${row.suggestions.join('\n')}`);
      }}
      extraActions={
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
          </select>
        </div>
      }
    />
  );
};
