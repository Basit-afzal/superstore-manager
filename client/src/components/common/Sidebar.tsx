import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  MapPin,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.PRODUCTS, label: "Products", icon: Package },
  { href: ROUTES.SALES, label: "Sales", icon: ShoppingCart },
  { href: ROUTES.EMPLOYEES, label: "Employees", icon: Users },
  { href: ROUTES.CUSTOMERS, label: "Customers", icon: UserCircle },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const { currentStore, clearStore } = useStore();

  function handleLogout() {
    clearStore();
    logout();
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-slate-950 text-white transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-slate-300">
            SuperStore
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed && currentStore && (
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Store className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="truncate">{currentStore.name}</span>
          </div>
          {currentStore.location && (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{currentStore.location}</span>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-600/20 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4 space-y-2">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full text-slate-400 hover:bg-slate-800 hover:text-white",
            collapsed ? "px-0 justify-center" : "justify-start",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </div>
    </aside>
  );
}
