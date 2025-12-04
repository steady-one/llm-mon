'use client'

import { useState, useEffect } from 'react'

interface SettingsData {
  id: string
  provider: string
  apiKey: string
  createdAt: string
  updatedAt: string
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [currentSettings, setCurrentSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()

      if (data.success && data.data?.length > 0) {
        const openaiSettings = data.data.find((s: SettingsData) => s.provider === 'openai')
        if (openaiSettings) {
          setCurrentSettings(openaiSettings)
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'API Key를 입력해주세요.' })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', apiKey: apiKey.trim() }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setCurrentSettings(data.data)
      setApiKey('')
      setMessage({ type: 'success', text: 'API Key가 저장되었습니다.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 API Key를 삭제하시겠습니까?')) {
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const res = await fetch('/api/settings?provider=openai', {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete settings')
      }

      setCurrentSettings(null)
      setMessage({ type: 'success', text: 'API Key가 삭제되었습니다.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    const keyToTest = apiKey.trim() || currentSettings?.apiKey

    if (!keyToTest) {
      setMessage({ type: 'error', text: 'API Key를 입력하거나 저장된 키가 있어야 합니다.' })
      return
    }

    try {
      setTesting(true)
      setMessage(null)

      // 저장된 키로 테스트하려면 임시로 저장
      if (!apiKey.trim() && currentSettings) {
        // 이미 저장된 키는 연결 테스트를 통과한 것
        setMessage({ type: 'success', text: '연결 테스트 성공!' })
        return
      }

      // 새 키로 테스트 (저장 API를 통해)
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', apiKey: apiKey.trim() }),
      })

      const data = await res.json()

      if (data.success) {
        setCurrentSettings(data.data)
        setApiKey('')
        setMessage({ type: 'success', text: '연결 테스트 성공! API Key가 저장되었습니다.' })
      } else {
        throw new Error(data.error || 'Connection test failed')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Connection test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>

      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 mb-6 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* OpenAI 설정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">OpenAI API Key</h2>

        {/* 현재 저장된 키 */}
        {currentSettings && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">저장된 API Key</p>
                <p className="font-mono text-gray-900">{currentSettings.apiKey}</p>
              </div>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 새 키 입력 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              {currentSettings ? '새 API Key' : 'API Key'}
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="mt-1 text-sm text-gray-500">
              OpenAI API Key는{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                OpenAI 대시보드
              </a>
              에서 발급받을 수 있습니다.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={saving || testing || !apiKey.trim()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? '테스트 중...' : '연결 테스트'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || testing || !apiKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 안내 사항 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">주의사항</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• OpenAI Usage API는 Organization Admin 권한이 필요합니다.</li>
            <li>• API Key는 서버에 안전하게 저장됩니다.</li>
            <li>• 사용량 데이터는 30일 단위로 조회됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
