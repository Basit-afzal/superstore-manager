import type { Customer, PaginationMeta } from "@/types";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { StorePageHeader } from "@/components/common/StorePageHeader";
import { DataPagination } from "@/components/common/DataPagination";
import { CustomerFormDialog } from "@/components/forms/CustomerFormDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserCircle,
  Plus,
  Pencil,
  Trash2,
  ShoppingBag,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isAbortError } from "@/utils/isAbortError";
import {
  deleteCustomer,
  getAllCustomers,
} from "@/services/api/customers";

const PAGE_SIZE = 10;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function CustomersPage() {
  const { currentStore } = useStore();
  const apiClient = useApiClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filtersChanged = useRef(false);

  useEffect(() => {
    filtersChanged.current = true;
    setPage(1);
  }, [debouncedSearch, currentStore?.id]);

  const loadCustomers = useCallback(
    async (signal?: AbortSignal) => {
      if (filtersChanged.current && page !== 1) {
        return;
      }

      filtersChanged.current = false;
      setLoading(true);
      try {
        const data = await getAllCustomers(
          apiClient,
          {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch.trim() || undefined,
          },
          signal,
        );
        if (signal?.aborted) return;
        setCustomers(data.customers);
        setPagination(data.pagination);
      } catch (err) {
        if (isAbortError(err)) return;
        toast.error(getErrorMessage(err, "Failed to load customers"));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [apiClient, page, debouncedSearch],
  );

  useAsyncEffect((signal) => loadCustomers(signal), [loadCustomers]);

  async function fetchCustomers() {
    await loadCustomers();
  }

  function openCreate() {
    setEditingCustomer(null);
    setDialogOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteCustomer(apiClient, id);
      toast.success("Customer deleted");
      fetchCustomers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete customer"));
    }
  }

  const activeCustomers = customers.filter((c) => c.is_active).length;
  const totalRevenue = customers.reduce(
    (sum, c) => sum + (c.total_spent || 0),
    0,
  );
  const repeatCustomers = customers.filter(
    (c) => (c.total_orders || 0) > 1,
  ).length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <StorePageHeader
          className="mb-0"
          title="Customers"
          description="Manage store customers and their purchase history"
        />
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-emerald-50 p-3">
              <UserCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {activeCustomers}
              </p>
              <p className="text-sm text-slate-500">Active Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {currencyFormatter.format(totalRevenue)}
              </p>
              <p className="text-sm text-slate-500">Customer Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-amber-50 p-3">
              <Repeat className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {repeatCustomers}
              </p>
              <p className="text-sm text-slate-500">Repeat Customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="h-9 px-3">
              {pagination.total} customers
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <UserCircle className="mr-2 h-5 w-5 animate-pulse" /> Loading
              customers...
            </div>
          ) : customers.length === 0 ? (
            <p className="py-12 text-center text-slate-400">
              No customers found. Add a customer or complete a sale with client
              details.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Orders</th>
                    <th className="pb-3 font-medium">Total Spent</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b last:border-0 transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3 font-medium text-slate-900">
                        {customer.name}
                      </td>
                      <td className="py-3 text-slate-600">
                        {customer.phone || "-"}
                      </td>
                      <td className="py-3 text-slate-600">
                        {customer.email || "-"}
                      </td>
                      <td className="py-3 text-slate-600">
                        {customer.total_orders || 0}
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        {currencyFormatter.format(customer.total_spent || 0)}
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            customer.is_active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                          }
                        >
                          {customer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(customer)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer.id)}
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
              itemLabel="customers"
            />
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editingCustomer}
        onSaved={fetchCustomers}
      />
    </div>
  );
}
