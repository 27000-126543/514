import { useState } from 'react';
import { FeaturePage, StatusBadge, formatDate } from './FeaturePage.js';
import { zonesApi } from '../lib/api.js';
import { MapPin, Target, Lock, Unlock, Settings } from 'lucide-react';
import type { Zone } from '../types.js';

export const Zones = () => {
  const [zones, setZones] = useState<Zone[]>([]);

  const columns = [
    { key: 'name', label: '养殖区名称', render: (row: Zone) => (
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-teal-400" />
        <span className="text-white font-medium">{row.name}</span>
      </div>
    )},
    { key: 'area', label: '面积', render: (row: Zone) => `${row.area.toLocaleString()} ㎡` },
    { key: 'targetOutput', label: '目标产值', render: (row: Zone) => (
      <div className="flex items-center gap-1">
        <Target className="w-4 h-4 text-yellow-400" />
        <span>{row.targetOutput.toLocaleString()} kg</span>
      </div>
    )},
    { key: 'currentStock', label: '当前存量', render: (row: Zone) => `${row.currentStock.toLocaleString()} 尾` },
    { key: 'growthRate', label: '生长率', render: (row: Zone) => `${(row.growthRate * 100).toFixed(1)}%` },
    { key: 'status', label: '状态', render: (row: Zone) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', label: '创建时间', render: (row: Zone) => formatDate(row.createdAt) },
  ];

  const handleLock = async (zone: Zone) => {
    if (confirm(`确定要${zone.status === 'locked' ? '解锁' : '锁定'} ${zone.name}吗？`)) {
      if (zone.status === 'locked') {
        await zonesApi.unlock(zone.id);
      } else {
        await zonesApi.lock(zone.id, '管理员操作');
      }
    }
  };

  return (
    <FeaturePage
      title="养殖区管理"
      description="管理所有养殖区域，设置目标产值和病害防控规则"
      addButtonText="新增养殖区"
      columns={columns}
      fetchData={async () => {
        const res = await zonesApi.getList();
        if (res.success && res.data) setZones(res.data);
        return res;
      }}
      extraActions={
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            阈值配置
          </button>
        </div>
      }
    />
  );
};
