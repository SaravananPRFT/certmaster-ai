"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { useGameMode, GAME_LABELS, computeLevel } from "@/lib/game-mode";
import { Button } from "@/components/ui/button";
import { Moon, Sun, BookOpen, LayoutDashboard, Shield, LogOut, LogIn, Calendar, Bot } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",    gameLabel: "Hero Stats",       icon: <LayoutDashboard className="h-4 w-4" />, authRequired: true  },
  { href: "/exams",     label: "Exams",         gameLabel: "Continents",       icon: <BookOpen className="h-4 w-4" />,       authRequired: false },
  { href: "/planner",   label: "Planner",       gameLabel: "Quest Planner",    icon: <Calendar className="h-4 w-4" />,       authRequired: true  },
  { href: "/assistant", label: "AI Assistant",  gameLabel: "AI Sage",          icon: <Bot className="h-4 w-4" />,            authRequired: true  },
];

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { isGameMode, toggle } = useGameMode();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [xp] = useState(0);

  useEffect(() => setMounted(true), []);

  const game = mounted && isGameMode;
  const lvl = computeLevel(xp);
  const pf: React.CSSProperties = { fontFamily: "var(--font-pixel)", letterSpacing: "0.08em" };

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {game ? (
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 flex items-center justify-center"
                style={{ background: "hsl(43 90% 56%)", imageRendering: "pixelated" }}>
                <span style={{ fontSize: "16px", lineHeight: 1 }}>⚔</span>
              </div>
              <span style={{ ...pf, fontSize: "9px", color: "hsl(43 90% 65%)" }}>
                CERT<span style={{ color: "hsl(43 90% 56%)" }}>MASTER</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-foreground">CertMaster</span>
              <span className="text-[#0078d4]">AI</span>
            </div>
          )}
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {game && (
            <span className="text-muted-foreground mr-2 shrink-0" style={{ ...pf, fontSize: "8px" }}>
              ── REALMS ──
            </span>
          )}
          {NAV_ITEMS.filter(item => !item.authRequired || isAuthenticated).map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                  isActive
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                style={game ? { ...pf, fontSize: "8px" } : { fontSize: "14px" }}
              >
                {item.icon}
                {game ? item.gameLabel : item.label}
              </Link>
            );
          })}
          {isAuthenticated && user?.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              style={game ? { ...pf, fontSize: "8px" } : { fontSize: "14px" }}
            >
              <Shield className="h-4 w-4" />
              {game ? "Admin Fortress" : "Admin"}
            </Link>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Powered by Perficient (serious mode only) */}
          {!game && (
            <div className="hidden lg:flex items-center gap-1.5 mr-1 px-3 py-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-medium">powered by</span>
              <img
                src="/perficient-logo.svg"
                alt="Perficient"
                className="h-3.5 opacity-70 dark:brightness-0 dark:invert dark:opacity-100"
              />
            </div>
          )}

          {/* XP mini-block (game mode) */}
          {game && mounted && (
            <div className="hidden sm:flex flex-col items-end gap-0.5 mr-1">
              <div className="flex items-center gap-1.5">
                <span style={{ color: "hsl(43 90% 56%)", fontSize: "12px" }}>★</span>
                <span style={{ ...pf, fontSize: "8px", color: "hsl(43 90% 65%)" }}>
                  LVL {lvl.level}
                </span>
                <span style={{ ...pf, fontSize: "7px", color: "hsl(220 15% 55%)" }}>
                  {lvl.title}
                </span>
              </div>
              <div className="xp-bar-track" style={{ width: "80px" }}>
                <div
                  className="xp-bar-fill"
                  style={{ width: `${lvl.xpToNext > 0 ? (lvl.xpInLevel / lvl.xpToNext) * 100 : 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Mode toggle */}
          {mounted && (
            <button
              onClick={toggle}
              className="game-toggle-btn"
              style={game
                ? { color: "hsl(43 90% 56%)", borderColor: "hsl(43 60% 35%)", background: "hsl(231 45% 11%)" }
                : { color: "hsl(215 20% 65%)", borderColor: "hsl(217 32% 22%)", background: "transparent" }
              }
              title={game ? "Switch to Serious mode" : "Switch to Pixel mode"}
            >
              {game ? "[ SERIOUS ]" : ">> PIXEL"}
            </button>
          )}

          {/* Theme toggle (serious mode only) */}
          {mounted && !isGameMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {/* User menu */}
          {mounted && (
            isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
                  style={game
                    ? { background: "hsl(43 90% 56%)", color: "hsl(231 40% 9%)" }
                    : { background: "#0078d4", borderRadius: "50%" }
                  }
                  aria-label="User menu"
                >
                  {user?.initials ?? "U"}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-card border border-border shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setShowUserMenu(false); router.push("/"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </Button>
              </Link>
            )
          )}
        </div>
      </div>

      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </nav>
  );
}
