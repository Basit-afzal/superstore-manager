import type { PaginationMeta, Product } from "@/types";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { StorePageHeader } from "@/components/common/StorePageHeader";
import { DataPagination } from "@/components/common/DataPagination";
import { ProductFormDialog } from "@/components/forms/ProductFormDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Trash2, Package, ArrowUpDown, TriangleAlert as AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  adjustProductStock,
  deleteProduct,
  getAllProducts,
  restockProduct,
} from "@/services/api/products";
import { PRODUCT_UNITS } from "@/lib/validations/product.schema";
import { useApiClient } from "@/hooks/useApiClient";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isAbortError } from "@/utils/isAbortError";

const PRODUCT_UNIT_LABELS: Record<(typeof PRODUCT_UNITS)[number], string> = {
  piece: "Piece",
  kg: "Kilogram",
  liter: "Liter",
  pack: "Pack",
  box: "Box",
};

const PAGE_SIZE = 10;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function ProductsPage() {
  const { currentStore } = useStore();
  const apiClient = useApiClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const filtersChanged = useRef(false);

  useEffect(() => {
    filtersChanged.current = true;
    setPage(1);
  }, [debouncedSearch, statusFilter, unitFilter, currentStore?.id]);

  const loadProducts = useCallback(
    async (signal?: AbortSignal) => {
      if (filtersChanged.current && page !== 1) {
        return;
      }

      filtersChanged.current = false;
      setLoading(true);
      try {
        const data = await getAllProducts(
          apiClient,
          {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch.trim() || undefined,
            is_active:
              statusFilter === "all" ? undefined : statusFilter === "active",
            unit: unitFilter === "all" ? undefined : unitFilter,
          },
          signal,
        );
        if (signal?.aborted) return;
        setProducts(data.products);
        setPagination(data.pagination);
      } catch (err) {
        if (isAbortError(err)) return;
        toast.error("Failed to load products: " + getErrorMessage(err));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [apiClient, page, debouncedSearch, statusFilter, unitFilter],
  );

  useAsyncEffect((signal) => loadProducts(signal), [loadProducts]);

  async function fetchProducts() {
    await loadProducts();
  }

  // async function fetchCategories() {
  //   try {
  //     const data = await productsApi.getCategories();
  //     setCategories(data || []);
  //   } catch (err) {
  //     toast.error("Failed to load categories: " + getErrorMessage(err));
  //   }
  // }

  function openCreate() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  function openRestock(product: Product) {
    setStockProduct(product);
    setRestockQty("");
    setRestockOpen(true);
  }

  function openAdjust(product: Product) {
    setStockProduct(product);
    setAdjustQty("");
    setAdjustNote("");
    setAdjustOpen(true);
  }

  function stockStatus(product: Product) {
    const qty = product.total_quantity ?? 0;
    const min = product.min_stock_level ?? 0;
    if (qty === 0) return "out";
    if (qty <= min) return "low";
    return "ok";
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(apiClient, id);
      toast.success("Product deleted");
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete product"));
    }
  }

  async function handleRestock() {
    if (!stockProduct) return;
    const quantity = parseFloat(restockQty);
    if (!quantity || quantity <= 0) {
      toast.error("Enter a valid quantity to add");
      return;
    }

    setSaving(true);
    try {
      await restockProduct(apiClient, stockProduct.id, quantity);
      toast.success(`Added ${quantity} units to ${stockProduct.name}`);
      setRestockOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to restock product"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust() {
    if (!stockProduct) return;
    const quantity = parseFloat(adjustQty);
    if (Number.isNaN(quantity) || quantity === 0) {
      toast.error("Enter a non-zero adjustment (+ or -)");
      return;
    }
    if (!adjustNote.trim()) {
      toast.error("A reason is required for adjustments");
      return;
    }

    setSaving(true);
    try {
      await adjustProductStock(apiClient, stockProduct.id, {
        quantity,
        note: adjustNote.trim(),
      });
      toast.success("Stock adjusted");
      setAdjustOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to adjust stock"));
    } finally {
      setSaving(false);
    }
  }

  const lowStockCount = products.filter((p) => stockStatus(p) === "low").length;
  const outOfStockCount = products.filter((p) => stockStatus(p) === "out").length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <StorePageHeader
          className="mb-0"
          title="Products"
          description="Manage catalog, stock levels, and restocking"
        />
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {(lowStockCount > 0 || outOfStockCount > 0) && !loading && (
        <div className="mb-6 flex flex-wrap gap-3">
          {lowStockCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {lowStockCount} low stock
            </Badge>
          )}
          {outOfStockCount > 0 && (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              {outOfStockCount} out of stock
            </Badge>
          )}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={(value: "all" | "active" | "inactive") =>
                    setStatusFilter(value)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All units</SelectItem>
                    {PRODUCT_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {PRODUCT_UNIT_LABELS[unit]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="h-9 px-3">
                  {pagination.total} products
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Package className="mr-2 h-5 w-5 animate-pulse" /> Loading
              products...
            </div>
          ) : products.length === 0 ? (
            <p className="py-12 text-center text-slate-400">
              No products found. Add your first product to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">SKU</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Unit</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b last:border-0 transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3 font-medium text-slate-900">
                        {product.name}
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-600">
                        {product.sku}
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        {usdFormatter.format(product.selling_price)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.total_quantity ?? 0}</span>
                          {stockStatus(product) === "low" && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">
                              Low
                            </Badge>
                          )}
                          {stockStatus(product) === "out" && (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                              Out
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 capitalize text-slate-600">
                        {product.unit}
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            product.is_active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                          }
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRestock(product)}
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                            title="Restock"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAdjust(product)}
                            className="h-8 w-8"
                            title="Adjust stock"
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(product)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
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
              itemLabel="products"
            />
          )}
        </CardContent>
      </Card>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSaved={fetchProducts}
      />

      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restock — {stockProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              Current stock: <strong>{stockProduct?.total_quantity ?? 0}</strong>{" "}
              {stockProduct?.unit}
            </p>
            <div className="space-y-2">
              <Label htmlFor="restock_qty">Quantity to add</Label>
              <Input
                id="restock_qty"
                type="number"
                min="1"
                step="1"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRestock}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving}
            >
              {saving ? "Saving..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {stockProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              Current stock: <strong>{stockProduct?.total_quantity ?? 0}</strong>.
              Use negative numbers to reduce (e.g. -5 for damage/loss).
            </p>
            <div className="space-y-2">
              <Label htmlFor="adjust_qty">Adjustment (+ / -)</Label>
              <Input
                id="adjust_qty"
                type="number"
                step="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="e.g. -3 or +10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust_note">Reason</Label>
              <Textarea
                id="adjust_note"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Damaged items, stock count correction..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={saving}>
              {saving ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
