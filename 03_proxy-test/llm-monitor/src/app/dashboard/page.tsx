'use client';

import { useState, useEffect, useCallback } from 'react';
import StatsCards from '@/components/dashboard/StatsCards';
import ProviderChart from '@/components/dashboard/ProviderChart';
import ModelTable from '@/components/dashboard/ModelTable';
import ModeStats from '@/components/dashboard/ModeStats';
import TokenManager from '@/components/dashboard/TokenManager';
import ModelSelector from '@/components/dashboard/ModelSelector';
import BalanceManager from '@/components/dashboard/BalanceManager';

type ViewType = 'stats' | 'tokens' | 'models' | 'balance';

interface SummaryStats {
  period: {
    days: number;
    from: string;
    to: string;
  };
  total: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    estimatedCost: number;
  };
  byProvider: Array<{
    provider: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    estimatedCost: number;
  }>;
  byMode: Array<{
    mode: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    estimatedCost: number;
  }>;
  balance: number;
}

interface ModelStats {
  period: {
    days: number;
    from: string;
    to: string;
  };
  models: Array<{
    provider: string;
    model: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
    estimatedCost: number;
    avgLatencyMs: number;
    pricing: {
      inputPricePer1m: number;
      outputPricePer1m: number;
    } | null;
  }>;
}

export default function DashboardPage() {
  const [view, setView] = useState<ViewType>('stats');
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, modelRes] = await Promise.all([
        fetch(`/api/stats/summary?days=${days}`),
        fetch(`/api/stats/by-model?days=${days}`),
      ]);

      if (!summaryRes.ok || !modelRes.ok) {
        throw new Error('Failed to fetch stats');
      }

      const [summary, models] = await Promise.all([
        summaryRes.json(),
        modelRes.json(),
      ]);

      setSummaryStats(summary);
      setModelStats(models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl">Error: {error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summaryStats || !modelStats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">LLM Monitor Dashboard</h1>
          {view === 'stats' && (
            <div className="flex items-center gap-4">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="p-2 border rounded-lg"
              >
                <option value={7}>최근 7일</option>
                <option value={30}>최근 30일</option>
                <option value={90}>최근 90일</option>
              </select>
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                새로고침
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setView('stats')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              view === 'stats'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            📊 통계
          </button>
          <button
            onClick={() => setView('tokens')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              view === 'tokens'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            🔑 토큰 관리
          </button>
          <button
            onClick={() => setView('models')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              view === 'models'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            🤖 모델 선택
          </button>
          <button
            onClick={() => setView('balance')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              view === 'balance'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            💰 잔액 관리
          </button>
        </div>

        {/* Content based on view */}
        {view === 'stats' && summaryStats && modelStats && (
          <>
            {/* Stats Cards */}
            <StatsCards stats={summaryStats} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ProviderChart data={summaryStats.byProvider} />
              <ModeStats data={summaryStats.byMode} />
            </div>

            {/* Model Table */}
            <ModelTable models={modelStats.models} />
          </>
        )}

        {view === 'tokens' && <TokenManager />}

        {view === 'models' && <ModelSelector />}

        {view === 'balance' && <BalanceManager />}
      </div>
    </div>
  );
}
