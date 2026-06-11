import { useState, useEffect } from "react";
import { PageTemplate, DataTable, Badge } from "../components/PageTemplate.js";
import { waterQualityApi } from "../lib/api.js";
import { Settings as SettingsIcon, ThermometerSun, Waves, Wind, Droplets, FlaskConical, Save } from "lucide-react";
import type { ThresholdConfig } from "../types.js";

const indicatorIcons: Record<string, React.ElementType> = {
  temperature: ThermometerSun,
  salinity: Waves,
  dissolved_oxygen: Wind,
  ph: Droplets,
  ammonia_nitrogen: FlaskConical,
  nitrite: FlaskConical,
};

const indicatorLabels: Record<string, string> = {
  temperature: "水温",
  salinity: "盐度",
  dissolved_oxygen: "溶解氧",
  ph: "pH值",
  ammonia_nitrogen: "氨氮",
  nitrite: "亚硝酸盐",
};

const indicatorUnits: Record<string, string> = {
  temperature: "°C",
  salinity: "‰",
  dissolved_oxygen: "mg/L",
  ph: "",
  ammonia_nitrogen: "mg/L",
  nitrite: "mg/L",
};

export const Settings = () => {
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThresholds = async () => {
    setLoading(true);
    const res = await waterQualityApi.getThresholds();
    if (res.success && res.data) {
      setThresholds(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadThresholds();
  }, []);

  const handleSave = async () => {
    const res = await waterQualityApi.updateThresholds(thresholds);
    if (res.success) {
      alert("阈值保存成功！");
    }
  };

  const columns = [
    { key: "indicator", label: "指标", render: (row: ThresholdConfig) => {
      const Icon = indicatorIcons[row.indicator] || SettingsIcon;
      return (
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-teal-400" />
          <span className="text-white font-medium">{indicatorLabels[row.indicator] || row.indicator}</span>
        </div>
      );
    }},
    { key: "minValue", label: "最小值" },
    { key: "maxValue", label: "最大值" },
    { key: "unit", label: "单位" },
    { key: "updatedAt", label: "更新时间" },
  ];

  const defaultAccounts = [
    { role: "管理员", username: "admin", password: "admin123" },
    { role: "养殖户", username: "farmer", password: "farmer123" },
    { role: "技术人员", username: "technician", password: "tech123" },
    { role: "财务", username: "finance", password: "finance123" },
  ];

  return (
    <PageTemplate
      title="系统设置"
      description="配置系统参数、水质阈值和安全规则"
      onRefresh={loadThresholds}
    >
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-teal-400" />
              水质阈值配置
            </h2>
            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              保存配置
            </button>
          </div>
          <DataTable columns={columns} data={thresholds} loading={loading} />
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-4">系统信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <span className="text-white/60">系统名称</span>
              <p className="text-white font-medium mt-1">大型海洋牧场综合管理平台</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <span className="text-white/60">版本号</span>
              <p className="text-white font-medium mt-1">v1.0.0</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <span className="text-white/60">开发团队</span>
              <p className="text-white font-medium mt-1">海洋科技研发中心</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <span className="text-white/60">最后更新</span>
              <p className="text-white font-medium mt-1">{new Date().toLocaleDateString("zh-CN")}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-4">默认测试账号</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {defaultAccounts.map((account, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-xl">
                <Badge variant="info" className="mb-2">{account.role}</Badge>
                <p className="text-sm text-white/60">账号: <span className="text-white font-medium">{account.username}</span></p>
                <p className="text-sm text-white/60">密码: <span className="text-white font-medium">{account.password}</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
};
