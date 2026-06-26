import { Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/context/StoreContext';

interface StorePageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function StorePageHeader({ title, description, className = 'mb-8' }: StorePageHeaderProps) {
  const { currentStore } = useStore();

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          <Store className="h-3 w-3" />
          {currentStore?.name || 'Your store'}
        </Badge>
        {currentStore?.location && (
          <span className="text-sm text-slate-400">{currentStore.location}</span>
        )}
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-slate-500">{description}</p>}
    </div>
  );
}
