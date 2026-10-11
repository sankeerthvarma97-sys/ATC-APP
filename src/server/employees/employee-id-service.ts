import { prisma, shouldUseDatabase } from "@/lib/prisma";

export const EMPLOYEE_ID_PREFIX = "AOCC-EMP-";
export const VIRTUAL_EMPLOYEE_ID_PREFIX = "AOCC-EMP-V";

/**
 * Format sequence number into canonical AOCC Employee ID.
 * Standard staff: AOCC-EMP-000001
 * Virtual staff:  AOCC-EMP-V00001
 */
export function formatEmployeeId(sequence: number, isVirtual = false): string {
  if (isVirtual) {
    return `${VIRTUAL_EMPLOYEE_ID_PREFIX}${String(sequence).padStart(5, "0")}`;
  }
  return `${EMPLOYEE_ID_PREFIX}${String(sequence).padStart(6, "0")}`;
}

/**
 * Parse an employee ID or legacy ID into sequence number.
 * Supports:
 * - AOCC-EMP-000123
 * - AOCC-EMP-V00045
 * - EMP-000123 / EMP-1001
 * - VS-0001
 */
export function parseEmployeeSequence(value?: string | null): { sequence: number; isVirtual: boolean } | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();

  // Virtual AOCC format: AOCC-EMP-V00001
  const matchVirtualAocc = normalized.match(/^AOCC-EMP-V(\d+)/i);
  if (matchVirtualAocc) {
    return { sequence: Number.parseInt(matchVirtualAocc[1], 10), isVirtual: true };
  }

  // Legacy Virtual format: VS-0001
  const matchLegacyVirtual = normalized.match(/^VS-(\d+)/i);
  if (matchLegacyVirtual) {
    return { sequence: Number.parseInt(matchLegacyVirtual[1], 10), isVirtual: true };
  }

  // Standard AOCC format: AOCC-EMP-000001
  const matchStandardAocc = normalized.match(/^AOCC-EMP-(\d+)/i);
  if (matchStandardAocc) {
    return { sequence: Number.parseInt(matchStandardAocc[1], 10), isVirtual: false };
  }

  // Legacy format: EMP-0001 or EMP-1001
  const matchLegacyEmp = normalized.match(/^EMP-(\d+)/i);
  if (matchLegacyEmp) {
    return { sequence: Number.parseInt(matchLegacyEmp[1], 10), isVirtual: false };
  }

  return null;
}

let memoryStaffSequenceCounter = 1006;
let memoryVirtualSequenceCounter = 1;

/**
 * Generate next server-side unique, permanent Employee ID.
 * Ensures collision-resistance in both database and in-memory dual modes.
 */
export async function generateNextEmployeeId(isVirtual = false): Promise<string> {
  if (shouldUseDatabase()) {
    try {
      const prefix = isVirtual ? VIRTUAL_EMPLOYEE_ID_PREFIX : EMPLOYEE_ID_PREFIX;
      
      // Query recent records matching prefix to calculate highest sequence
      const recent = await prisma.employee.findMany({
        where: isVirtual ? { isVirtual: true } : { isVirtual: false },
        select: { employeeId: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      let highestSeq = 0;
      for (const emp of recent) {
        const parsed = parseEmployeeSequence(emp.employeeId);
        if (parsed && parsed.isVirtual === isVirtual) {
          if (parsed.sequence > highestSeq) {
            highestSeq = parsed.sequence;
          }
        }
      }

      // Also verify overall count as a lower bound
      const totalCount = await prisma.employee.count({
        where: isVirtual ? { isVirtual: true } : { isVirtual: false },
      });

      const nextSeq = Math.max(highestSeq, totalCount) + 1;
      const candidateId = formatEmployeeId(nextSeq, isVirtual);

      // Verify no collision exists for candidate ID
      const existing = await prisma.employee.findUnique({
        where: { employeeId: candidateId },
      });

      if (!existing) {
        return candidateId;
      }

      // If collision occurs, iterate upward
      for (let offset = 2; offset <= 20; offset++) {
        const retryId = formatEmployeeId(nextSeq + offset, isVirtual);
        const retryExisting = await prisma.employee.findUnique({
          where: { employeeId: retryId },
        });
        if (!retryExisting) {
          return retryId;
        }
      }
    } catch (err) {
      console.warn("Database generateNextEmployeeId check failed; falling back to memory counter", err);
    }
  }

  // Memory store fallback
  const { memoryEmployees } = await import("@/lib/services/staff-service");
  
  if (isVirtual) {
    memoryVirtualSequenceCounter++;
    return formatEmployeeId(memoryVirtualSequenceCounter, true);
  }

  const existingSeqs = memoryEmployees
    .map((e) => parseEmployeeSequence(e.employeeId))
    .filter((p): p is { sequence: number; isVirtual: boolean } => p !== null && !p.isVirtual)
    .map((p) => p.sequence);

  const highest = existingSeqs.length > 0 ? Math.max(...existingSeqs) : memoryStaffSequenceCounter;
  memoryStaffSequenceCounter = Math.max(memoryStaffSequenceCounter, highest) + 1;

  return formatEmployeeId(memoryStaffSequenceCounter, false);
}

/**
 * Validates if a string is a valid Employee ID.
 */
export function isValidEmployeeId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim().toUpperCase();
  return (
    /^AOCC-EMP-\d{6}$/.test(trimmed) ||
    /^AOCC-EMP-V\d{5}$/.test(trimmed) ||
    /^EMP-\d{4,6}$/.test(trimmed) ||
    /^VS-\d{4}$/.test(trimmed)
  );
}
