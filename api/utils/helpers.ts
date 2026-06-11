import { v4 as uuidv4 } from 'uuid';

export const generateId = (): string => uuidv4();

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateTime = (date: Date): string => {
  return date.toISOString();
};

export const calculateFeedFormula = (species: string, temperature: number): string => {
  const formulas: Record<string, string[]> = {
    '大黄鱼': [
      '高蛋白配方：鱼粉45% + 豆粕20% + 鱼油10% + 维生素5%',
      '高脂肪配方：鱼粉40% + 豆粕25% + 鱼油15% + 矿物质3%'
    ],
    '鲈鱼': [
      '快速生长配方：鱼粉50% + 豆粕15% + 鱼油12% + 添加剂8%',
      '均衡配方：鱼粉38% + 豆粕32% + 鱼油10% + 维生素5%'
    ],
    '石斑鱼': [
      '珍品配方：鱼粉55% + 豆粕12% + 鱼油15% + 多种维生素8%',
      '增色配方：鱼粉45% + 磷虾粉15% + 鱼油12% + 类胡萝卜素5%'
    ],
    'default': [
      '通用配方：鱼粉40% + 豆粕30% + 鱼油8% + 维生素5%',
      '经济配方：鱼粉30% + 豆粕40% + 鱼油6% + 矿物质4%'
    ]
  };

  const speciesFormulas = formulas[species] || formulas['default'];
  const tempIndex = temperature > 25 ? 1 : 0;
  
  return speciesFormulas[tempIndex % speciesFormulas.length];
};

export const calculateDensity = (
  area: number,
  temperature: number,
  salinity: number,
  dissolvedOxygen: number,
  historicalMortality: number
): { density: number; maxQuantity: number; confidence: number } => {
  let baseDensity = 8;
  let confidence = 0.8;

  if (temperature >= 20 && temperature <= 25) {
    baseDensity *= 1.2;
    confidence += 0.05;
  } else if (temperature < 18 || temperature > 28) {
    baseDensity *= 0.7;
    confidence -= 0.15;
  }

  if (salinity >= 24 && salinity <= 30) {
    baseDensity *= 1.1;
    confidence += 0.03;
  } else if (salinity < 20 || salinity > 32) {
    baseDensity *= 0.8;
    confidence -= 0.1;
  }

  if (dissolvedOxygen >= 7) {
    baseDensity *= 1.15;
    confidence += 0.05;
  } else if (dissolvedOxygen < 5) {
    baseDensity *= 0.6;
    confidence -= 0.2;
  }

  if (historicalMortality < 0.03) {
    baseDensity *= 1.1;
    confidence += 0.04;
  } else if (historicalMortality > 0.08) {
    baseDensity *= 0.85;
    confidence -= 0.1;
  }

  confidence = Math.min(Math.max(confidence, 0.5), 0.98);
  const maxQuantity = Math.floor(baseDensity * area);

  return {
    density: Math.round(baseDensity * 10) / 10,
    maxQuantity,
    confidence: Math.round(confidence * 100)
  };
};

export const checkWaterQuality = (
  data: { temperature: number; salinity: number; dissolvedOxygen: number; ph: number; ammoniaNitrogen: number; nitrite: number },
  thresholds: { indicator: string; min: number; max: number }[]
): { isNormal: boolean; abnormalItems: string[] } => {
  const abnormalItems: string[] = [];

  const thresholdMap = new Map(thresholds.map(t => [t.indicator, t]));

  const check = (indicator: string, value: number) => {
    const threshold = thresholdMap.get(indicator);
    if (threshold && (value < threshold.min || value > threshold.max)) {
      abnormalItems.push(indicator);
    }
  };

  check('temperature', data.temperature);
  check('salinity', data.salinity);
  check('dissolved_oxygen', data.dissolvedOxygen);
  check('ph', data.ph);
  check('ammonia_nitrogen', data.ammoniaNitrogen);
  check('nitrite', data.nitrite);

  return {
    isNormal: abnormalItems.length === 0,
    abnormalItems
  };
};

export const generateSuggestions = (type: string, indicator: string, level: string): string[] => {
  const suggestions: Record<string, string[]> = {
    'temperature': [
      '检查温控设备运行状态',
      '根据季节调整投喂量',
      '加强水质监测频率',
      '考虑调整养殖密度'
    ],
    'salinity': [
      '检查淡水注入量',
      '监测潮汐和降雨影响',
      '调整换水频率'
    ],
    'dissolved_oxygen': [
      '开启增氧设备',
      '减少投喂量',
      '监测水流和循环系统',
      '检查藻类生长情况'
    ],
    'ph': [
      '检查酸碱平衡',
      '考虑使用调节剂',
      '监测二氧化碳含量'
    ],
    'ammonia_nitrogen': [
      '增加换水量',
      '减少投喂量',
      '检查过滤系统',
      '添加益生菌'
    ],
    'nitrite': [
      '加强水质交换',
      '检查硝化系统',
      '减少有机物积累'
    ],
    'growth_rate': [
      '检查饲料配方是否合适',
      '增加投喂频率',
      '检测水质指标',
      '观察鱼群健康状况'
    ],
    'default': [
      '安排现场检测',
      '加强日常监测',
      '记录异常情况',
      '咨询技术专家'
    ]
  };

  return suggestions[indicator] || suggestions['default'];
};

export const calculateHarvestWindow = (
  averageWeight: number,
  survivalRate: number,
  growthRate: number
): { start: Date; end: Date; reason: string } => {
  const now = new Date();
  const targetWeight = 500;
  const daysToTarget = Math.ceil((targetWeight - averageWeight) / (growthRate * 5));
  
  const start = new Date(now);
  start.setDate(start.getDate() + Math.max(daysToTarget - 3, 1));
  
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  let reason = '基于当前生长速率，';
  if (survivalRate > 0.9) {
    reason += '存活率高，建议在';
  } else if (survivalRate < 0.8) {
    reason += '存活率偏低，建议提前在';
  } else {
    reason += '建议在';
  }
  reason += `${start.toLocaleDateString()}至${end.toLocaleDateString()}期间捕捞，`;
  reason += '预计此时商品规格达标且市场价格最优。';

  return { start, end, reason };
};
