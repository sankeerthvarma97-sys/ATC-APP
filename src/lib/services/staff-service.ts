import type {
  DepartmentType,
  EmployeeDTO,
  EmployeeStatus,
  Role,
  VerificationStatus,
} from "@/lib/domain";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import { logAuditEvent } from "./audit-service";
import { assertSuperAdminNotTargeted, isProtectedSuperAdmin } from "@/lib/auth/protection";

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  phone: string;
  department: DepartmentType;
  jobTitle: string;
  role: Role;
  airportCode: string;
  terminal?: string;
  gateArea?: string;
  shift: string;
  status?: EmployeeStatus;
  verificationStatus?: VerificationStatus;
  permissions?: string[];
  actorId?: string;
  actorName?: string;
}

export interface UpdateEmployeeInput {
  fullName?: string;
  phone?: string;
  department?: DepartmentType;
  jobTitle?: string;
  role?: Role;
  airportCode?: string;
  terminal?: string;
  gateArea?: string;
  shift?: string;
  status?: EmployeeStatus;
  verificationStatus?: VerificationStatus;
  permissions?: string[];
  actorId?: string;
  actorName?: string;
}

// In-memory demo staff storage
const memoryEmployees: EmployeeDTO[] = [
  {
    id: "emp-0001",
    employeeId: "EMP-0001",
    fullName: "Permanent Super Admin",
    email: process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@gmail.com",
    phone: "+91 80000 00001",
    department: "ADMINISTRATION",
    jobTitle: "Airport Authority System Owner",
    role: "SUPER_ADMIN",
    airportCode: "HYD",
    terminal: "ALL",
    gateArea: "ALL",
    shift: "ALL",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    joinDate: new Date("2024-01-01").toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["SUPER_ADMIN_ALL_ACCESS"],
    userId: "usr-super-admin",
  },
  {
    id: "emp-1001",
    employeeId: "EMP-1001",
    fullName: "Maya Rao",
    email: "admin@aocc.test",
    phone: "+91 98765 43210",
    department: "ADMINISTRATION",
    jobTitle: "Airport Operations Director",
    role: "ADMIN",
    airportCode: "HYD",
    terminal: "T1",
    gateArea: "North Ramp",
    shift: "OPS-A",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    joinDate: new Date(Date.now() - 365 * 86400_000).toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["VIEW_DASHBOARD", "CREATE_FLIGHT", "MANAGE_STAFF", "MANAGE_AIRLINES"],
    userId: "usr-admin",
  },
  {
    id: "emp-1002",
    employeeId: "EMP-1002",
    fullName: "Evan Torres",
    email: "atc@aocc.test",
    phone: "+91 98765 43211",
    department: "AIR_TRAFFIC_CONTROL",
    jobTitle: "Senior Tower Controller",
    role: "ATC",
    airportCode: "HYD",
    terminal: "Tower",
    gateArea: "Runway Complex",
    shift: "TOWER-E",
    status: "ON_DUTY",
    verificationStatus: "VERIFIED",
    joinDate: new Date(Date.now() - 200 * 86400_000).toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["CONTROL_ATC", "VIEW_TRAFFIC", "MANAGE_EMERGENCIES"],
    userId: "usr-atc",
  },
  {
    id: "emp-1003",
    employeeId: "EMP-1003",
    fullName: "Priya Nair",
    email: "ground@aocc.test",
    phone: "+91 98765 43212",
    department: "GROUND_OPERATIONS",
    jobTitle: "Ramp Marshall Supervisor",
    role: "GROUND",
    airportCode: "HYD",
    terminal: "T1",
    gateArea: "Apron B",
    shift: "RAMP-2",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    joinDate: new Date(Date.now() - 150 * 86400_000).toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["MANAGE_GROUND_OPERATIONS", "MANAGE_GATES"],
    userId: "usr-ground",
  },
  {
    id: "emp-1004",
    employeeId: "EMP-1004",
    fullName: "Karan Sharma",
    email: "ticket@aocc.test",
    phone: "+91 98765 43213",
    department: "TICKETING",
    jobTitle: "Lead Passenger Service Agent",
    role: "TICKETING_AGENT",
    airportCode: "HYD",
    terminal: "T1",
    gateArea: "Counters 10-18",
    shift: "MORNING",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    joinDate: new Date(Date.now() - 80 * 86400_000).toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["CREATE_BOOKING", "VERIFY_TICKET", "CHECK_IN_PASSENGER"],
  },
  {
    id: "emp-1005",
    employeeId: "EMP-1005",
    fullName: "Ananya Desai",
    email: "gate@aocc.test",
    phone: "+91 98765 43214",
    department: "PASSENGER_SERVICES",
    jobTitle: "Senior Gate Controller",
    role: "GATE_AGENT",
    airportCode: "HYD",
    terminal: "T1",
    gateArea: "Gate B12",
    shift: "EVENING",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    joinDate: new Date(Date.now() - 60 * 86400_000).toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["VERIFY_TICKET", "CHECK_IN_PASSENGER", "BOARD_PASSENGER"],
  },
];

let nextEmpSeq = 1006;

export async function listEmployees(filters?: {
  department?: DepartmentType;
  role?: Role;
  status?: EmployeeStatus;
  search?: string;
}): Promise<EmployeeDTO[]> {
  if (shouldUseDatabase()) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.department) where.department = filters.department;
      if (filters?.role) where.role = filters.role;
      if (filters?.status) where.status = filters.status;
      if (filters?.search) {
        where.OR = [
          { fullName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { employeeId: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const employees = await prisma.employee.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      if (employees.length > 0) {
        return employees.map((emp) => ({
          id: emp.id,
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          department: emp.department as DepartmentType,
          jobTitle: emp.jobTitle,
          role: emp.role as Role,
          airportCode: emp.airportCode,
          terminal: emp.terminal ?? undefined,
          gateArea: emp.gateArea ?? undefined,
          shift: emp.shift,
          status: emp.status as EmployeeStatus,
          verificationStatus: emp.verificationStatus as VerificationStatus,
          joinDate: emp.joinDate.toISOString(),
          lastLogin: emp.lastLogin?.toISOString() ?? undefined,
          permissions: emp.permissions,
          userId: emp.userId ?? undefined,
        }));
      }
    } catch (error) {
      console.warn("Database employee query failed; using memory.", error);
    }
  }

  let result = [...memoryEmployees];
  if (filters?.department) {
    result = result.filter((e) => e.department === filters.department);
  }
  if (filters?.role) {
    result = result.filter((e) => e.role === filters.role);
  }
  if (filters?.status) {
    result = result.filter((e) => e.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q),
    );
  }
  return result;
}

export async function getEmployeeById(id: string): Promise<EmployeeDTO | null> {
  if (shouldUseDatabase()) {
    try {
      const emp = await prisma.employee.findFirst({
        where: { OR: [{ id }, { employeeId: id }] },
      });
      if (emp) {
        return {
          id: emp.id,
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          department: emp.department as DepartmentType,
          jobTitle: emp.jobTitle,
          role: emp.role as Role,
          airportCode: emp.airportCode,
          terminal: emp.terminal ?? undefined,
          gateArea: emp.gateArea ?? undefined,
          shift: emp.shift,
          status: emp.status as EmployeeStatus,
          verificationStatus: emp.verificationStatus as VerificationStatus,
          joinDate: emp.joinDate.toISOString(),
          lastLogin: emp.lastLogin?.toISOString() ?? undefined,
          permissions: emp.permissions,
          userId: emp.userId ?? undefined,
        };
      }
    } catch (error) {
      console.warn("Database getEmployeeById failed; checking memory.", error);
    }
  }

  return memoryEmployees.find((e) => e.id === id || e.employeeId === id) ?? null;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeDTO> {
  const employeeId = `EMP-${nextEmpSeq++}`;
  const id = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const dto: EmployeeDTO = {
    id,
    employeeId,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    department: input.department,
    jobTitle: input.jobTitle,
    role: input.role,
    airportCode: input.airportCode || "HYD",
    terminal: input.terminal,
    gateArea: input.gateArea,
    shift: input.shift || "MORNING",
    status: input.status || "PENDING",
    verificationStatus: input.verificationStatus || "PENDING",
    joinDate: new Date().toISOString(),
    permissions: input.permissions ?? [],
  };

  memoryEmployees.unshift(dto);

  if (shouldUseDatabase()) {
    try {
      await prisma.employee.create({
        data: {
          id: dto.id,
          employeeId: dto.employeeId,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          department: dto.department,
          jobTitle: dto.jobTitle,
          role: dto.role,
          airportCode: dto.airportCode,
          terminal: dto.terminal,
          gateArea: dto.gateArea,
          shift: dto.shift,
          status: dto.status,
          verificationStatus: dto.verificationStatus,
          permissions: dto.permissions,
        },
      });
    } catch (error) {
      console.warn("Database createEmployee failed; persisted to memory.", error);
    }
  }

  await logAuditEvent({
    actorId: input.actorId,
    actorName: input.actorName,
    action: "ADMIN_CREATED_EMPLOYEE",
    entity: "EMPLOYEE",
    entityId: dto.employeeId,
    after: {
      employeeId: dto.employeeId,
      fullName: dto.fullName,
      role: dto.role,
      department: dto.department,
    },
  });

  return dto;
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<EmployeeDTO | null> {
  const existing = await getEmployeeById(id);
  if (!existing) return null;

  // Server-level protection for Permanent Super Admin
  const protection = assertSuperAdminNotTargeted(existing, "MODIFY", {
    role: input.role,
    status: input.status,
    verificationStatus: input.verificationStatus,
    permissions: input.permissions,
  });
  if (!protection.ok) {
    throw new Error(protection.error);
  }

  const updated: EmployeeDTO = {
    ...existing,
    fullName: input.fullName ?? existing.fullName,
    phone: input.phone ?? existing.phone,
    department: input.department ?? existing.department,
    jobTitle: input.jobTitle ?? existing.jobTitle,
    role: input.role ?? existing.role,
    airportCode: input.airportCode ?? existing.airportCode,
    terminal: input.terminal !== undefined ? input.terminal : existing.terminal,
    gateArea: input.gateArea !== undefined ? input.gateArea : existing.gateArea,
    shift: input.shift ?? existing.shift,
    status: input.status ?? existing.status,
    verificationStatus: input.verificationStatus ?? existing.verificationStatus,
    permissions: input.permissions ?? existing.permissions,
  };

  const memIndex = memoryEmployees.findIndex((e) => e.id === existing.id);
  if (memIndex !== -1) {
    memoryEmployees[memIndex] = updated;
  }

  if (shouldUseDatabase()) {
    try {
      await prisma.employee.update({
        where: { id: existing.id },
        data: {
          fullName: updated.fullName,
          phone: updated.phone,
          department: updated.department,
          jobTitle: updated.jobTitle,
          role: updated.role,
          airportCode: updated.airportCode,
          terminal: updated.terminal,
          gateArea: updated.gateArea,
          shift: updated.shift,
          status: updated.status,
          verificationStatus: updated.verificationStatus,
          permissions: updated.permissions,
        },
      });
    } catch (error) {
      console.warn("Database updateEmployee failed; updated in memory.", error);
    }
  }

  if (input.verificationStatus === "VERIFIED" && existing.verificationStatus !== "VERIFIED") {
    await logAuditEvent({
      actorId: input.actorId,
      actorName: input.actorName,
      action: "EMPLOYEE_VERIFIED",
      entity: "EMPLOYEE",
      entityId: existing.employeeId,
      after: { verificationStatus: "VERIFIED" },
    });
  }

  if (input.status === "SUSPENDED" && existing.status !== "SUSPENDED") {
    await logAuditEvent({
      actorId: input.actorId,
      actorName: input.actorName,
      action: "EMPLOYEE_SUSPENDED",
      entity: "EMPLOYEE",
      entityId: existing.employeeId,
      after: { status: "SUSPENDED" },
    });
  }

  if (input.role && input.role !== existing.role) {
    await logAuditEvent({
      actorId: input.actorId,
      actorName: input.actorName,
      action: "ROLE_ASSIGNED",
      entity: "EMPLOYEE",
      entityId: existing.employeeId,
      before: { role: existing.role },
      after: { role: input.role },
    });
  }

  if (input.permissions) {
    await logAuditEvent({
      actorId: input.actorId,
      actorName: input.actorName,
      action: "PERMISSION_CHANGED",
      entity: "EMPLOYEE",
      entityId: existing.employeeId,
      after: { permissions: input.permissions },
    });
  }

  return updated;
}

export async function deleteEmployee(
  id: string,
  actor?: { id?: string; name?: string },
): Promise<{ ok: boolean; error?: string }> {
  const existing = await getEmployeeById(id);
  if (!existing) {
    return { ok: false, error: "Employee not found" };
  }

  const protection = assertSuperAdminNotTargeted(existing, "DELETE");
  if (!protection.ok) {
    return { ok: false, error: protection.error };
  }

  const memIndex = memoryEmployees.findIndex((e) => e.id === existing.id);
  if (memIndex !== -1) {
    memoryEmployees.splice(memIndex, 1);
  }

  if (shouldUseDatabase()) {
    try {
      await prisma.employee.delete({
        where: { id: existing.id },
      });
    } catch (err) {
      console.warn("Database deleteEmployee failed:", err);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "ADMIN_DELETED_EMPLOYEE",
    entity: "EMPLOYEE",
    entityId: existing.employeeId,
    before: existing as unknown as Record<string, unknown>,
  });

  return { ok: true };
}

export async function resetEmployeeAccess(
  id: string,
  actor?: { id?: string; name?: string },
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const existing = await getEmployeeById(id);
  if (!existing) {
    return { ok: false, error: "Employee not found" };
  }

  if (isProtectedSuperAdmin(existing)) {
    return { ok: false, error: "Protected system owner account cannot be modified or removed." };
  }

  if (shouldUseDatabase() && existing.userId) {
    try {
      await prisma.session.deleteMany({
        where: { userId: existing.userId },
      });
    } catch (err) {
      console.warn("Database session revocation failed:", err);
    }
  }

  await logAuditEvent({
    actorId: actor?.id,
    actorName: actor?.name,
    action: "EMPLOYEE_ACCESS_RESET",
    entity: "EMPLOYEE",
    entityId: existing.employeeId,
    after: { sessionsRevoked: true, forcedReauth: true },
  });

  return { ok: true, message: `Access reset successfully for ${existing.fullName}. All active sessions revoked.` };
}
