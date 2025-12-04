export interface UsageData {
  id: string
  provider: string
  periodStart: Date
  periodEnd: Date
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  requestCount: number
  createdAt: Date
}

export interface UsageSummary {
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  totalRequests: number
}

export interface DailyUsage {
  date: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  requestCount: number
}

export interface ModelUsage {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  requestCount: number
  percentage: number
}

export interface Settings {
  id: string
  provider: string
  apiKey: string
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
