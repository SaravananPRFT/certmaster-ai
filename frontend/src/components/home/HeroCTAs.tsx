"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ArrowRight, LayoutDashboard, Lock } from "lucide-react";

const MEMBER_FEATURES = ["Progress Tracking", "Study Planner", "AI Study Assistant", "Full Exam History"];

export function HeroCTAs() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-4 justify-center flex-wrap">
        <Link href="/exams">
          <Button variant="azure" size="lg" className="gap-2">
            Start Practicing <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        {isAuthenticated ? (
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> View Dashboard
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign In to Track Progress
            </Button>
          </Link>
        )}
      </div>
      {!isAuthenticated && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 justify-center mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" /> Sign in to unlock:
          </span>
          {MEMBER_FEATURES.map((f) => (
            <span
              key={f}
              className="text-xs border border-border/60 rounded-full px-2.5 py-0.5 text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
