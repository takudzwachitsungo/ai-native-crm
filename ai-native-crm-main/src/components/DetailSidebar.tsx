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
        className="fixed inset-0 bg-black/20 z-40 animate-in fade-in"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-border z-50 shadow-lg animate-in slide-in-from-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-foreground truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <Icons.X size={20} />
            </button>
          </div>

          {/* Actions Bar */}
          {(onEdit || onDelete || actions.length > 0) && (
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-secondary/30">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <Icons.Edit size={14} />
                  Edit
                </button>
              )}
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2 ${
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
                  className="ml-auto px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Icons.Trash size={14} />
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
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
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
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
    <div className="flex items-start gap-3">
      {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}
