import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Check,
  FileText,
  LayoutTemplate,
  Settings,
  Crown,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  match?: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Inspeções",
    icon: FileText,
    match: (p) => p === "/" || p === "/dashboard",
  },
  {
    href: "/templates",
    label: "Templates",
    icon: LayoutTemplate,
    match: (p) => p.startsWith("/templates"),
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  {
    href: "/settings",
    label: "Configurações",
    icon: Settings,
    match: (p) => p === "/settings",
  },
  {
    href: "/pricing",
    label: "Plano",
    icon: Crown,
    match: (p) => p === "/pricing",
  },
];

function isActive(item: NavItem, location: string) {
  if (item.match) return item.match(location);
  return location === item.href;
}

// ── Desktop Sidebar ────────────────────────────────────────────────
function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#1a1d23] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-[#FFD100] rounded-lg flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-[#1a1d23] stroke-[3]" />
        </div>
        <span className="font-bold text-lg text-white">
          SST<span className="text-[#FFD100]">Check</span>Pro
        </span>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">
          Principal
        </p>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item, location);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  active
                    ? "bg-[#FFD100] text-[#1a1d23]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </div>
            </Link>
          );
        })}

        <div className="pt-4">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">
            Conta
          </p>
          {BOTTOM_ITEMS.map((item) => {
            const active = isActive(item, location);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    active
                      ? "bg-[#FFD100] text-[#1a1d23]"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Usuário + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#FFD100] flex items-center justify-center flex-shrink-0">
            <span className="text-[#1a1d23] text-xs font-bold">
              {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName || "Usuário"}
            </p>
            <p className="text-white/40 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="w-full justify-start text-white/50 hover:text-white hover:bg-white/10 gap-3 px-3"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}

// ── Mobile Bottom Nav ──────────────────────────────────────────────
function BottomNav() {
  const [location] = useLocation();
  const ALL_ITEMS = [...NAV_ITEMS, ...BOTTOM_ITEMS];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1d23] border-t border-white/10 z-40 safe-area-inset-bottom">
      <div className="flex items-center">
        {ALL_ITEMS.map((item) => {
          const active = isActive(item, location);
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={`flex flex-col items-center gap-1 py-3 transition-all ${
                  active ? "text-[#FFD100]" : "text-white/50"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── AppLayout (wrapper principal) ─────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {!isMobile && <Sidebar />}

      <main className={isMobile ? "pb-20" : "ml-60"}>
        {children}
      </main>

      {isMobile && <BottomNav />}
    </div>
  );
}
