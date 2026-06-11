import type {
  User,
  LoginRequest,
  LoginResponse,
  DashboardStats,
  Zone,
  Warning,
  WaterQuality,
  FinanceReport,
  FryRelease,
  RecommendResponse,
  RecommendRequest,
  FeedingPlan,
  FeedingLog,
  HarvestTask,
  SampleTest,
  HarvestPrediction,
  Order,
  Message,
  ThresholdConfig,
} from '../../shared/types.js';

const BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    'Content-Type': 'application/json',

  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data as ApiResponse<T>;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '网络请求失败',
    };
  }
};

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCurrentUser: () =>
    request<User>('/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const dashboardApi = {
  getStats: () => request<DashboardStats>('/dashboard/stats'),
  getZonesOverview: () => request<Zone[]>('/dashboard/zones-overview'),
  getRecentWarnings: (limit = 10) =>
    request<Warning[]>(`/dashboard/recent-warnings?limit=${limit}`),
  getWaterQualityTrend: (zoneId?: string, days = 7) => {
    const params = new URLSearchParams();
    if (zoneId) params.append('zoneId', zoneId);
    params.append('days', String(days));
    return request<WaterQuality[]>(`/dashboard/water-quality-trend?${params.toString()}`);
  },
  getFinanceOverview: (month?: string) => {
    const params = month ? `?month=${month}` : '';
    return request<FinanceReport[]>(`/dashboard/finance-overview${params}`);
  },
  getProductionChart: (months = 6) =>
    request<{ month: string; output: number; income: number; profit: number }[]>(
      `/dashboard/production-chart?months=${months}`
    ),
};


export const usersApi = {
  getList: (role?: string, status?: string, keyword?: string) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    if (keyword) params.append('keyword', keyword);
    return request<User[]>(`/users?${params.toString()}`);
  },
  getDetail: (id: string) => request<User>(`/users/${id}`),
  create: (data: Partial<User> & { password: string }) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
};

export const zonesApi = {
  getList: () => request<Zone[]>('/zones'),
  getDetail: (id: string) => request<Zone>(`/zones/${id}`),
  create: (data: Partial<Zone>) =>
    request<Zone>('/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Zone>) =>
    request<Zone>(`/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/zones/${id}`, { method: 'DELETE' }),
  updateRules: (id: string, rules: { indicator: string; threshold: number; action: 'notify' | 'lock' }[]) =>
    request<Zone>(`/zones/${id}/rules`, {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    }),
  setTargetOutput: (id: string, targetOutput: number) =>
    request<Zone>(`/zones/${id}/target`, {
      method: 'PUT',
      body: JSON.stringify({ targetOutput }),
    }),
  lock: (id: string, reason: string) =>
    request<Zone>(`/zones/${id}/lock`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),
  unlock: (id: string) =>
    request<Zone>(`/zones/${id}/unlock`, { method: 'PUT' }),
};

export const fryReleaseApi = {
  recommend: (data: RecommendRequest) =>
    request<RecommendResponse>('/fry-release/recommend', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getList: (zoneId?: string) => {
    const params = zoneId ? `?zoneId=${zoneId}` : '';
    return request<FryRelease[]>(`/fry-release${params}`);
  },
  getDetail: (id: string) => request<FryRelease>(`/fry-release/${id}`),
  create: (data: Omit<FryRelease, 'id' | 'createdAt' | 'archiveId'>) =>
    request<FryRelease>('/fry-release', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  downloadArchive: (id: string) =>
    fetch(`${BASE_URL}/fry-release/${id}/archive`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),
};


export const waterQualityApi = {
  getThresholds: () => request<ThresholdConfig[]>('/water-quality/thresholds'),
  updateThresholds: (thresholds: ThresholdConfig[]) =>
    request<ThresholdConfig[]>('/water-quality/thresholds', {
      method: 'PUT',
      body: JSON.stringify({ thresholds }),
    }),
  getList: (zoneId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (zoneId) params.append('zoneId', zoneId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request<WaterQuality[]>(`/water-quality?${params.toString()}`);
  },
  create: (data: Omit<WaterQuality, 'id' | 'recordedAt' | 'isNormal' | 'abnormalItems'>) =>
    request<WaterQuality>('/water-quality', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const warningsApi = {
  getList: (status?: string, level?: string, type?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (level) params.append('level', level);
    if (type) params.append('type', type);
    return request<Warning[]>(`/warnings?${params.toString()}`);
  },
  getDetail: (id: string) => request<Warning>(`/warnings/${id}`),
  process: (id: string, data: { status: 'processing' | 'resolved'; handleNote: string }) =>
    request<Warning>(`/warnings/${id}/process`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const feedingApi = {
  getPlans: (zoneId?: string) => {
    const params = zoneId ? `?zoneId=${zoneId}` : '';
    return request<FeedingPlan[]>(`/feeding/plans${params}`);
  },
  createPlan: (data: Omit<FeedingPlan, 'id' | 'createdAt'>) =>
    request<FeedingPlan>('/feeding/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePlan: (id: string, data: Partial<FeedingPlan>) =>
    request<FeedingPlan>(`/feeding/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  togglePlan: (id: string) =>
    request<FeedingPlan>(`/feeding/plans/${id}/toggle`, { method: 'PUT' }),
  deletePlan: (id: string) =>
    request<void>(`/feeding/plans/${id}`, { method: 'DELETE' }),
  getLogs: (planId?: string, zoneId?: string) => {
    const params = new URLSearchParams();
    if (planId) params.append('planId', planId);
    if (zoneId) params.append('zoneId', zoneId);
    return request<FeedingLog[]>(`/feeding/logs?${params.toString()}`);
  },
};

export const harvestApi = {
  getSampleTests: (zoneId?: string) => {
    const params = zoneId ? `?zoneId=${zoneId}` : '';
    return request<SampleTest[]>(`/harvest/samples${params}`);
  },
  createSampleTest: (data: Omit<SampleTest, 'id' | 'testedAt'>) =>
    request<SampleTest>('/harvest/samples', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  predict: (zoneId: string) =>
    request<HarvestPrediction>(`/harvest/predict/${zoneId}`),
  getTasks: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return request<HarvestTask[]>(`/harvest/tasks${params}`);
  },
  createTask: (data: {
    zoneId: string;
    predictedOutput: number;
    harvestDate: string;
  }) =>
    request<HarvestTask>('/harvest/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTaskStatus: (id: string, status: 'pending' | 'in_progress' | 'completed') =>
    request<HarvestTask>(`/harvest/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  downloadTaskOrder: (id: string) =>
    fetch(`${BASE_URL}/harvest/tasks/${id}/order`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),
};

export const traceabilityApi = {
  getOrders: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return request<Order[]>(`/traceability/orders${params}`);
  },
  createOrder: (data: Omit<Order, 'id' | 'orderNo' | 'traceCode' | 'createdAt'>) =>
    request<Order>('/traceability/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderStatus: (id: string, status: 'pending' | 'shipped' | 'completed') =>
    request<Order>(`/traceability/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getTraceRecords: (code: string) =>
    request<{ order: Order; records: { type: string; description: string; operator: string; timestamp: string; data: any }[] }>(
      `/traceability/records/${code}`
    ),
  generateQRCode: (code: string) =>
    request<string>(`/traceability/qrcode/${code}`),
};

export const financeApi = {
  generateReports: (reportMonth: string) =>
    request<{ message: string; reports: FinanceReport[] }>('/finance/generate', {
      method: 'POST',
      body: JSON.stringify({ month: reportMonth }),
    }),
  getReports: (month?: string, zoneId?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (zoneId) params.append('zoneId', zoneId);
    return request<FinanceReport[]>(`/finance/reports?${params.toString()}`);
  },
  getStatistics: (startMonth?: string, endMonth?: string) => {
    const params = new URLSearchParams();
    if (startMonth) params.append('startMonth', startMonth);
    if (endMonth) params.append('endMonth', endMonth);
    return request<{
      totalOutput: number;
      totalCost: number;
      totalIncome: number;
      totalProfit: number;
      avgLossRate: number;
      zoneStats: {
        zoneId: string;
        zoneName: string;
        output: number;
        profit: number;
      }[];
    }>(`/finance/statistics?${params.toString()}`);
  },
};

export const messagesApi = {
  getList: (type?: string, isRead?: boolean) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (isRead !== undefined) params.append('isRead', String(isRead));
    return request<Message[]>(`/messages?${params.toString()}`);
  },
  getUnreadCount: () => request<{ count: number }>('/messages/unread-count'),
  markAsRead: (id: string) =>
    request<Message>(`/messages/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () =>
    request<void>('/messages/read-all', { method: 'PUT' }),
  downloadVoucher: (id: string) =>
    fetch(`${BASE_URL}/messages/${id}/voucher`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),
};

