import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Droplets,
  AlertTriangle,
  Fish,
  TrendingUp,
  MapPin,
  ThermometerSun,
  Waves,
  Wind,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { dashboardApi } from '../lib/api.js';
import type { DashboardStats, Zone, Warning, WaterQuality, FinanceReport } from '../types.js';

const indicatorLabels: Record<string, { label: string; unit: string; icon: React.ElementType }> = {
  temperature: { label: '水温', unit: '°C', icon: ThermometerSun },
  salinity: { label: '盐度', unit: '‰', icon: Waves },
  dissolvedOxygen: { label: '溶解氧', unit: 'mg/L', icon: Wind },
};

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [waterTrend, setWaterTrend] = useState<WaterQuality[]>([]);
  const [financeData, setFinanceData] = useState<FinanceReport[]>([]);
  const [productionChart, setProductionChart] = useState<{ month: string; output: number; income: number; profit: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [statsRes, zonesRes, warningsRes, waterRes, financeRes, chartRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getZonesOverview(),
        dashboardApi.getRecentWarnings(5),
        dashboardApi.getWaterQualityTrend('all', 7),
        dashboardApi.getFinanceOverview(),
        dashboardApi.getProductionChart(6),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (zonesRes.success && zonesRes.data) setZones(zonesRes.data);
      if (warningsRes.success && warningsRes.data) setWarnings(warningsRes.data);
      if (waterRes.success && waterRes.data) setWaterTrend(waterRes.data);
      if (financeRes.success && financeRes.data) setFinanceData(financeRes.data);
      if (chartRes.success && chartRes.data) setProductionChart(chartRes.data);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'normal': return 'status-normal';
      case 'warning': return 'status-warning';
      case 'locked': return 'status-locked';
      default: return 'status-normal';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return '正常';
      case 'warning': return '预警';
      case 'locked': return '已锁定';
      default: return '未知';
    }
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'high': return 'status-danger';
      case 'medium': return 'status-warning';
      case 'low': return 'status-normal';
      default: return 'status-normal';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: '养殖区总数', value: stats?.totalZones || 0, icon: MapPin, color: 'from-teal-400 to-teal-600', suffix: '个' },
    { label: '正常运行', value: stats?.activeZones || 0, icon: LayoutDashboard, color: 'from-green-400 to-green-600', suffix: '个' },
    { label: '预警区域', value: stats?.warningZones || 0, icon: AlertTriangle, color: 'from-yellow-400 to-yellow-600', suffix: '个' },
    { label: '当前存量', value: stats?.totalStock || 0, icon: Fish, color: 'from-blue-400 to-blue-600', suffix: '尾' },
    { label: '待处理预警', value: stats?.pendingWarnings || 0, icon: AlertTriangle, color: 'from-coral-400 to-coral-600', suffix: '条' },
    { label: '今日投喂', value: stats?.todayFeedings || 0, icon: Droplets, color: 'from-purple-400 to-purple-600', suffix: '次' },
    { label: '本月产量', value: stats?.monthlyOutput || 0, icon: TrendingUp, color: 'from-emerald-400 to-emerald-600', suffix: 'kg' },
    { label: '锁定区域', value: stats?.lockedZones || 0, icon: AlertTriangle, color: 'from-red-400 to-red-600', suffix: '个' },
  ];

  const chartData = waterTrend.map((item) => ({
    time: new Date(item.recordedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    水温: item.temperature,
    盐度: item.salinity,
    溶解氧: item.dissolvedOxygen,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="glass-card-hover p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/60 text-sm">{card.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {card.value.toLocaleString()}
                    <span className="text-sm font-normal text-white/50 ml-1">{card.suffix}</span>
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">近7天水质趋势</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 36, 99, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                  }}
                />
                <Line type="monotone" dataKey="水温" stroke="#3E92CC" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="盐度" stroke="#F46036" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="溶解氧" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {Object.entries(indicatorLabels).map(([key, value]) => {
              const Icon = value.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/60">{value.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">养殖区状态</h3>
          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{zone.name}</span>
                  <span className={getStatusClass(zone.status)}>{getStatusLabel(zone.status)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-white/50">面积:</span>
                    <span className="text-white ml-1">{zone.area.toLocaleString()} ㎡</span>
                  </div>
                  <div>
                    <span className="text-white/50">存量:</span>
                    <span className="text-white ml-1">{zone.currentStock.toLocaleString()} 尾</span>
                  </div>
                  <div>
                    <span className="text-white/50">目标产值:</span>
                    <span className="text-white ml-1">{zone.targetOutput.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-white/50">生长率:</span>
                    <span className="text-white ml-1">{(zone.growthRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">近期预警</h3>
          <div className="space-y-3">
            {warnings.length === 0 ? (
              <p className="text-center text-white/50 py-8">暂无预警</p>
            ) : (
              warnings.map((warning) => (
                <div key={warning.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`${getLevelClass(warning.level)} mr-2`}>{getLevelLabel(warning.level)}级</span>
                      <span className="text-white font-medium">{warning.zoneName}</span>
                    </div>
                    <span className="text-xs text-white/50">
                      {new Date(warning.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm mb-2">{warning.indicator} 当前值 {warning.currentValue}，阈值 {warning.threshold}</p>
                  <p className="text-white/50 text-xs">连续 {warning.consecutiveDays} 天超标</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">生产趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 36, 99, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                  }}
                />
                <Area type="monotone" dataKey="output" stackId="1" stroke="#3E92CC" fill="rgba(62, 146, 204, 0.3)" name="产量(kg)" />
                <Area type="monotone" dataKey="profit" stackId="2" stroke="#10B981" fill="rgba(16, 185, 129, 0.3)" name="利润(元)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm">产量增长</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">+12.5%</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm">利润增长</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">+18.3%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">财务概览</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">养殖区</th>
                <th className="table-header">产量(kg)</th>
                <th className="table-header">成本(元)</th>
                <th className="table-header">收入(元)</th>
                <th className="table-header">利润(元)</th>
                <th className="table-header">病害损耗率</th>
                <th className="table-header">同比变化</th>
              </tr>
            </thead>
            <tbody>
              {financeData.map((report) => {
                const totalCost = report.cost.fry + report.cost.feed + report.cost.labor + report.cost.other;
                const profitChange = report.comparedLastMonth?.profit || 0;
                return (
                  <tr key={report.id} className="hover:bg-white/5">
                    <td className="table-cell text-white font-medium">{report.zoneName}</td>
                    <td className="table-cell">{report.output.toLocaleString()}</td>
                    <td className="table-cell">{totalCost.toLocaleString()}</td>
                    <td className="table-cell">{report.income.toLocaleString()}</td>
                    <td className="table-cell text-green-400">{report.profit.toLocaleString()}</td>
                    <td className="table-cell">{(report.diseaseLossRate * 100).toFixed(2)}%</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 ${profitChange >= 0 ? 'text-green-400' : 'text-coral-400'}`}>
                        {profitChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(profitChange).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
