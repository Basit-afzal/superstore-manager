import { getErrorMessage } from "@/utils/getErrorMessage";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/layouts/AuthLayout/index.tsx";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { ROUTES } from "@/constants";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import { loginUser } from "@/services/api/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setStore } = useStore();
  const apiClient = useApiClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(apiClient, { email, password });
      login(data.user, data.token);

      const store = data.store ?? data.stores?.[0];
      if (store) {
        setStore(store);
        toast.success(`Welcome to ${store.name}!`);
      } else {
        toast.success("Welcome back!");
      }

      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Login failed. Connect your Express API to enable authentication.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Access your store dashboard"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Owner email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              autoComplete="current-password"
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

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have a store yet?{" "}
        <Link
          to={ROUTES.SIGNUP}
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          Register your store
        </Link>
      </p>
    </AuthLayout>
  );
}
