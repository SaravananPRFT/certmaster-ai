"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, BookOpen, Mail, Lock, UserCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "guest">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials. Try any email/password for demo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    router.push("/exams");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0078d4] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">CertMaster<span className="text-[#0078d4]">AI</span></span>
          </div>
          <p className="text-sm text-muted-foreground">Microsoft Certification Practice Platform</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="text-xs text-muted-foreground">Powered by</span>
            <img src="/perficient-logo.svg" alt="Perficient" className="h-3 dark:brightness-0 dark:invert opacity-60" />
          </div>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Sign in to continue your certification journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button onClick={() => setMode("login")} className={`py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${mode === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Sign In
              </button>
              <button onClick={() => setMode("guest")} className={`py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${mode === "guest" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Guest Access
              </button>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="email">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="password">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-text"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">Demo: enter any email + password to sign in</p>
                <Button type="submit" variant="azure" className="w-full gap-2 cursor-pointer" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"} {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">or continue with</span></div>
                </div>
                <Button type="button" variant="outline" className="w-full gap-2 cursor-pointer" onClick={() => login("demo@perficient.com", "demo").then(() => router.push("/dashboard"))}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#f25022" d="M11.5 2h-9.5v9.5h9.5z"/><path fill="#7fba00" d="M13 2h9.5v9.5h-9.5z"/><path fill="#00a4ef" d="M11.5 13h-9.5v9.5h9.5z"/><path fill="#ffb900" d="M13 13h9.5v9.5h-9.5z"/></svg>
                  Continue with Microsoft
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-muted/30 text-sm space-y-2">
                  <p className="font-medium">Guest access includes:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Browse all exam catalogs</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 5 free practice questions per exam</li>
                    <li className="flex items-center gap-2"><span className="text-yellow-400">⚠</span> No progress persistence</li>
                    <li className="flex items-center gap-2"><span className="text-red-400">✗</span> No exam history or analytics</li>
                    <li className="flex items-center gap-2"><span className="text-red-400">✗</span> No Study Planner</li>
                    <li className="flex items-center gap-2"><span className="text-red-400">✗</span> No AI Study Assistant</li>
                  </ul>
                </div>
                <Button variant="outline" className="w-full gap-2 cursor-pointer" onClick={handleGuest}>
                  <UserCircle className="h-4 w-4" /> Continue as Guest
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline cursor-pointer">Create one free</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
