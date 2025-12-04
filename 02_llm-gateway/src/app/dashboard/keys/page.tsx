'use client'

import { useEffect, useState } from 'react'

interface ApiKey {
  id: string
  keyPrefix: string
  name: string | null
  isActive: boolean
  createdAt: string
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/keys')
      const data = await res.json()
      setApiKeys(data.apiKeys || [])
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const createApiKey = async () => {
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setShowNewKey(data.apiKey.key)
      setNewKeyName('')
      fetchApiKeys()
    } catch {
      setError('API 키 생성 중 오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    if (!confirm('이 API 키를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })

      if (res.ok) {
        fetchApiKeys()
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('클립보드에 복사되었습니다.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
      </div>

      {/* New Key Modal */}
      {showNewKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              API 키가 생성되었습니다
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              이 키는 다시 표시되지 않습니다. 안전한 곳에 저장해주세요.
            </p>
            <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm break-all">
              {showNewKey}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => copyToClipboard(showNewKey)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                복사
              </button>
              <button
                onClick={() => setShowNewKey(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create API Key */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          새 API Key 생성
        </h2>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="API 키 이름 (선택)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createApiKey}
            disabled={creating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            API Keys ({apiKeys.length})
          </h2>
        </div>
        {apiKeys.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            아직 생성된 API 키가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-900">
                      {key.keyPrefix}
                    </span>
                    {key.name && (
                      <span className="text-sm text-gray-500">({key.name})</span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        key.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {key.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    생성일: {new Date(key.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => deleteApiKey(key.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
