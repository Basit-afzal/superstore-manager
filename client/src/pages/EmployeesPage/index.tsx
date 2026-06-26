import type { Employee, PaginationMeta } from "@/types";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { StorePageHeader } from "@/components/common/StorePageHeader";
import { DataPagination } from "@/components/common/DataPagination";
import { EmployeeFormDialog } from "@/components/forms/EmployeeFormDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Plus,
  Pencil,
  Trash2,
  CircleUser as UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isAbortError } from "@/utils/isAbortError";
import {
  getAllEmployee,
  deleteEmployee,
} from "@/services/api/employees";
import {
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_ROLES,
} from "@/lib/validations/employee.schema";

const PAGE_SIZE = 10;

const ROLE_LABELS: Record<(typeof EMPLOYEE_ROLES)[number], string> = {
  manager: "Manager",
  cashier: "Cashier",
  staff: "Staff",
  accountant: "Accountant",
  warehouse: "Warehouse",
};

const DEPARTMENT_LABELS: Record<(typeof EMPLOYEE_DEPARTMENTS)[number], string> = {
  general: "General",
  sales: "Sales",
  finance: "Finance",
  warehouse: "Warehouse",
  management: "Management",
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function EmployeesPage() {
  const { currentStore } = useStore();
  const apiClient = useApiClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const filtersChanged = useRef(false);

  useEffect(() => {
    filtersChanged.current = true;
    setPage(1);
  }, [debouncedSearch, roleFilter, departmentFilter, currentStore?.id]);

  const loadEmployees = useCallback(
    async (signal?: AbortSignal) => {
      if (filtersChanged.current && page !== 1) {
        return;
      }

      filtersChanged.current = false;
      setLoading(true);
      try {
        const data = await getAllEmployee(
          apiClient,
          {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch.trim() || undefined,
            role: roleFilter === "all" ? undefined : roleFilter,
            department: departmentFilter === "all" ? undefined : departmentFilter,
          },
          signal,
        );
        if (signal?.aborted) return;
        setEmployees(data.employees);
        setPagination(data.pagination);
      } catch (err) {
        if (isAbortError(err)) return;
        toast.error("Failed to load employees: " + getErrorMessage(err));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [apiClient, page, debouncedSearch, roleFilter, departmentFilter],
  );

  useAsyncEffect((signal) => loadEmployees(signal), [loadEmployees]);

  function openCreate() {
    setEditingEmployee(null);
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await deleteEmployee(apiClient, id);
      toast.success("Employee deleted");
      await loadEmployees();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete employee"));
    }
  }

  const roleColors: Record<string, string> = {
    manager: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    cashier: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    staff: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    accountant: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    warehouse: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <StorePageHeader
          className="mb-0"
          title="Employees"
          description="Manage your store's workforce"
        />
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {EMPLOYEE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {EMPLOYEE_DEPARTMENTS.map((department) => (
                    <SelectItem key={department} value={department}>
                      {DEPARTMENT_LABELS[department]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="h-9 px-3">
                {pagination.total} employees
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Users className="mr-2 h-5 w-5 animate-pulse" /> Loading
              employees...
            </div>
          ) : employees.length === 0 ? (
            <p className="py-12 text-center text-slate-400">
              No employees found. Add your first employee to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Hire Date</th>
                    <th className="pb-3 font-medium">Salary</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b last:border-0 transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <UserCircle className="h-5 w-5 text-slate-500" />
                          </div>
                          <span className="font-medium text-slate-900">
                            {emp.first_name} {emp.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{emp.email}</td>
                      <td className="py-3">
                        <Badge
                          className={
                            roleColors[emp.role] ||
                            "bg-slate-100 text-slate-700"
                          }
                        >
                          {emp.role}
                        </Badge>
                      </td>
                      <td className="py-3 capitalize text-slate-600">
                        {emp.department}
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(emp.hire_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        {usdFormatter.format(emp.salary)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(emp)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(emp.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && (
            <DataPagination
              className="mt-6 border-t pt-4"
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
              itemLabel="employees"
            />
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editingEmployee}
        onSaved={loadEmployees}
      />
    </div>
  );
}
