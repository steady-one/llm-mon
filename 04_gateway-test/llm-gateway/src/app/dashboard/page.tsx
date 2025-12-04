'use client';

import { useState, useEffect, useCallback } from 'react';

interface Stats {
  total: { requests: number; inputTokens: number; outputTokens: number; totalCost: number };
  byProvider: Array<{ provider: string; requests: number; inputTokens: number; outputTokens: number; totalCost: number }>;
  byModel: Array<{ provider: string; model: string; requests: number; inputTokens: number; outputTokens: number; totalCost: number; avgLatencyMs: number }>;
  balance: number;
}

interface Key { id: string; keyPrefix: string; name: string | null; createdAt: string }

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, keysRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/keys'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (keysRes.ok) {
        const data = await keysRes.json();
        setKeys(data.keys);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createKey = async () => {
    const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key);
      fetchData();
    }
  };

  const deleteKey = async (id: string) => {
    await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const charge = async () => {
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) return;
    await fetch('/api/balance/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    setChargeAmount('');
    fetchData();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">LLM Gateway Dashboard</h1>
          <span className="text-sm opacity-80">Port 3002</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">잔액</p>
            <p className="text-2xl font-bold text-green-600">${stats?.balance.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">총 요청</p>
            <p className="text-2xl font-bold">{stats?.total.requests.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Input Tokens</p>
            <p className="text-2xl font-bold text-blue-600">{(stats?.total.inputTokens || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Output Tokens</p>
            <p className="text-2xl font-bold text-orange-600">{(stats?.total.outputTokens || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Tokens</p>
            <p className="text-2xl font-bold">{((stats?.total.inputTokens || 0) + (stats?.total.outputTokens || 0)).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">총 비용</p>
            <p className="text-2xl font-bold text-purple-600">${stats?.total.totalCost?.toFixed(4) || '0.0000'}</p>
          </div>
        </div>

        {/* New Key Alert */}
        {newKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-medium text-yellow-800">새 API Key가 생성되었습니다. 지금 복사하세요!</p>
            <code className="block mt-2 p-2 bg-yellow-100 rounded text-sm break-all">{newKey}</code>
            <button onClick={() => setNewKey(null)} className="mt-2 text-sm text-yellow-600 hover:underline">닫기</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Keys */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">API Keys</h2>
              <button onClick={createKey} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                + 새 키 발급
              </button>
            </div>
            {keys.length === 0 ? (
              <p className="text-gray-500 text-sm">API Key가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-mono text-sm">{k.keyPrefix}</span>
                    <button onClick={() => deleteKey(k.id)} className="text-red-500 text-sm hover:underline">삭제</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charge */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-4">잔액 충전</h2>
            <div className="flex gap-2">
              <input
                type="number"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                placeholder="금액 (USD)"
                className="flex-1 p-2 border rounded"
                step="0.01"
                min="0"
              />
              <button onClick={charge} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                충전
              </button>
            </div>
          </div>
        </div>

        {/* Provider Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Provider별 사용량</h2>
          {!stats?.byProvider.length ? (
            <p className="text-gray-500 text-sm">사용 데이터가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.byProvider.map((p) => (
                <div key={p.provider} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium capitalize">{p.provider}</p>
                  <p className="text-sm text-gray-500">{p.requests} 요청</p>
                  <p className="text-xs text-blue-600">In: {p.inputTokens?.toLocaleString() || 0}</p>
                  <p className="text-xs text-orange-600">Out: {p.outputTokens?.toLocaleString() || 0}</p>
                  <p className="text-sm text-purple-600">${p.totalCost?.toFixed(4) || '0.0000'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Model Stats */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="font-semibold p-4 border-b">모델별 통계</h2>
          {!stats?.byModel.length ? (
            <p className="text-gray-500 text-sm p-4">사용 데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Provider</th>
                    <th className="px-4 py-2 text-left">Model</th>
                    <th className="px-4 py-2 text-right">요청</th>
                    <th className="px-4 py-2 text-right text-blue-600">Input</th>
                    <th className="px-4 py-2 text-right text-orange-600">Output</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">비용</th>
                    <th className="px-4 py-2 text-right">평균 지연</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byModel.map((m, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 capitalize">{m.provider}</td>
                      <td className="px-4 py-2 font-mono text-xs">{m.model}</td>
                      <td className="px-4 py-2 text-right">{m.requests}</td>
                      <td className="px-4 py-2 text-right text-blue-600">{(m.inputTokens || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-orange-600">{(m.outputTokens || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{((m.inputTokens || 0) + (m.outputTokens || 0)).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">${m.totalCost?.toFixed(4) || '0.0000'}</td>
                      <td className="px-4 py-2 text-right">{m.avgLatencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* API Usage Guide */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">API 사용법</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
            <pre>{`curl -X POST http://localhost:3002/api/v1/chat/completions \\
  -H "Authorization: Bearer gw_sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",  // 또는 claude-3-5-haiku, gemini-1.5-flash, grok-beta
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</pre>
          </div>
        </div>
      </main>
    </div>
  );
}
