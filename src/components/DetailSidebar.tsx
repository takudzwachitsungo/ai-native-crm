import { type ReactNode } from "react";
import { Icons } from "./icons";

interface DetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: "default" | "danger";
  }>;
}

export function DetailSidebar({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onEdit,
  onDelete,
  actions = [],
}: DetailSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] z-40 animate-in fade-in"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[42rem] bg-background border-l border-border z-50 shadow-2xl animate-in slide-in-from-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="mb-2 inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                  Lead Overview
                </div>
                <h2 className="text-xl font-semibold text-foreground truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors flex-shrink-0 border border-border/70 bg-background/80"
                aria-label="Close"
              >
                <Icons.X size={18} />
              </button>
            </div>
          </div>

          {/* Actions Bar */}
          {(onEdit || onDelete || actions.length > 0) && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <Icons.Edit size={14} />
                  Edit
                </button>
              )}
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 ${
                    action.variant === "danger"
                      ? "text-red-600 hover:bg-red-50 border-red-200"
                      : ""
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="ml-auto px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Icons.Trash size={14} />
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-semibold text-foreground mb-3 uppercase tracking-[0.16em]">
        {title}
      </h3>
      <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">{children}</div>
    </section>
  );
}

interface DetailFieldProps {
  label: string;
  value?: string | number | ReactNode;
  icon?: ReactNode;
}

export function DetailField({ label, value, icon }: DetailFieldProps) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}
