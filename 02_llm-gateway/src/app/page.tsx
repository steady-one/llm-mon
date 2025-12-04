import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">LLM Gateway</h1>
          <div className="flex gap-4">
            <Link
              href="/auth/signin"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              로그인
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              하나의 API Key로<br />모든 LLM을 사용하세요
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              OpenAI, Anthropic, Google 등 여러 LLM Provider를
              하나의 통합 API Key로 간편하게 사용하세요.
              사용량 추적과 비용 관리까지 한 곳에서.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                무료로 시작하기
              </Link>
              <Link
                href="#features"
                className="px-8 py-3 text-lg font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                자세히 보기
              </Link>
            </div>
          </div>

          {/* Code Example */}
          <div className="max-w-3xl mx-auto bg-gray-900 rounded-2xl p-6 shadow-2xl">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <pre className="text-sm text-gray-100 overflow-x-auto">
              <code>{`from openai import OpenAI

# LLM Gateway - 하나의 Key로 모든 모델 사용
client = OpenAI(
    api_key="llm_sk_...",  # 우리가 발급한 통합 Key
    base_url="https://api.llmgateway.com/v1"
)

# GPT-4 사용
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Claude 사용 (같은 코드, 같은 Key!)
response = client.chat.completions.create(
    model="claude-3-5-sonnet",
    messages=[{"role": "user", "content": "Hello!"}]
)`}</code>
            </pre>
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            왜 LLM Gateway인가요?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">&#x1F511;</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                통합 API Key
              </h4>
              <p className="text-gray-600">
                여러 Provider에 개별적으로 가입하고 Key를 관리할 필요 없이,
                하나의 Key로 모든 LLM을 사용하세요.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">&#x1F4CA;</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                사용량 추적
              </h4>
              <p className="text-gray-600">
                실시간으로 API 사용량과 비용을 추적하세요.
                모델별, 기간별 상세 분석을 제공합니다.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">&#x1F4B0;</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                선불 크레딧
              </h4>
              <p className="text-gray-600">
                예측 가능한 비용 관리. 크레딧을 충전하고
                사용한 만큼만 차감됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">
            투명한 가격 정책
          </h3>
          <p className="text-gray-600 text-center mb-12">
            Provider 원가 + 20% 마진. 숨겨진 비용 없이 명확하게.
          </p>
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">모델</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">입력 (1M tokens)</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">출력 (1M tokens)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">GPT-4o</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">$3.00</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">$12.00</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">GPT-4o-mini</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">$0.18</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">$0.72</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">GPT-4 Turbo</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">$12.00</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">$36.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h3>
          <p className="text-blue-100 mb-8">
            가입 후 바로 API Key를 발급받고 사용할 수 있습니다.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-3 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-gray-100"
          >
            무료 가입하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-400 text-sm">
          <p>LLM Gateway - Unified API for All LLMs</p>
        </div>
      </footer>
    </div>
  )
}
