import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { Icons } from "./icons";
import { MainMenu } from "./MainMenu";


export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen flex-shrink-0 flex-col justify-between fixed top-0 pb-4 items-center hidden md:flex z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
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
        <Link to="/" className="absolute left-[22px] transition-none">
          <Icons.LogoSmall />
        </Link>
      </div>

      <div className="flex flex-col w-full pt-[50px] flex-1 border-b border-border mb-3">
        <MainMenu isExpanded={isExpanded} />
      </div>
    </aside>
  );
}
