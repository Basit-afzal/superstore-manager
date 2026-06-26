import type { DashboardPeriod, DashboardStats, Product } from "@/types";
import { useCallback, useRef, useState } from "react";
import {
  uploadStoreProfileImage,
  resolveProfileImageUrl,
} from "@/services/api/stores";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { StorePageHeader } from "@/components/common/StorePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Camera,
  MapPin,
  Store,
  TriangleAlert as AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";
import { getDashboardStats } from "@/services/api/dashboard";
import { getAllProducts } from "@/services/api/products";
import { useApiClient } from "@/hooks/useApiClient";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { isAbortError } from "@/utils/isAbortError";

function getInitials(name?: string): string {
  if (!name?.trim()) return "SS";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPercentChange(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}%`;
}

function formatAbsoluteChange(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}`;
}

function isLowInventory(product: Product) {
  const qty = product.total_quantity ?? 0;
  const min = product.min_stock_level ?? 0;
  return qty === 0 || qty <= min;
}

function getInventoryWarning(product: Product) {
  const qty = product.total_quantity ?? 0;
  const min = product.min_stock_level ?? 0;

  if (qty === 0) {
    return `${product.name} is out of stock.`;
  }

  return `${product.name} has only ${qty} ${product.unit}(s) left (min: ${min}).`;
}

const defaultStats: DashboardStats = {
  period: "current_month",
  startDate: "",
  endDate: "",
  totalProducts: 0,
  totalSales: 0,
  totalProfit: 0,
  totalEmployees: 0,
  comparison: {
    profitChange: 0,
    salesChange: 0,
    productsChange: 0,
    employeesChange: 0,
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentStore, setStore } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [period, setPeriod] = useState<DashboardPeriod>("current_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [lowInventoryProducts, setLowInventoryProducts] = useState<Product[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const apiClient = useApiClient();

  async function handleProfileImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image cannot be greater than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const updatedStore = await uploadStoreProfileImage(file);
      setStore(updatedStore);
      toast.success("Profile picture updated");
    } catch (err) {
      console.error("Error updating profile image:", err);
      toast.error("Failed to update profile picture");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const ownerName = currentStore?.owner_name || user?.name || "Store Owner";
  const profileImage = resolveProfileImageUrl(currentStore?.profile_image);

  const loadDashboardStats = useCallback(
    async (
      selectedPeriod: DashboardPeriod,
      startDate: string,
      endDate: string,
      signal?: AbortSignal,
    ) => {
      if (selectedPeriod === "custom" && (!startDate || !endDate)) {
        return;
      }

      setLoading(true);
      try {
        const [statsData, productsData] = await Promise.all([
          getDashboardStats(
            apiClient,
            {
              period: selectedPeriod,
              ...(selectedPeriod === "custom" ? { startDate, endDate } : {}),
            },
            signal,
          ),
          getAllProducts(apiClient, { limit: 100, is_active: true }, signal),
        ]);

        if (signal?.aborted) return;

        setStats(statsData);
        setLowInventoryProducts(
          productsData.products.filter(isLowInventory),
        );
      } catch (err) {
        if (isAbortError(err)) return;
        toast.error(getErrorMessage(err, "Failed to fetch dashboard stats"));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [apiClient],
  );

  useAsyncEffect(
    (signal) => loadDashboardStats("current_month", "", "", signal),
    [loadDashboardStats],
  );

  const handlePeriodChange = (value: DashboardPeriod) => {
    setPeriod(value);
    if (value !== "custom") {
      loadDashboardStats(value, "", "");
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (customStartDate > customEndDate) {
      toast.error("Start date must be before end date");
      return;
    }
    loadDashboardStats("custom", customStartDate, customEndDate);
  };

  const comparisonLabel =
    period === "custom"
      ? "vs previous period"
      : period === "last_month"
        ? "vs month before"
        : "vs last month";

  const salesTitle =
    period === "current_month"
      ? "Sales This Month"
      : period === "last_month"
        ? "Sales Last Month"
        : "Total Sales";

  const statCards = [
    {
      title: "Total Profit",
      value: `$${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      change: formatPercentChange(stats.comparison.profitChange),
      up: stats.comparison.profitChange >= 0,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: salesTitle,
      value: stats.totalSales.toLocaleString(),
      icon: TrendingUp,
      change: formatPercentChange(stats.comparison.salesChange),
      up: stats.comparison.salesChange >= 0,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Products",
      value: stats.totalProducts.toString(),
      icon: Package,
      change: formatAbsoluteChange(stats.comparison.productsChange),
      up: stats.comparison.productsChange >= 0,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Total Employees",
      value: stats.totalEmployees.toString(),
      icon: Users,
      change: formatAbsoluteChange(stats.comparison.employeesChange),
      up: stats.comparison.employeesChange >= 0,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="p-8">
      <Card className="mb-8 border-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-emerald-100">
                {profileImage ? (
                  <AvatarImage src={profileImage} alt={ownerName} />
                ) : null}
                <AvatarFallback className="bg-emerald-600 text-xl font-semibold text-white">
                  {getInitials(ownerName)}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label="Change profile picture"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-600">
                Your profile
              </p>
              <h2 className="text-2xl font-bold text-slate-900">{ownerName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Store className="h-3.5 w-3.5" />
                  {currentStore?.name || "Your store"}
                </span>
                {currentStore?.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {currentStore.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {uploadingPhoto
              ? "Uploading photo..."
              : "Click the camera icon to update your photo"}
          </p>
        </CardContent>
      </Card>

      <StorePageHeader
        title="Dashboard"
        description="Overview of this store's performance"
      />

      <Card className="mb-8 border-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">Period</p>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "custom" && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">Start Date</p>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[180px]"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">End Date</p>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[180px]"
                />
              </div>
              <Button onClick={handleApplyCustomDates}>Apply</Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="relative overflow-hidden border-0 shadow-sm"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {card.up ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${card.up ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {card.change}
                    </span>
                    <span className="text-xs text-slate-400">
                      {comparisonLabel}
                    </span>
                  </div>
                </div>
                <div className={`rounded-xl p-3 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Requires Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-90 overflow-y-auto rounded-lg border border-slate-100 p-1">
            {lowInventoryProducts.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                All products are sufficiently stocked.
              </p>
            ) : (
              <div className="space-y-3 pr-2">
                {lowInventoryProducts.map((product) => {
                  const isOutOfStock = (product.total_quantity ?? 0) === 0;

                  return (
                    <div
                      key={product.id}
                      className={`flex items-start gap-3 rounded-lg border p-4 ${
                        isOutOfStock
                          ? "border-red-200 bg-red-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isOutOfStock ? "text-red-600" : "text-amber-600"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          isOutOfStock ? "text-red-800" : "text-amber-800"
                        }`}
                      >
                        {getInventoryWarning(product)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
