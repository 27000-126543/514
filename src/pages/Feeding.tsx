import { useState } from 'react';
import { FeaturePage, StatusBadge, formatDate } from './FeaturePage.js';
import { feedingApi } from '../lib/api.js';
import { Utensils, Sun, Cloud, Fish, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import type { FeedingPlan, FeedingLog } from '../types.js';

export const Feeding = () => {
  const [activeTab, setActiveTab] = useState<'plans' | 'logs'>('plans');

  const planColumns = [
    { key: 'zoneName', label: '养殖区' },
    { key: 'species', label: '品种', render: (row: FeedingPlan) => (
      <div className="flex items-center gap-2">
        <Fish className="w-4 h-4 text-teal-400" />
        <span>{row.species}</span>
      </div>
    )},
    { key: 'growthStage', label: '生长阶段' },
    { key: 'dailyAmount', label: '日投喂量', render: (row: FeedingPlan) => `${row.dailyAmount} kg` },
    { key: 'frequency', label: '投喂频率', render: (row: FeedingPlan) => `${row.frequency} 次/天` },
    { key: 'autoAdjust', label: '自动调整', render: (row: FeedingPlan) => (
      row.autoAdjust ? <StatusBadge status="normal">已开启</StatusBadge> : <StatusBadge status="inactive">已关闭</StatusBadge>
    )},
    { key: 'weatherAdjust', label: '天气调整', render: (row: FeedingPlan) => (
      row.weatherAdjust ? <StatusBadge status="normal">已开启</StatusBadge> : <StatusBadge status="inactive">已关闭</StatusBadge>
    )},
    { key: 'isActive', label: '状态', render: (row: FeedingPlan) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          feedingApi.togglePlan(row.id).then(() => window.location.reload());
        }}
        className="p-1 rounded-lg hover:bg-white/10"
      >
        {row.isActive ? (
          <ToggleRight className="w-6 h-6 text-teal-400" />
        ) : (
          <ToggleLeft className="w-6 h-6 text-white/40" />
        )}
      </button>
    )},
    { key: 'createdAt', label: '创建时间', render: (row: FeedingPlan) => formatDate(row.createdAt) },
  ];

  const logColumns = [
    { key: 'zoneName', label: '养殖区' },
    { key: 'scheduledAmount', label: '计划投喂量', render: (row: FeedingLog) => `${row.scheduledAmount} kg` },
    { key: 'actualAmount', label: '实际投喂量', render: (row: FeedingLog) => `${row.actualAmount.toFixed(1)} kg` },
    { key: 'adjustedReason', label: '调整原因' },
    { key: 'weather', label: '天气', render: (row: FeedingLog) => (
      <div className="flex items-center gap-1">
        {row.weather.includes('晴') ? <Sun className="w-4 h-4 text-yellow-400" /> : <Cloud className="w-4 h-4 text-gray-400" />}
        <span>{row.weather}</span>
      </div>
    )},
    { key: 'growthDays', label: '生长天数', render: (row: FeedingLog) => `${row.growthDays} 天` },
    { key: 'fedAt', label: '投喂时间', render: (row: FeedingLog) => formatDate(row.fedAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">智能投喂</h1>
          <p className="text-white/60 mt-1">设置自动投喂计划，系统根据生长阶段和天气动态调整投喂量</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'plans' ? 'bg-teal-500/30 text-teal-300' : 'text-white/60 hover:text-white'}`}
            >
              投喂计划
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'logs' ? 'bg-teal-500/30 text-teal-300' : 'text-white/60 hover:text-white'}`}
            >
              投喂日志
            </button>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            新建计划
          </button>
        </div>
      </div>

      {activeTab === 'plans' ? (
        <FeaturePage
          title=""
          description=""
          addButtonText=""
          columns={planColumns}
          fetchData={() => feedingApi.getPlans()}
        />
      ) : (
        <FeaturePage
          title=""
          description=""
          addButtonText=""
          columns={logColumns}
          fetchData={() => feedingApi.getLogs()}
        />
      )}
    </div>
  );
};
