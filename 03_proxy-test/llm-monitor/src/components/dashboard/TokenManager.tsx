'use client';

import { useState, useEffect, useCallback } from 'react';

interface MonitorToken {
  id: string;
  tokenPrefix: string;
  name: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

type TabType = 'monitor' | 'api';

export default function TokenManager() {
  const [tab, setTab] = useState<TabType>('monitor');
  const [monitorTokens, setMonitorTokens] = useState<MonitorToken[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const [tokensRes, keysRes] = await Promise.all([
        fetch('/api/tokens'),
        fetch('/api/keys'),
      ]);

      if (tokensRes.ok) {
        const data = await tokensRes.json();
        setMonitorTokens(data.tokens || []);
      }

      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const createToken = async () => {
    setCreating(true);
    try {
      const endpoint = tab === 'monitor' ? '/api/tokens' : '/api/keys';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = tab === 'monitor' ? data.token : data.key;
        setGeneratedToken(token);
        setNewTokenName('');
        fetchTokens();
      }
    } catch (error) {
      console.error('Failed to create token:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteToken = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const endpoint = tab === 'monitor' ? `/api/tokens?id=${id}` : `/api/keys?id=${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });

      if (res.ok) {
        fetchTokens();
      }
    } catch (error) {
      console.error('Failed to delete token:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
  };

  const items = tab === 'monitor' ? monitorTokens : apiKeys;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">토큰 관리</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 토큰 발급
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setTab('monitor')}
          className={`px-4 py-2 font-medium ${
            tab === 'monitor'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Monitor Token (Pass-through)
        </button>
        <button
          onClick={() => setTab('api')}
          className={`px-4 py-2 font-medium ${
            tab === 'api'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          API Key (Reseller)
        </button>
      </div>

      {/* Token List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          발급된 {tab === 'monitor' ? '토큰' : 'API 키'}가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-gray-200 px-2 py-1 rounded">
                    {'tokenPrefix' in item ? item.tokenPrefix : item.keyPrefix}
                  </code>
                  {item.name && (
                    <span className="text-sm text-gray-600">({item.name})</span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  생성: {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  {'lastUsedAt' in item && item.lastUsedAt && (
                    <> | 마지막 사용: {new Date(item.lastUsedAt).toLocaleDateString('ko-KR')}</>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteToken(item.id)}
                className="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Token Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {generatedToken ? (
              <>
                <h3 className="text-lg font-semibold mb-4 text-green-600">
                  토큰이 생성되었습니다!
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    ⚠️ 이 토큰은 다시 볼 수 없습니다. 지금 복사해서 안전한 곳에 저장하세요.
                  </p>
                </div>
                <div className="bg-gray-100 p-3 rounded mb-4">
                  <code className="text-sm break-all">{generatedToken}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(generatedToken)}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    복사하기
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedToken(null);
                      setShowModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    닫기
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4">
                  새 {tab === 'monitor' ? 'Monitor Token' : 'API Key'} 발급
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="예: 개발용, 프로덕션용"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded mb-4 text-sm text-gray-600">
                  {tab === 'monitor' ? (
                    <p>
                      <strong>Monitor Token</strong>은 Pass-through 방식에서 사용됩니다.
                      클라이언트가 자신의 OpenAI/Anthropic 키를 함께 전달하고,
                      이 토큰으로 사용량을 추적합니다.
                    </p>
                  ) : (
                    <p>
                      <strong>API Key</strong>는 Reseller 방식에서 사용됩니다.
                      잔액을 충전하고, 이 키 하나로 모든 Provider의 모델을 사용할 수 있습니다.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createToken}
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {creating ? '생성 중...' : '발급하기'}
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setNewTokenName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
