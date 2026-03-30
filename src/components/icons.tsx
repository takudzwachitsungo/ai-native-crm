export type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowLeft,
  Inbox,
  FileText,
  Clock,
  Timer,
  Users,
  FolderLock,
  Settings,
  Search,
  Bell,
  Menu,
  ChevronDown,
  ChevronUp,
  Plus,
  Paperclip,
  Mic,
  Send,
  TrendingUp,
  PieChart,
  Star,
  DollarSign,
  Gauge,
  Receipt,
  BarChart2,
  Wallet,
  ChevronRight,
  X,
  List,
  Download,
  // CRM-specific icons
  UserPlus,
  Contact,
  Handshake,
  Target,
  CheckSquare,
  CalendarDays,
  BarChart3,
  Building2,
  Mail,
  Phone,
  Kanban,
  Briefcase,
  CircleDollarSign,
  Activity,
  Percent,
  // Additional icons
  Filter,
  Edit,
  Trash,
  User,
  Zap,
  CreditCard,
  Lock,
  TrendingDown,
  Package,
  FolderOpen,
  Grid,
  Upload,
  Share,
  Eye,
  File,
  Image,
  LogOut,
  HelpCircle,
  AlertCircle,
  Sparkles,
  CheckCircle,
  ArrowRight,
  BarChart,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export function LogoSmall() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 6V12L16 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8C8.5 7 10 6 12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const Icons = {
  // CRM Navigation
  Dashboard: LayoutDashboard,
  Overview: LayoutDashboard,
  LayoutDashboard: LayoutDashboard,
  Leads: UserPlus,
  UserPlus: UserPlus,
  Contacts: Contact,
  Contact: Contact,
  Deals: Handshake,
  Handshake: Handshake,
  Pipeline: Kanban,
  Kanban: Kanban,
  Tasks: CheckSquare,
  CheckSquare: CheckSquare,
  Calendar: CalendarDays,
  CalendarDays: CalendarDays,
  Reports: BarChart3,
  BarChart3: BarChart3,
  Companies: Building2,
  Building2: Building2,
  Settings: Settings,
  
  // Legacy Navigation (for compatibility)
  Transactions: ArrowLeftRight,
  ArrowLeftRight: ArrowLeftRight,
  Inbox: Inbox,
  Invoices: FileText,
  FileText: FileText,
  Tracker: Clock,
  Clock: Clock,
  Timer: Timer,
  Customers: Users,
  Users: Users,
  Vault: FolderLock,
  FolderLock: FolderLock,
  
  // Actions
  Search: Search,
  Bell: Bell,
  Menu: Menu,
  ChevronDown: ChevronDown,
  ChevronUp: ChevronUp,
  ChevronRight: ChevronRight,
  Plus: Plus,
  Add: Plus,
  Close: X,
  X: X,
  List: List,
  Download: Download,
  Filter: Filter,
  Edit: Edit,
  Trash: Trash,
  
  // Communication
  Mail: Mail,
  Phone: Phone,
  Paperclip: Paperclip,
  Mic: Mic,
  Send: Send,
  
  // CRM Widget Icons
  TrendingUp: TrendingUp,
  TrendingDown: TrendingDown,
  PieChart: PieChart,
  Star: Star,
  Amount: DollarSign,
  DollarSign: DollarSign,
  Revenue: CircleDollarSign,
  CircleDollarSign: CircleDollarSign,
  Speed: Gauge,
  Gauge: Gauge,
  ReceiptLong: Receipt,
  Receipt: Receipt,
  ShowChart: BarChart2,
  BarChart2: BarChart2,
  Accounts: Wallet,
  Wallet: Wallet,
  Target: Target,
  Activity: Activity,
  Percent: Percent,
  Briefcase: Briefcase,
  
  // User & Settings
  User: User,
  Zap: Zap,
  CreditCard: CreditCard,
  Lock: Lock,
  
  // Documents & Files
  Package: Package,
  FolderOpen: FolderOpen,
  Grid: Grid,
  Upload: Upload,
  Share: Share,
  Eye: Eye,
  File: File,
  Image: Image,
  LogOut: LogOut,
  HelpCircle: HelpCircle,
  AlertCircle: AlertCircle,
  
  // AI & Actions
  Sparkles: Sparkles,
  CheckCircle: CheckCircle,
  ArrowRight: ArrowRight,
  ArrowLeft: ArrowLeft,
  BarChart: BarChart,
  RefreshCw: RefreshCw,
  ExternalLink: ExternalLink,
  
  // Logo
  LogoSmall: LogoSmall,
};
