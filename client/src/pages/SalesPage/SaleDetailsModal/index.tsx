import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatPaymentMethod } from "@/utils/formatPaymentMethod";

import { Sale } from "@/types";

const SaleDetailsModal = ({
  open,
  onOpenChange,
  selectedSale,
  detailLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSale: Sale | null;
  detailLoading: boolean;
}) => {
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Sale Details
          </DialogTitle>
        </DialogHeader>
        {detailLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Loading sale details...
          </p>
        ) : selectedSale ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Sale ID</p>
                <p className="font-mono text-xs">{selectedSale.id}</p>
              </div>
              <div>
                <p className="text-slate-500">Date</p>
                <p>{new Date(selectedSale.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Client</p>
                <p>{selectedSale.customer_name?.trim() || "Walk-in"}</p>
                {selectedSale.customer_phone && (
                  <p className="text-xs text-slate-500">
                    {selectedSale.customer_phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-slate-500">Payment</p>
                <p>{formatPaymentMethod(selectedSale.payment_method)}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {selectedSale.status}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Items</h4>
              {!selectedSale.items?.length ? (
                <p className="text-sm text-slate-400">No items found</p>
              ) : (
                selectedSale.items.map((item, index) => (
                  <div
                    key={item.id ?? `${item.product_id}-${index}`}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <span>
                      {item.name ?? item.products?.name ?? "Unknown"} ×{" "}
                      {item.quantity}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {currencyFormatter.format(item.total_price)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="tabular-nums">
                  {currencyFormatter.format(selectedSale.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span className="tabular-nums">
                  -{currencyFormatter.format(selectedSale.discount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span className="tabular-nums">
                  +{currencyFormatter.format(selectedSale.tax)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-emerald-600 tabular-nums">
                  {currencyFormatter.format(selectedSale.final_amount)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailsModal;
