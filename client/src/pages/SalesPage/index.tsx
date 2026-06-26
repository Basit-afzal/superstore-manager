import type { Sale } from "@/types";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { formatPaymentMethod } from "@/utils/formatPaymentMethod";
import { useCallback, useState } from "react";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { isAbortError } from "@/utils/isAbortError";
import { StorePageHeader } from "@/components/common/StorePageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import { getSaleById, getSales } from "@/services/api/sales";
import CreateSale from "./createSale";
import SaleDetailsModal from "./SaleDetailsModal";

function formatClientName(sale: Sale) {
  return sale.customer_name?.trim() || "Walk-in";
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [posOpen, setPosOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const apiClient = useApiClient();

  const loadSales = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const data = await getSales(apiClient, 1, 100, signal);
        if (signal?.aborted) return;
        setSales(data.sales || []);
      } catch (err) {
        if (isAbortError(err)) return;
        toast.error(getErrorMessage(err, "Failed to load sales"));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [apiClient],
  );

  useAsyncEffect((signal) => loadSales(signal), [loadSales]);

  const fetchSales = () => loadSales();

  const viewSaleDetail = async (sale: Sale) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedSale(null);

    try {
      const data = await getSaleById(apiClient, sale.id);
      setSelectedSale(data);
    } catch (err) {
      setDetailOpen(false);
      toast.error(getErrorMessage(err, "Failed to load sale details"));
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredSales = sales.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.payment_method.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <StorePageHeader
          className="mb-0"
          title="Sales"
          description="Process sales and view this store's transactions"
        />
        <Button
          onClick={() => setPosOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> New Sale
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search sales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="h-9 px-3">
              {filteredSales.length} sales
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <ShoppingCart className="mr-2 h-5 w-5 animate-pulse" /> Loading
              sales...
            </div>
          ) : filteredSales.length === 0 ? (
            <p className="py-12 text-center text-slate-400">
              No sales recorded yet. Click "New Sale" to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 font-medium">Sale ID</th>
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Subtotal</th>
                    <th className="pb-3 font-medium">Discount</th>
                    <th className="pb-3 font-medium">Tax</th>
                    <th className="pb-3 font-medium">Final Amount</th>
                    <th className="pb-3 font-medium">Payment</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b last:border-0 transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3 font-mono text-xs text-slate-600">
                        {sale.id.slice(0, 8)}
                      </td>
                      <td className="py-3 text-slate-700">
                        <div>{formatClientName(sale)}</div>
                        {sale.customer_phone && (
                          <p className="text-xs text-slate-500">
                            {sale.customer_phone}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-slate-600">
                        ${Number(sale.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-slate-600">
                        ${Number(sale.discount).toFixed(2)}
                      </td>
                      <td className="py-3 text-slate-600">
                        ${Number(sale.tax).toFixed(2)}
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        ${Number(sale.final_amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-slate-600">
                        {formatPaymentMethod(sale.payment_method)}
                      </td>
                      <td className="py-3">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewSaleDetail(sale)}
                          className="h-8 text-xs"
                        >
                          <Receipt className="mr-1 h-3 w-3" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSale
        open={posOpen}
        onOpenChange={setPosOpen}
        onSaleComplete={fetchSales}
      />

      <SaleDetailsModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        selectedSale={selectedSale}
        detailLoading={detailLoading}
      />
    </div>
  );
}
