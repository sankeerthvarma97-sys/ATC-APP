import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: { in: ["SUPER_ADMIN", "ADMIN", "AIRPORT_ADMIN"] } },
        { email: { contains: "admin" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true, creditBalance: true },
  });
  console.log("Admin users in DB:", JSON.stringify(users, null, 2));

  const targetAmount = 600_000_000_000.0; // ₹600 Billion

  for (const user of users) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { creditBalance: targetAmount },
    });
    console.log(`Updated user ${user.email} (${user.role}) wallet to: ₹${updated.creditBalance.toLocaleString()}`);

    // Create a credit transaction record for the ledger
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        type: "SIMULATION_TOP_UP",
        amount: targetAmount,
        balanceBefore: user.creditBalance,
        balanceAfter: targetAmount,
        referenceType: "ADMIN_CAPITAL_ALLOCATION",
        referenceId: `ALLOC-${Date.now()}`,
        description: "Admin Master Simulation Capital Allocation (₹600 Billion)",
      },
    });
    console.log(`Recorded credit transaction of ₹${targetAmount.toLocaleString()} for ${user.email}`);
  }

  // Update FinanceConfig if exists
  await prisma.financeConfig.upsert({
    where: { id: "default" },
    update: {
      maxWalletBalance: 1_000_000_000_000.0,
      maxWalletTopUp: 1_000_000_000_000.0,
    },
    create: {
      id: "default",
      initialCapital: 100_000_000.0,
      autoPayrollEnabled: true,
      maxWalletBalance: 1_000_000_000_000.0,
      maxWalletTopUp: 1_000_000_000_000.0,
    },
  });
  console.log("FinanceConfig updated: maxWalletBalance and maxWalletTopUp set to 1,000 Billion.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
