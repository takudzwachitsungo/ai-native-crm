import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { Icons } from "./icons";
import { MainMenu } from "./MainMenu";


export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-3 top-3 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-lg backdrop-blur md:hidden"
        aria-label="Open navigation menu"
      >
        <Icons.Menu size={18} />
      </button>

      {isMobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(82vw,21rem)] flex-col border-r border-border bg-background shadow-2xl">
            <div className="flex h-[56px] items-center justify-between border-b border-border px-4">
              <Link to="/" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-2 text-sm font-semibold">
                <Icons.LogoSmall />
                <span>Cicosy CRM</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                aria-label="Close navigation menu"
              >
                <Icons.X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <MainMenu isExpanded onSelect={() => setIsMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <aside
        className={cn(
          "h-app flex-shrink-0 flex-col fixed top-0 items-center hidden md:flex z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "bg-background border-r border-border",
          isExpanded ? "w-[240px]" : "w-[70px]"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div
          className={cn(
            "absolute top-0 left-0 h-[50px] flex items-center justify-center bg-background border-b border-border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isExpanded ? "w-full" : "w-[69px]"
          )}
        >
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 transition-none">
            <Icons.LogoSmall />
          </Link>
        </div>

        <div className="flex min-h-0 flex-col w-full pt-[50px] flex-1 overflow-y-auto overflow-x-hidden">
          <MainMenu isExpanded={isExpanded} />
        </div>
      </aside>
    </>
  );
}
