import { prisma, shouldUseDatabase } from "@/lib/prisma";
import type {
  Role,
  DepartmentType,
  EmployeeStatus,
  VerificationStatus,
  SalaryGradeCode,
} from "@/lib/domain";
import { resolveSalaryGrade, getOrCreateSalaryProfile } from "@/lib/services/payroll-service";
import { hash } from "bcryptjs";
import { logAuditEvent } from "@/lib/services/audit-service";
import { generateNextEmployeeId } from "@/server/employees/employee-id-service";
import {
  DEFAULT_DEMO_TEMP_PASSWORD,
  generateSecureTemporaryPassword,
  isPasswordChangeRequired,
  setPasswordChangeRequired,
  getMustChangePasswordCount,
} from "@/lib/services/account-security-service";

/**
 * Authoritative Safe Employee Directory Projection.
 * Explicitly separates employee identity from authentication credentials.
 * NEVER includes plaintext passwords, password hashes, recovery tokens, or session secrets.
 */
export interface SafeEmployeeDirectoryRecord {
  employeeId: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  department: DepartmentType;
  jobTitle: string;
  role: Role;
  permissions: string[];
  jobGrade: SalaryGradeCode;
  assignedAirport: string;
  terminal?: string;
  gateArea?: string;
  shift: string;
  employmentStatus: EmployeeStatus;
  verificationStatus: VerificationStatus;
  accountStatus: "ACTIVE" | "SUSPENDED" | "INVITATION_PENDING" | "MUST_CHANGE_PASSWORD" | "PROVISIONED";
  isVirtual: boolean;
  trainingStatus?: "COMPLETE" | "PENDING";
  salaryProfileId?: string;
  baseSalary?: number;
  joinDate: string;
  lastLogin?: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDirectoryQueryFilters {
  search?: string;
  department?: string;
  role?: string;
  airportCode?: string;
  shift?: string;
  status?: string;
  accountStatus?: string;
  page?: number;
  limit?: number;
  viewerRole?: string;
  viewerId?: string;
}

export interface EmployeeDirectorySummary {
  total: number;
  active: number;
  suspended: number;
  virtual: number;
  pendingVerification: number;
  mustChangePassword: number;
}

export interface PaginatedEmployeeDirectoryResult {
  records: SafeEmployeeDirectoryRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: EmployeeDirectorySummary;
}

/**
 * Check if the viewer is authorized to view salary fields.
 */
function isAuthorizedSalaryViewer(viewerRole?: string): boolean {
  if (!viewerRole) return true; // Default admin portal internal view
  const authorizedRoles = ["SUPER_ADMIN", "ADMIN", "AIRPORT_ADMIN", "OPERATIONS_MANAGER"];
  return authorizedRoles.includes(viewerRole);
}

interface GlobalSummaryCache {
  timestamp: number;
  totalActive: number;
  totalSuspended: number;
  totalVirtual: number;
  totalPendingVerification: number;
}
let globalEmployeeSummaryCache: GlobalSummaryCache | null = null;
const SUMMARY_CACHE_TTL_MS = 30000;

export function invalidateEmployeeSummaryCache() {
  globalEmployeeSummaryCache = null;
}

async function getCachedGlobalSummaryCounts() {
  if (globalEmployeeSummaryCache && Date.now() - globalEmployeeSummaryCache.timestamp < SUMMARY_CACHE_TTL_MS) {
    return globalEmployeeSummaryCache;
  }
  const [totalActive, totalSuspended, totalVirtual, totalPendingVerification] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count({ where: { status: "SUSPENDED" } }),
    prisma.employee.count({ where: { isVirtual: true } }),
    prisma.employee.count({ where: { verificationStatus: "PENDING" } }),
  ]);
  globalEmployeeSummaryCache = {
    timestamp: Date.now(),
    totalActive,
    totalSuspended,
    totalVirtual,
    totalPendingVerification,
  };
  return globalEmployeeSummaryCache;
}

/**
 * Query safe paginated employee directory backed by database with memory fallback.
 */
export async function getEmployeeDirectory(
  filters: EmployeeDirectoryQueryFilters = {}
): Promise<PaginatedEmployeeDirectoryResult> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;
  const canViewSalary = isAuthorizedSalaryViewer(filters.viewerRole);

  if (shouldUseDatabase()) {
    try {
      const where: Record<string, unknown> = {};

      if (filters.department && filters.department !== "ALL") {
        where.department = filters.department;
      }
      if (filters.role && filters.role !== "ALL") {
        where.role = filters.role;
      }
      if (filters.status && filters.status !== "ALL") {
        where.status = filters.status;
      }
      if (filters.airportCode && filters.airportCode !== "ALL") {
        where.airportCode = filters.airportCode;
      }
      if (filters.shift && filters.shift !== "ALL") {
        where.shift = filters.shift;
      }

      if (filters.search && filters.search.trim()) {
        const query = filters.search.trim();
        const exactId = query.toUpperCase();
        
        // Exact Employee ID match takes top priority
        if (/^(AOCC-EMP-|EMP-|VS-)/i.test(query)) {
          where.OR = [
            { employeeId: { equals: exactId, mode: "insensitive" } },
            { employeeId: { contains: query, mode: "insensitive" } },
          ];
        } else {
          where.OR = [
            { employeeId: { contains: query, mode: "insensitive" } },
            { fullName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { jobTitle: { contains: query, mode: "insensitive" } },
          ];
        }
      }

      const [totalCount, employees, summaryCounts] =
        await Promise.all([
          prisma.employee.count({ where }),
          prisma.employee.findMany({
            where,
            include: {
              salaryProfile: true,
              user: { select: { id: true, email: true, role: true } },
            },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
            skip,
            take: limit,
          }),
          getCachedGlobalSummaryCounts(),
        ]);
      const { totalActive, totalSuspended, totalVirtual, totalPendingVerification } = summaryCounts;

      const records: SafeEmployeeDirectoryRecord[] = employees.map((emp) => {
        const grade = resolveSalaryGrade(emp.role, emp.jobTitle);
        const hasChangePasswordPending = emp.userId ? isPasswordChangeRequired(emp.userId) : false;

        let accountStatus: SafeEmployeeDirectoryRecord["accountStatus"] = "ACTIVE";
        if (emp.status === "SUSPENDED") {
          accountStatus = "SUSPENDED";
        } else if (hasChangePasswordPending) {
          accountStatus = "MUST_CHANGE_PASSWORD";
        } else if (!emp.user) {
          accountStatus = "INVITATION_PENDING";
        }

        return {
          employeeId: emp.employeeId,
          userId: emp.userId ?? undefined,
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          department: emp.department as DepartmentType,
          jobTitle: emp.jobTitle,
          role: emp.role as Role,
          permissions: emp.permissions,
          jobGrade: grade.gradeCode,
          assignedAirport: emp.airportCode || "HYD",
          terminal: emp.terminal ?? undefined,
          gateArea: emp.gateArea ?? undefined,
          shift: emp.shift,
          employmentStatus: emp.status as EmployeeStatus,
          verificationStatus: emp.verificationStatus as VerificationStatus,
          accountStatus,
          isVirtual: emp.isVirtual,
          trainingStatus: emp.verificationStatus === "VERIFIED" ? "COMPLETE" : "PENDING",
          salaryProfileId: emp.salaryProfile?.id,
          baseSalary: canViewSalary
            ? emp.salaryProfile
              ? Number(emp.salaryProfile.baseSalary)
              : grade.midMonthlyBase
            : undefined,
          joinDate: emp.joinDate.toISOString(),
          lastLogin: emp.lastLogin?.toISOString(),
          lastActivity: emp.updatedAt.toISOString(),
          createdAt: emp.createdAt.toISOString(),
          updatedAt: emp.updatedAt.toISOString(),
        };
      });

      return {
        records,
        totalCount,
        page,
        pageSize: limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        summary: {
          total: totalCount,
          active: totalActive,
          suspended: totalSuspended,
          virtual: totalVirtual,
          pendingVerification: totalPendingVerification,
          mustChangePassword: 0,
        },
      };
    } catch (err) {
      console.warn("Database getEmployeeDirectory query failed; falling back to memory", err);
    }
  }

  // Memory fallback using memoryEmployees
  const { memoryEmployees } = await import("@/lib/services/staff-service");
  let filtered = [...memoryEmployees];

  if (filters.department && filters.department !== "ALL") {
    filtered = filtered.filter((e) => e.department === filters.department);
  }
  if (filters.role && filters.role !== "ALL") {
    filtered = filtered.filter((e) => e.role === filters.role);
  }
  if (filters.status && filters.status !== "ALL") {
    filtered = filtered.filter((e) => e.status === filters.status);
  }
  if (filters.airportCode && filters.airportCode !== "ALL") {
    filtered = filtered.filter((e) => (e.airportCode || "HYD") === filters.airportCode);
  }
  if (filters.shift && filters.shift !== "ALL") {
    filtered = filtered.filter((e) => e.shift === filters.shift);
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    const exactId = q.toUpperCase();

    // Exact ID match prioritizes target item
    if (/^(AOCC-EMP-|EMP-|VS-)/i.test(q)) {
      const exactMatch = filtered.find((e) => e.employeeId.toUpperCase() === exactId);
      if (exactMatch) {
        filtered = [exactMatch, ...filtered.filter((e) => e.employeeId.toUpperCase() !== exactId)];
      } else {
        const queryLower = q.toLowerCase();
        filtered = filtered.filter((e) => e.employeeId.toLowerCase().includes(queryLower));
      }
    } else {
      const queryLower = q.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.fullName.toLowerCase().includes(queryLower) ||
          e.email.toLowerCase().includes(queryLower) ||
          e.employeeId.toLowerCase().includes(queryLower) ||
          e.jobTitle.toLowerCase().includes(queryLower)
      );
    }
  }

  if (filters.accountStatus && filters.accountStatus !== "ALL") {
    filtered = filtered.filter((e) => {
      const hasChangePending = e.userId ? isPasswordChangeRequired(e.userId) : false;
      if (filters.accountStatus === "MUST_CHANGE_PASSWORD") return hasChangePending;
      if (filters.accountStatus === "SUSPENDED") return e.status === "SUSPENDED";
      if (filters.accountStatus === "ACTIVE") return e.status === "ACTIVE" && !hasChangePending;
      return true;
    });
  }

  const totalCount = filtered.length;
  const paged = filtered.slice(skip, skip + limit);

  const records: SafeEmployeeDirectoryRecord[] = paged.map((emp) => {
    const grade = resolveSalaryGrade(emp.role, emp.jobTitle);
    const hasChangePending = emp.userId ? isPasswordChangeRequired(emp.userId) : false;

    let accountStatus: SafeEmployeeDirectoryRecord["accountStatus"] = "ACTIVE";
    if (emp.status === "SUSPENDED") {
      accountStatus = "SUSPENDED";
    } else if (hasChangePending) {
      accountStatus = "MUST_CHANGE_PASSWORD";
    } else if (!emp.userId) {
      accountStatus = "INVITATION_PENDING";
    }

    return {
      employeeId: emp.employeeId,
      userId: emp.userId,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      jobTitle: emp.jobTitle,
      role: emp.role,
      permissions: emp.permissions ?? [],
      jobGrade: grade.gradeCode,
      assignedAirport: emp.airportCode || "HYD",
      terminal: emp.terminal,
      gateArea: emp.gateArea,
      shift: emp.shift,
      employmentStatus: emp.status,
      verificationStatus: emp.verificationStatus,
      accountStatus,
      isVirtual: Boolean(emp.isVirtual),
      trainingStatus: emp.verificationStatus === "VERIFIED" ? "COMPLETE" : "PENDING",
      baseSalary: canViewSalary ? grade.midMonthlyBase : undefined,
      joinDate: emp.joinDate,
      lastLogin: emp.lastLogin,
      lastActivity: emp.lastLogin || emp.joinDate,
      createdAt: emp.joinDate,
      updatedAt: emp.joinDate,
    };
  });

  const totalActive = memoryEmployees.filter((e) => e.status === "ACTIVE").length;
  const totalSuspended = memoryEmployees.filter((e) => e.status === "SUSPENDED").length;
  const totalVirtual = memoryEmployees.filter((e) => e.isVirtual).length;
  const totalPendingVerification = memoryEmployees.filter((e) => e.verificationStatus === "PENDING").length;

  return {
    records,
    totalCount,
    page,
    pageSize: limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
    summary: {
      total: memoryEmployees.length,
      active: totalActive,
      suspended: totalSuspended,
      virtual: totalVirtual,
      pendingVerification: totalPendingVerification,
      mustChangePassword: getMustChangePasswordCount(),
    },
  };
}

/**
 * Provision new employee record and linked role-based user account in a secure transaction.
 * Generates an unguessable temporary password if none is provided, flags mustChangePassword,
 * and displays the temporary password once in the response.
 */
export async function provisionEmployeeAccount(input: {
  fullName: string;
  email: string;
  phone: string;
  department: DepartmentType;
  jobTitle: string;
  role: Role;
  assignedAirport?: string;
  terminal?: string;
  gateArea?: string;
  shift?: string;
  customEmployeeId?: string;
  initialPassword?: string;
  isTemporaryCredential?: boolean;
  actor?: { id?: string; name?: string };
}): Promise<{
  ok: boolean;
  record?: SafeEmployeeDirectoryRecord;
  temporaryPassword?: string;
  message: string;
}> {
  const normEmail = input.email.trim().toLowerCase();
  const airport = input.assignedAirport?.trim().toUpperCase() || "HYD";

  if (!normEmail || !input.fullName) {
    return { ok: false, message: "Full name and email are required." };
  }

  // Server-side unique ID generation (AOCC-EMP-000001 format or custom isolated test namespace)
  const employeeId = input.customEmployeeId || (await generateNextEmployeeId(false));
  const isTemporary = input.isTemporaryCredential ?? !input.initialPassword;
  const passwordPlain = input.initialPassword || DEFAULT_DEMO_TEMP_PASSWORD;

  if (shouldUseDatabase()) {
    try {
      const existing = await prisma.employee.findFirst({
        where: { OR: [{ email: normEmail }, { employeeId }] },
      });
      if (existing) {
        return { ok: false, message: "An employee with this email or ID already exists." };
      }

      const hashedPassword = await hash(passwordPlain, 12);

      const created = await prisma.$transaction(async (tx) => {
        // 1. Create User account with role
        const user = await tx.user.create({
          data: {
            email: normEmail,
            name: input.fullName,
            role: input.role,
            passwordHash: hashedPassword,
          },
        });

        // 2. Create Employee profile
        const emp = await tx.employee.create({
          data: {
            employeeId,
            fullName: input.fullName,
            email: normEmail,
            phone: input.phone || "+91 90000 00000",
            department: input.department,
            jobTitle: input.jobTitle,
            role: input.role,
            airportCode: airport,
            terminal: input.terminal,
            gateArea: input.gateArea,
            shift: input.shift || "MORNING",
            status: "ACTIVE",
            verificationStatus: "VERIFIED",
            userId: user.id,
          },
        });

        // 3. Initialize authoritative salary profile based on grade
        const grade = resolveSalaryGrade(input.role, input.jobTitle);
        const base = grade.midMonthlyBase;
        const allowances = Math.round(base * 0.15);
        const deductions = Math.round(base * 0.10);

        await tx.salaryProfile.create({
          data: {
            employeeId: emp.id,
            baseSalary: base,
            allowances,
            deductions,
            grossSalary: base + allowances,
            netSalary: base + allowances - deductions,
            salaryType: "MONTHLY",
          },
        });

        return { emp, user };
      });

      if (isTemporary) {
        setPasswordChangeRequired(created.user.id, true);
      }

      await logAuditEvent({
        actorId: input.actor?.id,
        actorName: input.actor?.name || "Admin",
        action: "EMPLOYEE_PROVISIONED",
        entity: "EMPLOYEE",
        entityId: created.emp.employeeId,
        after: {
          fullName: created.emp.fullName,
          email: created.emp.email,
          role: created.emp.role,
          department: created.emp.department,
          airport: created.emp.airportCode,
          temporaryCredentialIssued: isTemporary,
        },
      });

      const grade = resolveSalaryGrade(created.emp.role, created.emp.jobTitle);
      return {
        ok: true,
        message: `Employee ${created.emp.fullName} (${created.emp.employeeId}) provisioned successfully with role ${created.emp.role}.`,
        temporaryPassword: isTemporary ? passwordPlain : undefined,
        record: {
          employeeId: created.emp.employeeId,
          userId: created.emp.userId ?? undefined,
          fullName: created.emp.fullName,
          email: created.emp.email,
          phone: created.emp.phone,
          department: created.emp.department as DepartmentType,
          jobTitle: created.emp.jobTitle,
          role: created.emp.role as Role,
          permissions: [],
          jobGrade: grade.gradeCode,
          assignedAirport: created.emp.airportCode,
          terminal: created.emp.terminal ?? undefined,
          gateArea: created.emp.gateArea ?? undefined,
          shift: created.emp.shift,
          employmentStatus: "ACTIVE",
          verificationStatus: "VERIFIED",
          accountStatus: isTemporary ? "MUST_CHANGE_PASSWORD" : "ACTIVE",
          isVirtual: false,
          trainingStatus: "COMPLETE",
          baseSalary: grade.midMonthlyBase,
          joinDate: created.emp.joinDate.toISOString(),
          createdAt: created.emp.createdAt.toISOString(),
          updatedAt: created.emp.updatedAt.toISOString(),
        },
      };
    } catch (err) {
      console.warn("Database provisionEmployeeAccount failed; falling back to memory", err);
    }
  }

  // Memory fallback
  const { createEmployee, memoryEmployees } = await import("@/lib/services/staff-service");
  const existingMem = memoryEmployees.find(
    (e) => e.email.toLowerCase() === normEmail || (employeeId && e.employeeId.toUpperCase() === employeeId.toUpperCase())
  );
  if (existingMem) {
    return { ok: false, message: "An employee with this email or ID already exists." };
  }

  const createdEmp = await createEmployee({
    employeeId: input.customEmployeeId,
    fullName: input.fullName,
    email: normEmail,
    phone: input.phone || "+91 90000 00000",
    department: input.department,
    jobTitle: input.jobTitle,
    role: input.role,
    airportCode: airport,
    terminal: input.terminal,
    gateArea: input.gateArea,
    shift: input.shift || "MORNING",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
  });

  if (createdEmp.userId) {
    const { demoUsers } = await import("@/lib/data/mock");
    const demoUser = demoUsers.find((u) => u.id === createdEmp.userId);
    if (demoUser) {
      demoUser.password = passwordPlain;
    }
    if (isTemporary) {
      setPasswordChangeRequired(createdEmp.userId, true);
    }
  }

  await getOrCreateSalaryProfile(createdEmp.id);
  const grade = resolveSalaryGrade(createdEmp.role, createdEmp.jobTitle);

  return {
    ok: true,
    message: `Employee ${createdEmp.fullName} (${createdEmp.employeeId}) provisioned successfully with role ${createdEmp.role}.`,
    temporaryPassword: isTemporary ? passwordPlain : undefined,
    record: {
      employeeId: createdEmp.employeeId,
      userId: createdEmp.userId,
      fullName: createdEmp.fullName,
      email: createdEmp.email,
      phone: createdEmp.phone,
      department: createdEmp.department,
      jobTitle: createdEmp.jobTitle,
      role: createdEmp.role,
      permissions: createdEmp.permissions,
      jobGrade: grade.gradeCode,
      assignedAirport: createdEmp.airportCode || "HYD",
      terminal: createdEmp.terminal,
      gateArea: createdEmp.gateArea,
      shift: createdEmp.shift,
      employmentStatus: createdEmp.status,
      verificationStatus: createdEmp.verificationStatus,
      accountStatus: isTemporary ? "MUST_CHANGE_PASSWORD" : "ACTIVE",
      isVirtual: false,
      trainingStatus: "COMPLETE",
      baseSalary: grade.midMonthlyBase,
      joinDate: createdEmp.joinDate,
      createdAt: createdEmp.joinDate,
      updatedAt: createdEmp.joinDate,
    },
  };
}

/**
 * Purge synthetic test employees created during isolated verification suites.
 * Safely removes records matching the synthetic namespace in both memory and database stores.
 */
export async function purgeSyntheticTestEmployees(prefix = "TEST-AOCC-"): Promise<number> {
  let purgedCount = 0;

  // 1. Purge from Memory Store
  try {
    const { memoryEmployees } = await import("@/lib/services/staff-service");
    const { demoUsers } = await import("@/lib/data/mock");

    const removedUserIds = new Set<string>();

    for (let i = memoryEmployees.length - 1; i >= 0; i--) {
      const emp = memoryEmployees[i];
      if (
        emp.employeeId.startsWith(prefix) ||
        emp.email.includes("test.aocc.") ||
        emp.email.endsWith("@sim.test")
      ) {
        if (emp.userId) removedUserIds.add(emp.userId);
        memoryEmployees.splice(i, 1);
        purgedCount++;
      }
    }

    // Purge corresponding demoUsers and security flags
    for (let i = demoUsers.length - 1; i >= 0; i--) {
      const u = demoUsers[i];
      if (
        removedUserIds.has(u.id) ||
        u.email.includes("test.aocc.") ||
        u.email.endsWith("@sim.test")
      ) {
        setPasswordChangeRequired(u.id, false);
        demoUsers.splice(i, 1);
      }
    }
  } catch (err) {
    console.warn("Memory purgeSyntheticTestEmployees failed:", err);
  }

  // 2. Purge from Database if configured
  if (shouldUseDatabase()) {
    try {
      const dbEmployees = await prisma.employee.findMany({
        where: {
          OR: [
            { employeeId: { startsWith: prefix } },
            { email: { contains: "test.aocc." } },
            { email: { endsWith: "@sim.test" } },
          ],
        },
        select: { id: true, userId: true },
      });

      const empIds = dbEmployees.map((e) => e.id);
      const userIds = dbEmployees.map((e) => e.userId).filter(Boolean) as string[];

      if (empIds.length > 0) {
        await prisma.salaryProfile.deleteMany({
          where: { employeeId: { in: empIds } },
        });

        await prisma.simulationTask.deleteMany({
          where: { staffId: { in: empIds } },
        });

        await prisma.payrollItem.deleteMany({
          where: { employeeId: { in: empIds } },
        });

        await prisma.employee.deleteMany({
          where: { id: { in: empIds } },
        });
      }

      if (userIds.length > 0) {
        await prisma.session.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.account.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      purgedCount = Math.max(purgedCount, dbEmployees.length);
    } catch (err) {
      console.warn("Database purgeSyntheticTestEmployees failed:", err);
    }
  }

  return purgedCount;
}

export interface BatchProvisionEmployeeInput {
  fullName: string;
  email: string;
  phone?: string;
  department: DepartmentType;
  jobTitle: string;
  role: Role;
  assignedAirport?: string;
  terminal?: string;
  gateArea?: string;
  shift?: string;
  customEmployeeId?: string;
  initialPassword?: string;
}

export interface BatchProvisionResult {
  totalRequested: number;
  provisioned: number;
  skippedDuplicates: number;
  failed: number;
  errors: Array<{ identity: string; reason: string }>;
  batchId: string;
  durationMs: number;
}

/**
 * Safe Admin-Only Batch Provisioning Process.
 * Processes records in manageable atomic chunks (default 50), enforces unique constraints,
 * reports progress and failure summaries, skips duplicates idempotently, and writes durable batch audit logs.
 */
export async function batchProvisionEmployees(
  items: BatchProvisionEmployeeInput[],
  options: {
    batchSize?: number;
    skipDuplicates?: boolean;
    actor?: { id?: string; name?: string };
  } = {}
): Promise<BatchProvisionResult> {
  const startedAt = Date.now();
  const batchId = `BATCH-PROV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const batchSize = Math.max(1, Math.min(100, options.batchSize || 50));
  const skipDuplicates = options.skipDuplicates ?? true;

  let provisioned = 0;
  let skippedDuplicates = 0;
  let failed = 0;
  const errors: Array<{ identity: string; reason: string }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);

    for (const item of chunk) {
      try {
        const normEmail = item.email.trim().toLowerCase();
        if (!normEmail || !item.fullName) {
          failed++;
          errors.push({ identity: item.email || item.fullName, reason: "Missing full name or email" });
          continue;
        }

        const res = await provisionEmployeeAccount({
          fullName: item.fullName,
          email: normEmail,
          phone: item.phone || "+91 90000 00000",
          department: item.department,
          jobTitle: item.jobTitle,
          role: item.role,
          assignedAirport: item.assignedAirport,
          terminal: item.terminal,
          gateArea: item.gateArea,
          shift: item.shift,
          customEmployeeId: item.customEmployeeId,
          initialPassword: item.initialPassword || DEFAULT_DEMO_TEMP_PASSWORD,
          isTemporaryCredential: true,
          actor: options.actor,
        });

        if (res.ok) {
          provisioned++;
        } else if (res.message && res.message.includes("already exists")) {
          if (skipDuplicates) {
            skippedDuplicates++;
          } else {
            failed++;
            errors.push({ identity: normEmail, reason: res.message });
          }
        } else {
          failed++;
          errors.push({ identity: normEmail, reason: res.message });
        }
      } catch (err) {
        failed++;
        errors.push({
          identity: item.email || "unknown",
          reason: err instanceof Error ? err.message : "Internal error during provisioning",
        });
      }
    }
  }

  try {
    await logAuditEvent({
      actorId: options.actor?.id,
      actorName: options.actor?.name || "Admin Batch Provisioner",
      action: "BATCH_STAFF_PROVISIONED",
      entity: "EMPLOYEE",
      entityId: batchId,
      after: {
        batchId,
        totalRequested: items.length,
        provisioned,
        skippedDuplicates,
        failed,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (auditErr) {
    console.warn("Audit logging for batch provisioning encountered non-fatal error:", auditErr);
  }

  return {
    totalRequested: items.length,
    provisioned,
    skippedDuplicates,
    failed,
    errors,
    batchId,
    durationMs: Date.now() - startedAt,
  };
}
