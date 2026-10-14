import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Migrating 10,000 employee emails from vs{num}@sim.aocc.test to atc{num}@gmail.com...");

  const updateResult = await prisma.$executeRawUnsafe(`
    UPDATE "Employee"
    SET "email" = 'atc' || substring("employeeId" from '[0-9]+')::integer::text || '@gmail.com',
        "updatedAt" = NOW()
    WHERE "employeeId" LIKE 'AOCC-EMP-V%' OR "email" LIKE 'vs%@sim.aocc.test'
  `);

  console.log(`Updated ${updateResult} employees successfully!`);

  const sample9807 = await prisma.employee.findFirst({
    where: { employeeId: "AOCC-EMP-V09807" },
  });
  console.log("Verified sample AOCC-EMP-V09807 email:", sample9807?.email);

  const sample9803 = await prisma.employee.findFirst({
    where: { employeeId: "AOCC-EMP-V09803" },
  });
  console.log("Verified sample AOCC-EMP-V09803 email:", sample9803?.email);

  const sample1 = await prisma.employee.findFirst({
    where: { employeeId: "AOCC-EMP-V00001" },
  });
  console.log("Verified sample AOCC-EMP-V00001 email:", sample1?.email);
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
