"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!agreed) { setError("You must agree to the Terms of Service."); return; }
    setLoading(true);
    setError("");
    try {
      await registerUser(name, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? "An account with this email already exists." : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm text-muted-foreground">Create your free account</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="text-xs text-muted-foreground">Powered by</span>
            <img src="/perficient-logo.svg" alt="Perficient" className="h-3 opacity-60 dark:brightness-0 dark:invert dark:opacity-80" />
          </div>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Get started</CardTitle>
            <CardDescription>Join thousands preparing for Microsoft certifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="name">Full name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-text"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="reg-email">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-text"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="reg-password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="reg-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-text"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 cursor-pointer" />
                <span>I agree to the <span className="text-primary hover:underline">Terms of Service</span> and <span className="text-primary hover:underline">Privacy Policy</span></span>
              </label>
              <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">Password must be at least 8 characters</p>
              <Button type="submit" variant="azure" className="w-full gap-2 cursor-pointer" disabled={!agreed || loading}>
                {loading ? "Creating account..." : "Create Account"} {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline cursor-pointer">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
