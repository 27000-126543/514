import { useState, useEffect, useCallback } from 'react';
import { PageTemplate, DataTable, StatusBadge, formatDate, formatCurrency, StatCard } from './FeaturePage.js';
import { financeApi } from '../lib/api.js';
import { BarChart3, TrendingUp, DollarSign, PieChart, FileSpreadsheet } from 'lucide-react';
import type { FinanceReport } from '../types.js';

interface FinanceStats {
  totalOutput: number;
  totalCost: number;
  totalIncome: number;
  totalProfit: number;
}

const FISH_SPECIES = ['大黄鱼', '鲈鱼', '石斑鱼', '真鲷', '黑鲷' ];

export const Finance = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [reports, setReports] = useState<FinanceReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<FinanceStats>({
    totalOutput: 0,
    totalCost: 0,
    totalIncome: 0,
    totalProfit: 0,
  });
  const [generating, setGenerating] = useState<boolean>(false);

  const calculateStats = useCallback((data: FinanceReport[]) => {
    const totalOutput = data.reduce((sum, r) => sum + r.output, 0);
    const totalCost = data.reduce((sum, r) => sum + (r.cost.fry + r.cost.feed + r.cost.labor + r.cost.other), 0);
    const totalIncome = data.reduce((sum, r) => sum + r.income, 0);
    const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);
    setStats({ totalOutput, totalCost, totalIncome, totalProfit });
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await financeApi.getReports(selectedMonth);
      if (response.success && response.data) {
        setReports(response.data);
        calculateStats(response.data);
      } else {
        setReports([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error('加载报表失败:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, calculateStats]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerateReports = async () => {
    if (generating) return;
    if (!confirm(`确定要生成 ${selectedMonth} 月的财务报表吗？`)) {
      return;
    }
    setGenerating(true);
    try {
      const response = await financeApi.generateReports(selectedMonth);
      if (response.success) {
        alert(response.data?.message || '报表生成成功！');
        await loadReports();
      } else {
        alert(`生成失败：${response.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('生成报表失败:', error);
      alert('生成报表失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const columns = [
    { key: 'zoneName', label: '养殖区' },
    {
      key: 'output',
      label: '产量(kg)',
      render: (row: FinanceReport) => (
        <span className="font-medium">{row.output.toLocaleString()} kg</span>
      ),
    },
    {
      key: 'fryCost',
      label: '鱼苗成本',
      render: (row: FinanceReport) => formatCurrency(row.cost.fry),
    },
    {
      key: 'feedCost',
      label: '饲料成本',
      render: (row: FinanceReport) => formatCurrency(row.cost.feed),
    },
    {
      key: 'laborCost',
      label: '人工成本',
      render: (row: FinanceReport) => formatCurrency(row.cost.labor),
    },
    {
      key: 'otherCost',
      label: '其他成本',
      render: (row: FinanceReport) => formatCurrency(row.cost.other),
    },
    {
      key: 'income',
      label: '收入(元)',
      render: (row: FinanceReport) => formatCurrency(row.income),
    },
    {
      key: 'diseaseLossRate',
      label: '病害损耗率',
      render: (row: FinanceReport) => (
        <span className={row.diseaseLossRate > 0.05 ? 'text-coral-400' : 'text-green-400'}>
          {(row.diseaseLossRate * 100).toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'profit',
      label: '利润(元)',
      render: (row: FinanceReport) => (
        <span className={`font-medium ${row.profit >= 0 ? 'text-green-400' : 'text-coral-400'}`}>
          {formatCurrency(row.profit)}
        </span>
      ),
    },
    {
      key: 'comparedLastMonth',
      label: '环比',
      render: (row: FinanceReport) => {
        const profitChange = row.comparedLastMonth?.profit || 0;
        return (
          <span className={`inline-flex items-center gap-1 ${profitChange >= 0 ? 'text-green-400' : 'text-coral-400'}`}>
            {profitChange >= 0 ? '↑' : '↓'} {Math.abs(profitChange).toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'pushed',
      label: '状态',
      render: (row: FinanceReport) =>
        row.pushed ? (
          <StatusBadge status="completed">已推送</StatusBadge>
        ) : (
          <StatusBadge status="pending">未推送</StatusBadge>
        ),
    },
    {
      key: 'createdAt',
      label: '生成时间',
      render: (row: FinanceReport) => formatDate(row.createdAt),
    },
  ];

  return (
    <PageTemplate
      title="财务报表"
      description="每月1号自动生成各养殖区产量、成本、收入和病害损耗率报表"
      onRefresh={loadReports}
      extraActions={
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="input-field w-auto"
          />
          <button
            onClick={handleGenerateReports}
            disabled={generating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {generating ? '生成中...' : '生成报表'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="总产量"
          value={stats.totalOutput}
          icon={TrendingUp}
          suffix="kg"
          color="from-teal-400 to-teal-600"
        />
        <StatCard
          label="总成本"
          value={formatCurrency(stats.totalCost).replace('¥', '')}
          icon={DollarSign}
          suffix=""
          color="from-yellow-400 to-yellow-600"
        />
        <StatCard
          label="总收入"
          value={formatCurrency(stats.totalIncome).replace('¥', '')}
          icon={PieChart}
          suffix=""
          color="from-green-400 to-green-600"
        />
        <StatCard
          label="总利润"
          value={formatCurrency(stats.totalProfit).replace('¥', '')}
          icon={BarChart3}
          suffix=""
          color="from-blue-400 to-blue-600"
        />
      </div>

      <DataTable columns={columns} data={reports} loading={loading} />
    </PageTemplate>
  );
};
