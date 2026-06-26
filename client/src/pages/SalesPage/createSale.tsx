import type { CartItem, Customer, PaginationMeta, Product } from "@/types";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { cn } from "@/utils/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useApiClient } from "@/hooks/useApiClient";
import { useStore } from "@/context/StoreContext";
import { getAllProducts } from "@/services/api/products";
import { createSale } from "@/services/api/sales";
import { getAllCustomers } from "@/services/api/customers";
import { StripePaymentSection } from "@/components/payments/StripePaymentSection";
import { DataPagination } from "@/components/common/DataPagination";
import Select, { type SingleValue } from "react-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Banknote,
  CreditCard,
  Globe,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type ClientOption = {
  value: string;
  label: string;
  phone?: string;
};

type PaymentMethod = "cod" | "card_on_delivery" | "stripe";

const paymentMethodOptions: {
  value: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: "cod", label: "COD", icon: Banknote },
  { value: "card_on_delivery", label: "Card on Delivery", icon: CreditCard },
  { value: "stripe", label: "Online Payment (Stripe)", icon: Globe },
];

const clientSelectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: 36,
    borderColor: state.isFocused ? "#10b981" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 1px #10b981" : "none",
    "&:hover": { borderColor: "#10b981" },
  }),
  option: (
    base: Record<string, unknown>,
    state: { isSelected: boolean; isFocused: boolean },
  ) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#ecfdf5"
      : state.isFocused
        ? "#f8fafc"
        : "white",
    color: "#0f172a",
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 60,
  }),
  menuList: (base: Record<string, unknown>) => ({
    ...base,
    maxHeight: 180,
  }),
};

function getProductStock(product: Product): number {
  return Math.max(0, product.total_quantity ?? 0);
}

interface CreateSaleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleComplete?: () => void;
}

export default function CreateSale({
  open,
  onOpenChange,
  onSaleComplete,
}: CreateSaleProps) {
  const apiClient = useApiClient();
  const { currentStore: store } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [productSearch, setProductSearch] = useState("");
  const [completing, setCompleting] = useState(false);
  const stripeConfirmRef = useRef<(() => Promise<string | null>) | null>(null);
  const [page, setPage] = useState(1);
  const debouncedProductSearch = useDebouncedValue(productSearch, 1500);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  function resetForm() {
    setCart([]);
    setDiscount("0");
    setTax("0");
    setSelectedClient(null);
    setPaymentMethod("cod");
    stripeConfirmRef.current = null;
    setProductSearch("");
    setPage(1);
  }

  function fetchProducts() {
    getAllProducts(apiClient, {
      page,
      limit: 10,
      search: debouncedProductSearch.trim() || undefined,
    }).then((data) => {
      if (data) {
        setProducts(data.products);
        setPagination(data.pagination);
      }
    });
  }

  function fetchCustomers() {
    getAllCustomers(apiClient, {
      page: 1,
      limit: 100,
    }).then((data) => {
      if (data) {
        setCustomers(data.customers);
      }
    });
  }

  const clientOptions = useMemo<ClientOption[]>(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
        phone: customer.phone,
      })),
    [customers],
  );

  function handleClientChange(option: SingleValue<ClientOption>) {
    setSelectedClient(option);
  }

  function getCartQuantity(productId: string): number {
    return cart.find((c) => c.product.id === productId)?.quantity ?? 0;
  }

  function getLiveProduct(productId: string): Product | undefined {
    return (
      products.find((p) => p.id === productId) ??
      cart.find((c) => c.product.id === productId)?.product
    );
  }

  function addToCart(product: Product) {
    if (!product.is_active) {
      toast.error(`${product.name} is inactive and cannot be sold`);
      return;
    }

    const stock = getProductStock(product);
    if (stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    const inCart = getCartQuantity(product.id);
    if (inCart >= stock) {
      toast.error(`Only ${stock} available for ${product.name}`);
      return;
    }

    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.product.id === product.id
            ? { ...c, product, quantity: c.quantity + 1 }
            : c,
        ),
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  }

  function updateCartQty(productId: string, rawQty: number) {
    const item = cart.find((c) => c.product.id === productId);
    if (!item) return;

    const liveProduct = getLiveProduct(productId) ?? item.product;
    const stock = getProductStock(liveProduct);

    if (!Number.isFinite(rawQty) || rawQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const qty = Math.min(Math.floor(rawQty), stock);
    if (rawQty > stock) {
      toast.error(`Only ${stock} in stock for ${liveProduct.name}`);
    }

    setCart(
      cart.map((c) =>
        c.product.id === productId
          ? { ...c, product: liveProduct, quantity: qty }
          : c,
      ),
    );
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((c) => c.product.id !== productId));
  }

  const subtotal = cart.reduce(
    (sum, c) => sum + c.product.selling_price * c.quantity,
    0,
  );
  const discountAmount = Math.max(0, parseFloat(discount) || 0);
  const taxPercent = Math.max(0, Math.min(100, parseFloat(tax) || 0));
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableBase * taxPercent) / 100;
  const finalAmount = taxableBase + taxAmount;

  const cartHasStockIssues = useMemo(
    () =>
      cart.some((item) => {
        const live = getLiveProduct(item.product.id) ?? item.product;
        const stock = getProductStock(live);
        return !live.is_active || stock <= 0 || item.quantity > stock;
      }),
    [cart, products],
  );

  const discountExceedsSubtotal = discountAmount > subtotal && subtotal > 0;
  const canCompleteSale =
    cart.length > 0 &&
    !cartHasStockIssues &&
    !discountExceedsSubtotal &&
    finalAmount >= 0 &&
    !completing;

  function handleDiscountChange(value: string) {
    if (value === "" || value === "-") {
      setDiscount(value);
      return;
    }
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setDiscount(value);
  }

  function handleTaxChange(value: string) {
    if (value === "" || value === "-") {
      setTax(value);
      return;
    }
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed) || parsed < 0) return;
    if (parsed > 100) {
      toast.error("Tax cannot exceed 100%");
      setTax("100");
      return;
    }
    setTax(value);
  }

  const handleStripeConfirmReady = useCallback(
    (confirm: () => Promise<string | null>) => {
      stripeConfirmRef.current = confirm;
    },
    [],
  );

  async function completeSale() {
    if (cart.length === 0) {
      toast.error("Add at least one product to the cart");
      return;
    }

    for (const item of cart) {
      const live = getLiveProduct(item.product.id) ?? item.product;
      if (!live.is_active) {
        toast.error(`${live.name} is no longer active`);
        return;
      }
      const stock = getProductStock(live);
      if (stock <= 0) {
        toast.error(`${live.name} is out of stock`);
        return;
      }
      if (item.quantity > stock) {
        toast.error(
          `${live.name}: only ${stock} in stock (cart has ${item.quantity})`,
        );
        return;
      }
    }

    if (discountAmount > subtotal) {
      toast.error("Discount cannot exceed subtotal");
      return;
    }

    if (finalAmount < 0) {
      toast.error("Total cannot be negative");
      return;
    }

    setCompleting(true);
    try {
      let stripePaymentIntentId: string | undefined;

      if (paymentMethod === "stripe") {
        if (!stripeConfirmRef.current) {
          toast.error("Payment form is not ready yet");
          return;
        }

        const paymentIntentId = await stripeConfirmRef.current();
        if (!paymentIntentId) {
          toast.error("Payment was not completed");
          return;
        }
        stripePaymentIntentId = paymentIntentId;
      }

      await createSale(apiClient, {
        store_id: store?.id || "",
        customer_name: selectedClient?.label || "Walk-in",
        customer_phone: selectedClient?.phone?.trim() || "",
        total_amount: subtotal,
        discount: discountAmount,
        tax: taxAmount,
        final_amount: finalAmount,
        payment_method: paymentMethod,
        stripe_payment_intent_id: stripePaymentIntentId,
        status: "completed",
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit_price: c.product.selling_price,
          total_price: c.product.selling_price * c.quantity,
        })),
      });

      toast.success(`Sale completed - ${currencyFormatter.format(finalAmount)}`);
      resetForm();
      onOpenChange(false);
      onSaleComplete?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to complete sale"));
    } finally {
      setCompleting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    fetchProducts();
    fetchCustomers();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [debouncedProductSearch, open]);

  useEffect(() => {
    if (!open) return;
    fetchProducts();
  }, [page, debouncedProductSearch, open]);

  useEffect(() => {
    if (!open || products.length === 0) return;
    setCart((prev) =>
      prev.map((item) => {
        const live = products.find((p) => p.id === item.product.id);
        return live ? { ...item, product: live } : item;
      }),
    );
  }, [products, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Point of Sale
          </DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-5">
          <div className="flex min-h-0 flex-col gap-4 lg:col-span-3">
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid min-h-[480px] gap-2">
              {products.map((product) => {
                const stock = getProductStock(product);
                const inCart = getCartQuantity(product.id);
                const remaining = stock - inCart;
                const outOfStock = stock <= 0 || !product.is_active;
                const maxInCart = inCart >= stock && stock > 0;

                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={outOfStock || maxInCart ? -1 : 0}
                    aria-disabled={outOfStock || maxInCart}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                      outOfStock
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                        : maxInCart
                          ? "cursor-not-allowed border-amber-200 bg-amber-50/50"
                          : "cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/40",
                    )}
                    onClick={() => {
                      if (!outOfStock && !maxInCart) addToCart(product);
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        !outOfStock &&
                        !maxInCart
                      ) {
                        e.preventDefault();
                        addToCart(product);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {product.name}
                        </p>
                        {outOfStock && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">
                            Out of stock
                          </Badge>
                        )}
                        {!product.is_active && stock > 0 && (
                          <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200 text-[10px]">
                            Inactive
                          </Badge>
                        )}
                        {maxInCart && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                            Max in cart
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        SKU: {product.sku} | Stock: {stock}
                        {inCart > 0 && ` (${remaining} left)`}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-emerald-600 tabular-nums">
                      {currencyFormatter.format(product.selling_price)}
                    </p>
                  </div>
                );
              })}
              {products.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  No products found. Add products first.
                </p>
              )}
              </div>
            </div>
            {pagination.totalPages > 1 && (
              <DataPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={setPage}
                itemLabel="products"
              />
            )}
          </div>

          <div className="flex min-h-0 flex-col gap-4 rounded-lg border bg-slate-50 p-4 lg:col-span-2">
            <h3 className="font-semibold text-slate-900">
              Cart ({cart.length} items)
            </h3>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Cart is empty. Click a product to add it.
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.map((item) => {
                  const live = getLiveProduct(item.product.id) ?? item.product;
                  const stock = getProductStock(live);
                  const overStock = item.quantity > stock;

                  return (
                    <div
                      key={item.product.id}
                      className={cn(
                        "space-y-2 rounded-md border bg-white p-3 text-sm",
                        overStock && "border-red-300 bg-red-50/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 break-words">
                            {item.product.name}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            {currencyFormatter.format(item.product.selling_price)}{" "}
                            each · max {stock}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`qty-${item.product.id}`}
                            className="shrink-0 text-xs text-slate-500"
                          >
                            Qty
                          </Label>
                          <Input
                            id={`qty-${item.product.id}`}
                            type="number"
                            min={1}
                            max={stock}
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartQty(
                                item.product.id,
                                parseInt(e.target.value, 10) || 0,
                              )
                            }
                            className={cn(
                              "h-8 w-20 text-center text-xs tabular-nums",
                              overStock && "border-red-400",
                            )}
                            aria-label={`Quantity for ${item.product.name}`}
                          />
                        </div>
                        <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">
                          {currencyFormatter.format(
                            item.product.selling_price * item.quantity,
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {cartHasStockIssues && cart.length > 0 && (
              <p className="text-xs text-red-600">
                Fix stock issues in the cart before completing the sale.
              </p>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium tabular-nums">
                  {currencyFormatter.format(subtotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-500 shrink-0">
                  Discount $
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className={cn(
                    "h-8 text-xs",
                    discountExceedsSubtotal && "border-red-400",
                  )}
                />
              </div>
              {discountExceedsSubtotal && (
                <p className="text-xs text-red-600">
                  Discount cannot exceed subtotal (
                  {currencyFormatter.format(subtotal)})
                </p>
              )}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-500 shrink-0">Tax %</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) => handleTaxChange(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-emerald-600 tabular-nums">
                  {currencyFormatter.format(finalAmount)}
                </span>
              </div>
            </div>

            <div className="relative z-30 space-y-2 rounded-lg border bg-white p-3">
              <Label htmlFor="client-select">Client</Label>
              <Select<ClientOption>
                inputId="client-select"
                instanceId="pos-client-select"
                classNamePrefix="pos-client-select"
                options={clientOptions}
                value={selectedClient}
                onChange={handleClientChange}
                getOptionValue={(option) => option.value}
                getOptionLabel={(option) => option.label}
                isSearchable
                isClearable
                placeholder="Select client..."
                styles={clientSelectStyles}
                menuPlacement="top"
                menuPosition="absolute"
                formatOptionLabel={(option) => (
                  <div>
                    <p className="font-medium text-slate-900">{option.label}</p>
                    {option.phone && (
                      <p className="text-xs text-slate-500">{option.phone}</p>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-white p-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-1 gap-2">
                {paymentMethodOptions.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={paymentMethod === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod(value)}
                    className={cn(
                      "h-auto min-h-9 justify-start px-3 py-2 text-left",
                      paymentMethod === value &&
                        "bg-emerald-600 hover:bg-emerald-700",
                    )}
                  >
                    <Icon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="text-sm">{label}</span>
                  </Button>
                ))}
              </div>

              {paymentMethod === "stripe" && finalAmount > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500">
                    Pay online with card
                  </p>
                  <StripePaymentSection
                    amount={finalAmount}
                    apiClient={apiClient}
                    onConfirmReady={handleStripeConfirmReady}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={completeSale}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!canCompleteSale}
            >
              {completing
                ? "Processing..."
                : paymentMethod === "stripe"
                  ? "Pay & Complete Sale"
                  : "Complete Sale"}
            </Button>
            {!canCompleteSale && cart.length > 0 && !completing && (
              <p className="text-center text-xs text-slate-500">
                {cartHasStockIssues
                  ? "Resolve stock limits to continue"
                  : discountExceedsSubtotal
                    ? "Adjust discount to continue"
                    : "Complete sale unavailable"}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
