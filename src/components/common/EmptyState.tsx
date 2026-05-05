import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-secondary p-3 text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h2 className="text-lg font-medium">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}