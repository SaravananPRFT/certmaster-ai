import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { Button } from "@/components/ui/button";
import { Brain, Home, BookOpen, BarChart2, MessageSquare, CalendarDays, LogOut, Sun, Moon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/certifications", label: "Certifications", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/ai-assistant", label: "AI Assistant", icon: MessageSquare },
  { href: "/study-planner", label: "Study Planner", icon: CalendarDays },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/20">
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
              <Brain className="h-6 w-6" />
              <span className="hidden sm:block">CertMaster AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors",
                    location.pathname === item.href
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <span className="text-sm text-muted-foreground hidden lg:block">{user?.displayName}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="flex items-center gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sign out</span>
            </Button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
