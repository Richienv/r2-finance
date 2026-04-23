import { prisma } from '../lib/prisma';

async function main() {
  const rows = await prisma.income.findMany();
  console.log(`found ${rows.length} income rows`);

  let copied = 0;
  for (const r of rows) {
    await prisma.macro.create({
      data: {
        date: r.date,
        amountRMB: r.amountRMB,
        amountIDR: r.amountIDR,
        type: 'INCOME',
        category: r.source,
        note: r.note,
        createdAt: r.createdAt,
      },
    });
    copied++;
  }

  console.log(`migrated ${copied} rows into macro`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
