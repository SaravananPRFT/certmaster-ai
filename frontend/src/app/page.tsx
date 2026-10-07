import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EXAM_BLUEPRINTS } from "@/lib/examConfig";
import { HeroCTAs } from "@/components/home/HeroCTAs";
import { Brain, Zap, Shield, BarChart3, BookOpen, Database } from "lucide-react";

const FEATURES = [
  { icon: <Brain className="h-6 w-6 text-[#0078d4]" />, title: "RAG-Powered Questions", desc: "Every question grounded in official Microsoft documentation — never hallucinated." },
  { icon: <Zap className="h-6 w-6 text-purple-400" />, title: "10 Question Types", desc: "Multiple choice, drag-and-drop, case studies, hotspot, build-list, and more." },
  { icon: <Shield className="h-6 w-6 text-green-400" />, title: "Anti-Hallucination", desc: "Grounding score and citation coverage on every question. Low-confidence questions blocked." },
  { icon: <BarChart3 className="h-6 w-6 text-yellow-400" />, title: "Skill Gap Analysis", desc: "Exam readiness score, weak area detection, and personalized Microsoft Learn recommendations." },
  { icon: <Database className="h-6 w-6 text-red-400" />, title: "Blueprint Aligned", desc: "Questions proportional to official exam domain weightings." },
  { icon: <BookOpen className="h-6 w-6 text-cyan-400" />, title: "Study & Practice Modes", desc: "Instant explanations in study mode. Timed certification simulation mode." },
];

export default function HomePage() {
  const exams = Object.values(EXAM_BLUEPRINTS);

  return (
    <div className="min-h-screen">
      <section className="relative py-24 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0078d4]/10 via-background to-purple-900/10 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <Badge variant="info" className="mb-6">Powered by Azure AI + RAG</Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-[#0078d4] to-purple-400 bg-clip-text text-transparent">
            Microsoft Certification<br />Practice, Reinvented
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            AI-generated exam questions grounded in official Microsoft documentation. Real exam experience. Intelligent explanations. Zero hallucination.
          </p>
          <HeroCTAs />
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Supported Certifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {exams.map((exam) => (
              <Link key={exam.examCode} href={`/exams/${exam.examCode}`} className="block h-full">
                <Card className="hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all cursor-pointer group h-full">
                  <CardContent className="pt-6 pb-4 text-center flex flex-col h-full">
                    <div className="w-12 h-12 rounded-xl bg-[#0078d4]/10 border border-[#0078d4]/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#0078d4]/20 transition-colors">
                      <span className="text-xs font-bold text-[#0078d4]">{exam.examCode.split("-")[0]}</span>
                    </div>
                    <div className="font-bold text-sm mb-1">{exam.examCode}</div>
                    <div className="flex-1 text-xs text-muted-foreground leading-tight mb-3">{exam.examName}</div>
                    <div className="flex gap-1 justify-center flex-wrap">
                      <Badge variant="outline" className="text-xs">{exam.totalQuestions}Q</Badge>
                      <Badge variant="outline" className="text-xs">{exam.durationMinutes}m</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">Why CertMasterAI?</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Every question is RAG-grounded, blueprint-aligned, and validated before reaching you.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="hover:border-border/80 transition-colors">
                <CardContent className="pt-6">
                  <div className="mb-4">{f.icon}</div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Choose Exam", desc: "Select certification and domains" },
              { step: "02", title: "RAG Retrieval", desc: "Azure AI Search finds relevant docs" },
              { step: "03", title: "AI Generation", desc: "GPT-4o creates blueprint-aligned questions" },
              { step: "04", title: "Validate & Learn", desc: "Grounding check, then instant explanation" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#0078d4]/10 border border-[#0078d4]/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xs font-bold text-[#0078d4]">{s.step}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
