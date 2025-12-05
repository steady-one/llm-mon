import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const effectiveDate = new Date('2024-01-01');

  const pricingData = [
    // OpenAI
    { provider: 'openai', model: 'gpt-4o', inputPricePer1m: 2.50, outputPricePer1m: 10.00 },
    { provider: 'openai', model: 'gpt-4o-mini', inputPricePer1m: 0.15, outputPricePer1m: 0.60 },
    // Anthropic (Claude 4.5)
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', inputPricePer1m: 3.00, outputPricePer1m: 15.00 },
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', inputPricePer1m: 0.80, outputPricePer1m: 4.00 },
    // Anthropic (Claude 3.5 - legacy)
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', inputPricePer1m: 3.00, outputPricePer1m: 15.00 },
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', inputPricePer1m: 0.80, outputPricePer1m: 4.00 },
    // Google
    { provider: 'google', model: 'gemini-1.5-pro', inputPricePer1m: 1.25, outputPricePer1m: 5.00 },
    { provider: 'google', model: 'gemini-1.5-flash', inputPricePer1m: 0.075, outputPricePer1m: 0.30 },
    { provider: 'google', model: 'gemini-2.0-flash-exp', inputPricePer1m: 0.10, outputPricePer1m: 0.40 },
    // xAI (Grok)
    { provider: 'xai', model: 'grok-3', inputPricePer1m: 3.00, outputPricePer1m: 15.00 },
    { provider: 'xai', model: 'grok-3-mini', inputPricePer1m: 0.30, outputPricePer1m: 0.50 },
    { provider: 'xai', model: 'grok-2-1212', inputPricePer1m: 2.00, outputPricePer1m: 10.00 },
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
      update: pricing,
      create: { ...pricing, effectiveDate },
    });
    console.log(`  ✓ ${pricing.provider}/${pricing.model}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
