'use client'

import { useEffect, useState } from 'react'

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

export default function BillingPage() {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [charging, setCharging] = useState(false)
  const [chargeAmount, setChargeAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/balance')
      const data = await res.json()
      setBalance(data.balance || 0)
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [])

  const handleCharge = async (amount: number) => {
    setCharging(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/balance/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setSuccess(`$${amount} 충전이 완료되었습니다.`)
      setChargeAmount('')
      fetchBalance()
    } catch {
      setError('충전 중 오류가 발생했습니다.')
    } finally {
      setCharging(false)
    }
  }

  const quickChargeAmounts = [10, 50, 100, 500]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">빌링</h1>

      {/* Current Balance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">현재 잔액</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              ${balance.toFixed(2)}
            </p>
          </div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">$</span>
          </div>
        </div>
      </div>

      {/* Charge Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">크레딧 충전</h2>
        <p className="text-sm text-gray-600 mb-4">
          MVP 버전에서는 테스트 목적으로 수동 충전이 가능합니다.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Quick Charge Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickChargeAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleCharge(amount)}
              disabled={charging}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <span className="text-lg font-semibold text-gray-900">${amount}</span>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              placeholder="직접 입력"
              min="1"
              max="1000"
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => handleCharge(Number(chargeAmount))}
            disabled={charging || !chargeAmount || Number(chargeAmount) <= 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {charging ? '충전 중...' : '충전'}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">거래 내역</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            아직 거래 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        tx.type === 'charge'
                          ? 'bg-green-500'
                          : tx.type === 'usage'
                          ? 'bg-red-500'
                          : 'bg-gray-500'
                      }`}
                    ></span>
                    <span className="font-medium text-gray-900">
                      {tx.type === 'charge'
                        ? '충전'
                        : tx.type === 'usage'
                        ? 'API 사용'
                        : tx.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {tx.description || '-'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(tx.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(4)}
                  </p>
                  <p className="text-sm text-gray-500">
                    잔액: ${tx.balanceAfter.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
