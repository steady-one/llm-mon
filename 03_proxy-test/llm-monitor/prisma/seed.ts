import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const effectiveDate = new Date('2024-01-01');

  const pricingData = [
    // OpenAI
    { provider: 'openai', model: 'gpt-4o', inputPricePer1m: 2.50, outputPricePer1m: 10.00 },
    { provider: 'openai', model: 'gpt-4o-mini', inputPricePer1m: 0.15, outputPricePer1m: 0.60 },
    // Anthropic
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', inputPricePer1m: 3.00, outputPricePer1m: 15.00 },
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', inputPricePer1m: 0.80, outputPricePer1m: 4.00 },
    // Google
    { provider: 'google', model: 'gemini-1.5-pro', inputPricePer1m: 1.25, outputPricePer1m: 5.00 },
    { provider: 'google', model: 'gemini-1.5-flash', inputPricePer1m: 0.075, outputPricePer1m: 0.30 },
    // xAI
    { provider: 'xai', model: 'grok-beta', inputPricePer1m: 5.00, outputPricePer1m: 15.00 },
  ];

  console.log('Seeding pricing data...');

  for (const pricing of pricingData) {
    await prisma.pricing.upsert({
      where: {
        provider_model_effectiveDate: {
          provider: pricing.provider,
          model: pricing.model,
          effectiveDate,
        },
      },
      update: {
        inputPricePer1m: pricing.inputPricePer1m,
        outputPricePer1m: pricing.outputPricePer1m,
      },
      create: {
        ...pricing,
        effectiveDate,
      },
    });
    console.log(`  ✓ ${pricing.provider}/${pricing.model}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
