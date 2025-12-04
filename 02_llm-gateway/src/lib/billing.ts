// OpenAI pricing per 1M tokens (USD)
// Prices as of Dec 2024
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
}

// Default pricing for unknown models
const DEFAULT_PRICING = { input: 10.00, output: 30.00 }

// Margin percentage (20%)
const MARGIN_PERCENT = 0.20

export interface CostCalculation {
  providerCost: number
  margin: number
  totalCost: number
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): CostCalculation {
  const pricing = PRICING[model] || DEFAULT_PRICING

  // Calculate provider cost (price per 1M tokens * tokens / 1M)
  const inputCost = (pricing.input * inputTokens) / 1_000_000
  const outputCost = (pricing.output * outputTokens) / 1_000_000
  const providerCost = inputCost + outputCost

  // Calculate margin
  const margin = providerCost * MARGIN_PERCENT

  // Total cost to customer
  const totalCost = providerCost + margin

  return {
    providerCost: Number(providerCost.toFixed(6)),
    margin: Number(margin.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
  }
}

export function getModelPricing(model: string) {
  return PRICING[model] || DEFAULT_PRICING
}

export function getSupportedModels(): string[] {
  return Object.keys(PRICING)
}
