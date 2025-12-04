import { prisma } from "./prisma"

interface UsageInfo {
  inputTokens: number
  outputTokens: number
}

export async function calculateCost(
  provider: string,
  model: string,
  usage: UsageInfo
): Promise<number | null> {
  const pricing = await prisma.pricing.findFirst({
    where: {
      provider,
      model,
    },
    orderBy: {
      effectiveDate: "desc",
    },
  })

  if (!pricing) {
    // Try to find a partial match for model name
    const partialPricing = await prisma.pricing.findFirst({
      where: {
        provider,
        model: {
          startsWith: model.split("-").slice(0, 2).join("-"),
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    })

    if (!partialPricing) {
      return null
    }

    const inputCost = (usage.inputTokens / 1_000_000) * partialPricing.inputPricePer1m
    const outputCost = (usage.outputTokens / 1_000_000) * partialPricing.outputPricePer1m
    return inputCost + outputCost
  }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPricePer1m
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPricePer1m
  return inputCost + outputCost
}
