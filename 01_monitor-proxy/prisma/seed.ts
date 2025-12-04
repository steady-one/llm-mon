import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // OpenAI Pricing Data
  const openaiPricing = [
    { model: 'gpt-4-turbo', inputPricePer1m: 10.00, outputPricePer1m: 30.00 },
    { model: 'gpt-4-turbo-preview', inputPricePer1m: 10.00, outputPricePer1m: 30.00 },
    { model: 'gpt-4o', inputPricePer1m: 2.50, outputPricePer1m: 10.00 },
    { model: 'gpt-4o-mini', inputPricePer1m: 0.15, outputPricePer1m: 0.60 },
    { model: 'gpt-4', inputPricePer1m: 30.00, outputPricePer1m: 60.00 },
    { model: 'gpt-3.5-turbo', inputPricePer1m: 0.50, outputPricePer1m: 1.50 },
    { model: 'text-embedding-3-small', inputPricePer1m: 0.02, outputPricePer1m: 0 },
    { model: 'text-embedding-3-large', inputPricePer1m: 0.13, outputPricePer1m: 0 },
    { model: 'text-embedding-ada-002', inputPricePer1m: 0.10, outputPricePer1m: 0 },
  ]

  for (const pricing of openaiPricing) {
    await prisma.pricing.upsert({
      where: {
        provider_model_effectiveDate: {
          provider: 'openai',
          model: pricing.model,
          effectiveDate: new Date('2024-01-01'),
        },
      },
      update: {},
      create: {
        provider: 'openai',
        model: pricing.model,
        inputPricePer1m: pricing.inputPricePer1m,
        outputPricePer1m: pricing.outputPricePer1m,
        effectiveDate: new Date('2024-01-01'),
      },
    })
  }

  console.log('Seed data inserted successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
