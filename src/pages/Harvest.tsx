import { useState } from 'react';
import { FeaturePage, StatusBadge, formatDate } from './FeaturePage.js';
import { harvestApi } from '../lib/api.js';
import { FishSymbol, TrendingUp, Calendar, Download, FileText } from 'lucide-react';
import type { HarvestTask, SampleTest } from '../types.js';

export const Harvest = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'samples'>('tasks');

  const taskColumns = [
    { key: 'zoneName', label: '养殖区' },
    { key: 'predictedOutput', label: '预计产量', render: (row: HarvestTask) => (
      <div className="flex items-center gap-1">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <span>{row.predictedOutput.toLocaleString()} kg</span>
      </div>
    )},
    { key: 'harvestDate', label: '捕捞日期', render: (row: HarvestTask) => (
      <div className="flex items-center gap-1">
        <Calendar className="w-4 h-4 text-teal-400" />
        <span>{row.harvestDate}</span>
      </div>
    )},
    { key: 'taskOrderNo', label: '任务单号' },
    { key: 'status', label: '状态', render: (row: HarvestTask) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', label: '创建时间', render: (row: HarvestTask) => formatDate(row.createdAt) },
  ];

  const sampleColumns = [
    { key: 'zoneName', label: '养殖区' },
    { key: 'averageWeight', label: '平均体重', render: (row: SampleTest) => `${row.averageWeight.toFixed(1)} g` },
    { key: 'survivalRate', label: '存活率', render: (row: SampleTest) => `${(row.survivalRate * 100).toFixed(1)}%` },
    { key: 'sampleCount', label: '采样数量', render: (row: SampleTest) => `${row.sampleCount} 尾` },
    { key: 'testedBy', label: '检测人' },
    { key: 'testedAt', label: '检测时间', render: (row: SampleTest) => formatDate(row.testedAt) },
  ];

  const handleDownloadOrder = async (row: HarvestTask) => {
    const response = await harvestApi.downloadTaskOrder(row.id);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `捕捞任务单_${row.zoneName}_${row.harvestDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">捕捞管理</h1>
          <p className="text-white/60 mt-1">样品检测、产量预测、最佳捕捞窗口推算</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'tasks' ? 'bg-teal-500/30 text-teal-300' : 'text-white/60 hover:text-white'}`}
            >
              捕捞任务
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'samples' ? 'bg-teal-500/30 text-teal-300' : 'text-white/60 hover:text-white'}`}
            >
              样品检测
            </button>
          </div>
          <button
            onClick={() => alert('产量预测功能')}
            className="btn-secondary flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            产量预测
          </button>
          <button className="btn-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            生成任务单
          </button>
        </div>
      </div>

      {activeTab === 'tasks' ? (
        <FeaturePage
          title=""
          description=""
          addButtonText=""
          columns={taskColumns}
          fetchData={() => harvestApi.getTasks()}
          onView={handleDownloadOrder}
        />
      ) : (
        <FeaturePage
          title=""
          description=""
          addButtonText=""
          columns={sampleColumns}
          fetchData={() => harvestApi.getSampleTests()}
        />
      )}
    </div>
  );
};
