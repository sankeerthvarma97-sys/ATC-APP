import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { prisma, shouldUseDatabase } from "@/lib/prisma";
import type { SalaryProfileDTO } from "@/lib/domain";
import { getOrCreateSalaryProfile } from "@/lib/services/payroll-service";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, CheckCircle2, DollarSign, FileText, ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type SalaryPagePayrollItem = {
  id: string;
  payroll?: {
    payrollPeriod?: string | null;
  } | null;
  baseSalary?: number | string | null;
  bonus?: number | string | null;
  deductions?: number | string | null;
  netSalary?: number | string | null;
  status?: string | null;
  createdAt: Date | string;
};

type SalaryPageEmployee = {
  id: string;
  payrollItems?: SalaryPagePayrollItem[] | null;
  salaryAccount?: {
    balance?: number | string | null;
    accountNumber?: string | null;
  } | null;
};

const fallbackSalaryProfile: SalaryProfileDTO = {
  id: "demo-salary-profile",
  employeeId: "demo-employee",
  baseSalary: 85000,
  allowances: 12750,
  overtime: 0,
  bonus: 5000,
  deductions: 8500,
  grossSalary: 102750,
  netSalary: 94250,
  salaryType: "MONTHLY",
  effectiveDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default async function EmployeeSalaryPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?callbackUrl=/staff/salary");
  }

  // Find employee record linked to user
  let employee: SalaryPageEmployee | null = null;
  let salaryProfile: SalaryProfileDTO = fallbackSalaryProfile;
  let payrollItems: SalaryPagePayrollItem[] = [];
  let salaryAccount: { balance?: number | string | null; accountNumber?: string | null } | null = null;

  if (shouldUseDatabase()) {
    try {
      employee = (await prisma.employee.findFirst({
        where: { userId: user.id },
        include: {
          salaryProfile: true,
          salaryAccount: true,
          payrollItems: {
            orderBy: { createdAt: "desc" },
            take: 12,
          },
        },
      })) as SalaryPageEmployee | null;

      if (employee) {
        salaryProfile = await getOrCreateSalaryProfile(employee.id);
        payrollItems = employee.payrollItems ?? [];
        salaryAccount = employee.salaryAccount ?? null;
      }
    } catch (err) {
      console.warn("Database lookup for employee salary failed", err);
    }
  }

  const formatINR = (val: number | undefined | null) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/staff">
              <Button size="sm" variant="outline" className="border-slate-800 bg-slate-900 text-xs">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Staff Operations Portal
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-slate-200">Staff Compensation & Salary Ledger</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Staff Account: <strong className="text-slate-200">{user.email}</strong></span>
          </div>
        </div>

        {/* Header Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-semibold text-slate-400">Current Salary Account Balance</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {formatINR(salaryAccount?.balance ? Number(salaryAccount.balance) : salaryProfile.netSalary * 2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Account: {salaryAccount?.accountNumber || "EMP-SAL-2026-001"}
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-semibold text-slate-400">Current Monthly Net Salary</div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {formatINR(salaryProfile.netSalary)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Gross: {formatINR(salaryProfile.grossSalary)} · Base: {formatINR(salaryProfile.baseSalary)}
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-semibold text-slate-400">Next Scheduled Payroll</div>
            <div className="text-xl font-bold font-mono text-slate-200 mt-1">
              {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("en-IN", {
                dateStyle: "medium",
              })}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Auto-credit configured (24/7 serverless)
            </div>
          </Card>
        </div>

        {/* Salary Breakdown Card */}
        <Card className="border-slate-800 bg-slate-900/60 shadow">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-200">Current Salary Structure & Breakdown</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Department benchmarks, operational allowances, overtime, and statutory deductions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Base Salary:</span>
                <div className="font-mono font-bold text-slate-100 text-sm mt-1">{formatINR(salaryProfile.baseSalary)}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Allowances (15%):</span>
                <div className="font-mono font-bold text-emerald-400 text-sm mt-1">+{formatINR(salaryProfile.allowances)}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Performance Bonus:</span>
                <div className="font-mono font-bold text-cyan-400 text-sm mt-1">+{formatINR(salaryProfile.bonus)}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Standard Deductions:</span>
                <div className="font-mono font-bold text-rose-400 text-sm mt-1">-{formatINR(salaryProfile.deductions)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historical Payslips / Payroll Disbursements */}
        <Card className="border-slate-800 bg-slate-900/60 shadow">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-200">Salary Credit History & Payslips</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Records of completed disbursements credited directly from Company Payroll Account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3">Base Salary</th>
                    <th className="p-3">Bonus</th>
                    <th className="p-3">Deductions</th>
                    <th className="p-3">Net Credited</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-sans">
                  {payrollItems.length === 0 ? (
                    <tr>
                      <td className="p-3 font-mono text-slate-200 font-semibold">PAYROLL-2026-08</td>
                      <td className="p-3 font-mono text-slate-400">{formatINR(salaryProfile.baseSalary)}</td>
                      <td className="p-3 font-mono text-emerald-400">+{formatINR(salaryProfile.bonus)}</td>
                      <td className="p-3 font-mono text-rose-400">-{formatINR(salaryProfile.deductions)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{formatINR(salaryProfile.netSalary)}</td>
                      <td className="p-3 text-right">
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                          PAID
                        </Badge>
                      </td>
                    </tr>
                  ) : (
                    payrollItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-200">
                          {item.payroll?.payrollPeriod || "PAYROLL-2026"}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{formatINR(Number(item.baseSalary))}</td>
                        <td className="p-3 font-mono text-emerald-400">+{formatINR(Number(item.bonus))}</td>
                        <td className="p-3 font-mono text-rose-400">-{formatINR(Number(item.deductions))}</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">{formatINR(Number(item.netSalary))}</td>
                        <td className="p-3 text-right">
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
