import { getErrorMessage } from "@/utils/getErrorMessage";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Store, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/layouts/AuthLayout/index.tsx";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { ROUTES } from "@/constants";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import { registerUser } from "@/services/api/auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setStore } = useStore();
  const apiClient = useApiClient();
  const [form, setForm] = useState({
    storeName: "",
    storeLocation: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.storeName.trim() ||
      !form.ownerName.trim() ||
      !form.email ||
      !form.password
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(apiClient, {
        storeName: form.storeName.trim(),
        storeLocation: form.storeLocation.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email,
        password: form.password,
      });

      if (data.token) {
        login(data.user, data.token);
        if (data.store) {
          setStore(data.store);
          toast.success(`${data.store.name} is ready to manage!`);
          navigate(ROUTES.DASHBOARD);
        } else {
          toast.success("Store registered! Please sign in.");
          navigate(ROUTES.LOGIN);
        }
      } else {
        toast.success("Store registered! Please sign in.");
        navigate(ROUTES.LOGIN);
      }
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Registration failed. Connect your Express API to enable signup.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Register your store"
      description="Create your store and owner account"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Store details
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store name *</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="storeName"
                  placeholder="Downtown SuperMart"
                  value={form.storeName}
                  onChange={(e) => updateField("storeName", e.target.value)}
                  className="bg-white pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeLocation">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="storeLocation"
                  placeholder="City, area, or address"
                  value={form.storeLocation}
                  onChange={(e) => updateField("storeLocation", e.target.value)}
                  className="bg-white pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Owner account
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Your name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="ownerName"
                  placeholder="John Doe"
                  value={form.ownerName}
                  onChange={(e) => updateField("ownerName", e.target.value)}
                  className="bg-white pl-10"
                  autoComplete="name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="bg-white pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="bg-white pl-10 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  className="bg-white pl-10 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={loading}
        >
          {loading ? "Creating store..." : "Create store"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
