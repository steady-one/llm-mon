'use client';

import { useState, useEffect, useCallback } from 'react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export default function BalanceManager() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<string>('10');
  const [showChargeModal, setShowChargeModal] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/balance');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleCharge = async () => {
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 금액을 입력하세요.');
      return;
    }

    setCharging(true);
    try {
      const res = await fetch('/api/balance/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setShowChargeModal(false);
        setChargeAmount('10');
        fetchBalance(); // 트랜잭션 목록 새로고침
      } else {
        const data = await res.json();
        alert(data.error || '충전에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to charge:', error);
      alert('충전에 실패했습니다.');
    } finally {
      setCharging(false);
    }
  };

  const presetAmounts = [5, 10, 20, 50, 100];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">잔액 관리</h2>
        <button
          onClick={() => setShowChargeModal(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          잔액 충전
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white mb-6">
        <p className="text-sm opacity-80">현재 잔액</p>
        <p className="text-4xl font-bold mt-1">
          {loading ? '...' : `$${balance.toFixed(2)}`}
        </p>
        <p className="text-sm opacity-80 mt-2">
          Reseller 모드에서 API 호출 시 자동으로 차감됩니다.
        </p>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-lg font-medium mb-3">거래 내역</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            거래 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        tx.type === 'charge'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tx.type === 'charge' ? '충전' : '사용'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {tx.description || (tx.type === 'charge' ? '잔액 충전' : 'API 사용')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(tx.createdAt).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-500">
                    잔액: ${tx.balanceAfter.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">잔액 충전</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                충전 금액 (USD)
              </label>
              <div className="flex gap-2 mb-3 flex-wrap">
                {presetAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setChargeAmount(amount.toString())}
                    className={`px-3 py-1.5 rounded text-sm ${
                      chargeAmount === amount.toString()
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                min="1"
                step="0.01"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="직접 입력"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                테스트용 충전 기능입니다. 실제 결제는 발생하지 않습니다.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCharge}
                disabled={charging}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {charging ? '충전 중...' : `$${chargeAmount || '0'} 충전하기`}
              </button>
              <button
                onClick={() => {
                  setShowChargeModal(false);
                  setChargeAmount('10');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
