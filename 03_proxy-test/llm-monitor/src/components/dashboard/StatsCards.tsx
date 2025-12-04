'use client';

interface StatsCardsProps {
  stats: {
    total: {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      totalCost: number;
      estimatedCost: number;
    };
    balance: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: '총 요청 수',
      value: stats.total.requests.toLocaleString(),
      color: 'bg-blue-500',
    },
    {
      title: '총 토큰',
      value: (stats.total.inputTokens + stats.total.outputTokens).toLocaleString(),
      subtitle: `입력: ${stats.total.inputTokens.toLocaleString()} / 출력: ${stats.total.outputTokens.toLocaleString()}`,
      color: 'bg-green-500',
    },
    {
      title: '비용 (Reseller)',
      value: `$${stats.total.totalCost.toFixed(4)}`,
      color: 'bg-purple-500',
    },
    {
      title: '예상 비용 (Pass-through)',
      value: `$${stats.total.estimatedCost.toFixed(4)}`,
      color: 'bg-orange-500',
    },
    {
      title: '현재 잔액',
      value: `$${stats.balance.toFixed(2)}`,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow p-4"
        >
          <div className={`w-2 h-2 rounded-full ${card.color} mb-2`} />
          <p className="text-sm text-gray-500">{card.title}</p>
          <p className="text-2xl font-bold">{card.value}</p>
          {card.subtitle && (
            <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
