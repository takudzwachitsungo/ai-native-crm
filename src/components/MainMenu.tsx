import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { Icons } from "./icons";
import type { LucideIcon } from "lucide-react";

const items = [
  { path: "/", name: "Dashboard" },
  { path: "/leads", name: "Leads" },
  { path: "/contacts", name: "Contacts" },
  { path: "/companies", name: "Companies" },
  { path: "/deals", name: "Deals" },
  { path: "/pipeline", name: "Pipeline" },
  { path: "/quotes", name: "Quotes" },
  { path: "/invoices", name: "Invoices" },
  { path: "/products", name: "Products" },
  { path: "/tasks", name: "Tasks" },
  { path: "/calendar", name: "Calendar" },
  { path: "/email", name: "Email" },
  { path: "/reports", name: "Reports" },
  { path: "/forecasting", name: "Forecasting" },
  { path: "/settings", name: "Settings" },
];

const icons: Record<string, LucideIcon> = {
  "/": Icons.Dashboard,
  "/leads": Icons.Leads,
  "/contacts": Icons.Contacts,
  "/companies": Icons.Building2,
  "/deals": Icons.Deals,
  "/pipeline": Icons.Pipeline,
  "/quotes": Icons.FileText,
  "/invoices": Icons.FileText,
  "/products": Icons.Package,
  "/tasks": Icons.Tasks,
  "/calendar": Icons.Calendar,
  "/email": Icons.Mail,
  "/reports": Icons.Reports,
  "/forecasting": Icons.TrendingUp,
  "/settings": Icons.Settings,
};

interface Props {
  onSelect?: () => void;
  isExpanded?: boolean;
}

export function MainMenu({ onSelect, isExpanded = false }: Props) {
  const location = useLocation();

  return (
    <div className="mt-6 w-full">
      <nav className="w-full">
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const Icon = icons[item.path];
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onSelect?.()}
                className="group"
              >
                <div className="relative">
                  <div
                    className={cn(
                      "border border-transparent h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px]",
                      isActive &&
                        "bg-[#f7f7f7] dark:bg-[#131313] border-[#e6e6e6] dark:border-[#1d1d1d]",
                      isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]"
                    )}
                  />
                  <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center dark:text-[#666666] text-black group-hover:!text-primary pointer-events-none">
                    <div className={cn(isActive && "dark:!text-white")}>
                      {Icon && <Icon size={20} />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="absolute top-0 left-[55px] right-[4px] h-[40px] flex items-center pointer-events-none">
                      <span
                        className={cn(
                          "text-sm font-medium transition-opacity duration-200 ease-in-out text-[#666] group-hover:text-primary",
                          "whitespace-nowrap overflow-hidden",
                          isActive && "text-primary"
                        )}
                      >
                        {item.name}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
