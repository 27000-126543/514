export type UserRole = 'farmer' | 'technician' | 'admin' | 'finance';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type ZoneStatus = 'normal' | 'warning' | 'locked';

export interface DiseaseRule {
  id: string;
  indicator: string;
  threshold: number;
  action: 'notify' | 'lock';
}

export interface Zone {
  id: string;
  name: string;
  area: number;
  targetOutput: number;
  status: ZoneStatus;
  currentStock: number;
  growthRate: number;
  diseaseControlRules: DiseaseRule[];
  createdAt: string;
}

export interface RecommendRequest {
  zoneId: string;
  species: string;
}

export interface RecommendFactor {
  name: string;
  value: number;
  weight: number;
}

export interface RecommendResponse {
  recommendedDensity: number;
  feedFormula: string;
  maxQuantity: number;
  confidence: number;
  factors: RecommendFactor[];
}

export interface FryRelease {
  id: string;
  zoneId: string;
  zoneName: string;
  species: string;
  quantity: number;
  recommendedDensity: number;
  feedFormula: string;
  waterTemp: number;
  salinity: number;
  dissolvedOxygen: number;
  historicalMortality: number;
  archiveId: string;
  createdAt: string;
  operator: string;
}

export interface BreedingArchive {
  id: string;
  fryReleaseId: string;
  content: string;
  createdAt: string;
}

export interface ThresholdConfig {
  indicator: string;
  min: number;
  max: number;
  unit: string;
}

export interface WaterQuality {
  id: string;
  zoneId: string;
  zoneName: string;
  temperature: number;
  salinity: number;
  dissolvedOxygen: number;
  ph: number;
  ammoniaNitrogen: number;
  nitrite: number;
  recordedBy: string;
  recordedAt: string;
  isNormal: boolean;
  abnormalItems: string[];
}

export type WarningType = 'water_quality' | 'growth' | 'disease';
export type WarningLevel = 'low' | 'medium' | 'high';
export type WarningStatus = 'pending' | 'processing' | 'resolved';

export interface Warning {
  id: string;
  zoneId: string;
  zoneName: string;
  type: WarningType;
  level: WarningLevel;
  indicator: string;
  currentValue: number;
  threshold: number;
  consecutiveDays: number;
  suggestions: string[];
  status: WarningStatus;
  createdAt: string;
  handledAt?: string;
  handledBy?: string;
  handleNote?: string;
}

export interface FeedingPlan {
  id: string;
  zoneId: string;
  zoneName: string;
  species: string;
  growthStage: string;
  dailyAmount: number;
  frequency: number;
  autoAdjust: boolean;
  weatherAdjust: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface FeedingLog {
  id: string;
  planId: string;
  zoneId: string;
  zoneName: string;
  scheduledAmount: number;
  actualAmount: number;
  adjustedReason: string;
  weather: string;
  growthDays: number;
  fedAt: string;
}

export interface SampleTest {
  id: string;
  zoneId: string;
  zoneName: string;
  averageWeight: number;
  survivalRate: number;
  sampleCount: number;
  testedBy: string;
  testedAt: string;
}

export interface HarvestWindow {
  start: string;
  end: string;
  reason: string;
}

export interface HarvestPrediction {
  zoneId: string;
  zoneName: string;
  estimatedTotal: number;
  bestHarvestWindow: HarvestWindow;
  priceForecast: number;
  confidence: number;
}

export type HarvestTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface HarvestTask {
  id: string;
  zoneId: string;
  zoneName: string;
  predictedOutput: number;
  harvestDate: string;
  status: HarvestTaskStatus;
  taskOrderNo: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'shipped' | 'completed';

export interface Order {
  id: string;
  orderNo: string;
  zoneId: string;
  zoneName: string;
  species: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName: string;
  traceCode: string;
  status: OrderStatus;
  createdAt: string;
}

export interface TraceRecord {
  type: string;
  description: string;
  operator: string;
  timestamp: string;
  data: any;
}

export interface FinanceCost {
  fry: number;
  feed: number;
  labor: number;
  other: number;
}

export interface FinanceComparison {
  output: number;
  cost: number;
  income: number;
  profit: number;
}

export interface FinanceReport {
  id: string;
  reportMonth: string;
  zoneId: string;
  zoneName: string;
  output: number;
  cost: FinanceCost;
  income: number;
  diseaseLossRate: number;
  profit: number;
  comparedLastMonth: FinanceComparison;
  createdAt: string;
  pushed: boolean;
}

export type MessageType = 'fry_release' | 'warning' | 'harvest' | 'sale' | 'system';

export interface Message {
  id: string;
  userId: string;
  type: MessageType;
  title: string;
  content: string;
  relatedId: string;
  relatedType: string;
  hasVoucher: boolean;
  voucherUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalZones: number;
  activeZones: number;
  warningZones: number;
  lockedZones: number;
  totalStock: number;
  pendingWarnings: number;
  todayFeedings: number;
  monthlyOutput: number;
}
