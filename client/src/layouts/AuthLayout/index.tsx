import { Store } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-950 p-12 text-white">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-emerald-400" />
          <span className="text-2xl font-bold tracking-tight">SuperStore</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Manage your store
            <span className="block text-emerald-400">in one place</span>
          </h1>
          <p className="max-w-md text-lg text-slate-400">
            Track products, inventory, sales, and your team from a single dashboard built for small businesses.
          </p>
        </div>

        <p className="text-sm text-slate-500">SuperStore Manager v1.0</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 p-8">
        <Card className="w-full max-w-lg border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 lg:hidden">
              <Store className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">{title}</CardTitle>
            <CardDescription className="text-slate-500">{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
