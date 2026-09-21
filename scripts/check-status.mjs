import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const users = await prisma.user.count();
  const airports = await prisma.airport.count();
  const airlines = await prisma.airline.count();
  const aircraft = await prisma.aircraft.count();
  const employees = await prisma.employee.count();
  const rolePermissions = await prisma.rolePermission.count();
  const flights = await prisma.flight.count();
  const seats = await prisma.seat.count();
  const superAdmin = await prisma.user.findUnique({ where: { email: "admin@gmail.com" } });
  
  console.log(JSON.stringify({
    users,
    airports,
    airlines,
    aircraft,
    employees,
    rolePermissions,
    flights,
    seats,
    superAdminExists: Boolean(superAdmin),
    superAdminRole: superAdmin?.role,
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
