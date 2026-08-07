import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Zap, Target, BookOpen, BarChart2, MessageSquare, Shield } from "lucide-react";

const features = [
  { icon: Brain, title: "AI-Powered Questions", description: "Generate unlimited practice questions using Ollama running entirely on your machine." },
  { icon: Target, title: "Mock Exam Mode", description: "Timed exams simulating real certification conditions with auto-grading." },
  { icon: MessageSquare, title: "AI Study Assistant", description: "Chat with an AI tutor that knows your certification inside out." },
  { icon: BarChart2, title: "Progress Analytics", description: "Track your readiness score and identify weak skill areas." },
  { icon: BookOpen, title: "Study Planner", description: "AI-generated personalized study plans based on your exam date." },
  { icon: Zap, title: "Instant Feedback", description: "Detailed explanations for every question to accelerate learning." },
];

const certs = [
  { code: "AZ-900", name: "Azure Fundamentals", level: "Fundamentals", cls: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300" },
  { code: "AZ-104", name: "Azure Administrator", level: "Associate", cls: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300" },
  { code: "AI-102", name: "Azure AI Engineer", level: "Associate", cls: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <Brain className="h-6 w-6" />CertMaster AI
          </div>
          <div className="flex gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Get Started Free</Button></Link>
          </div>
        </div>
      </nav>

      <section className="py-24 md:py-36 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Shield className="h-3.5 w-3.5 text-primary" />
            100% local — zero cloud costs
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Ace Your Microsoft
            <span className="text-primary block mt-2">Certification Exam</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            AI-powered practice questions, mock exams, and a personal study assistant — all running locally with Ollama.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"><Button size="lg" className="px-8">Start Practicing Free</Button></Link>
            <Link to="/login"><Button variant="outline" size="lg" className="px-8">Sign In</Button></Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Everything you need to pass</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Complete certification prep powered by open-source AI models.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card border rounded-xl p-6 hover:shadow-md transition-shadow">
                <f.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-10">Supported Certifications</h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {certs.map((c) => (
              <div key={c.code} className={`border rounded-xl p-6 w-56 ${c.cls}`}>
                <div className="text-2xl font-bold mb-1">{c.code}</div>
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs opacity-70 mt-2 uppercase tracking-wide">{c.level}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
          <p className="text-primary-foreground/80 mb-8">Create a free account and begin practicing in minutes.</p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="px-8">Create Free Account</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>CertMaster AI — Practice material only. Not affiliated with Microsoft.</p>
        <p className="mt-1">All questions are AI-generated for practice purposes only.</p>
      </footer>
    </div>
  );
}
