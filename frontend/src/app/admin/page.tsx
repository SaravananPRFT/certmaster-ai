"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import {
  Database, FileText, CheckCircle, XCircle, RefreshCw, Eye, Edit3,
  BarChart3, AlertTriangle, Upload, Shield, Zap, Activity, Users,
  TrendingUp, Search, ThumbsUp, ThumbsDown, Lock, LogIn,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const MOCK_QUESTIONS = [
  { id: "q-001", exam: "AI-102", objective: "Implement NLP Solutions", type: "MultipleChoiceSingle", difficulty: "Medium", status: "pending", qualityScore: 0.87, groundingScore: 0.94, citationCoverage: 0.91, successRate: 0.68 },
  { id: "q-002", exam: "AI-102", objective: "Implement GenAI Solutions", type: "MultipleChoiceMultiple", difficulty: "Hard", status: "approved", qualityScore: 0.92, groundingScore: 0.96, citationCoverage: 0.93, successRate: 0.45 },
  { id: "q-003", exam: "AZ-104", objective: "Manage Azure Identities", type: "MultipleChoiceSingle", difficulty: "Medium", status: "pending", qualityScore: 0.78, groundingScore: 0.89, citationCoverage: 0.85, successRate: 0.72 },
  { id: "q-004", exam: "AI-102", objective: "Computer Vision", type: "YesNo", difficulty: "Easy", status: "approved", qualityScore: 0.95, groundingScore: 0.97, citationCoverage: 0.95, successRate: 0.81 },
  { id: "q-005", exam: "AI-102", objective: "Knowledge Mining", type: "BuildList", difficulty: "Hard", status: "flagged", qualityScore: 0.61, groundingScore: 0.73, citationCoverage: 0.68, successRate: 0.38 },
];

const DIFFICULTY_DATA = [
  { name: "Easy", count: 42, fill: "#22c55e" },
  { name: "Medium", count: 118, fill: "#f59e0b" },
  { name: "Hard", count: 67, fill: "#ef4444" },
];

const EXAM_DATA = [
  { exam: "AI-102", questions: 87, approved: 72, pending: 12, flagged: 3 },
  { exam: "AZ-104", questions: 64, approved: 55, pending: 8, flagged: 1 },
  { exam: "AZ-305", questions: 48, approved: 40, pending: 6, flagged: 2 },
  { exam: "GH-300", questions: 28, approved: 20, pending: 7, flagged: 1 },
];

const INDEX_DOCS = [
  { name: "Azure AI Services Documentation", docs: 1240, status: "indexed", lastSync: "2 hours ago" },
  { name: "Microsoft Learn - AI-102 Path", docs: 384, status: "indexed", lastSync: "1 day ago" },
  { name: "Azure OpenAI Documentation", docs: 512, status: "indexed", lastSync: "3 hours ago" },
  { name: "Azure Architecture Center", docs: 892, status: "indexing", lastSync: "In progress..." },
];

export default function AdminPage() {
  const { isAuthenticated, role } = useAuth();
  const [questions, setQuestions] = useState(MOCK_QUESTIONS);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground">Sign in with an admin account to access this page.</p>
            <Link href="/login"><Button variant="azure" className="gap-2"><LogIn className="h-4 w-4" /> Sign In</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">Insufficient Permissions</h2>
            <p className="text-sm text-muted-foreground">Your account does not have admin privileges.</p>
            <Link href="/dashboard"><Button variant="outline">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleApprove = (id: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, status: "approved" } : q));
  };
  const handleReject = (id: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, status: "rejected" } : q));
  };

  const handleReindex = async () => {
    setReindexing(true);
    setTimeout(() => setReindexing(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#0078d4]" /> Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Question management, knowledge indexing, and platform analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReindex} disabled={reindexing}>
            <RefreshCw className={`h-4 w-4 ${reindexing ? "animate-spin" : ""}`} />
            {reindexing ? "Reindexing..." : "Reindex"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStat icon={<FileText className="h-5 w-5 text-blue-400" />} label="Total Questions" value="227" delta="+23 this week" />
        <AdminStat icon={<CheckCircle className="h-5 w-5 text-green-400" />} label="Approved" value="187" delta="82% approval rate" />
        <AdminStat icon={<AlertTriangle className="h-5 w-5 text-yellow-400" />} label="Pending Review" value="33" delta="Needs attention" />
        <AdminStat icon={<Users className="h-5 w-5 text-purple-400" />} label="Active Users" value="142" delta="+18 this week" />
      </div>

      <Tabs defaultValue="questions">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="index">Knowledge Index</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="generation">Generation</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer">All (227)</Badge>
            <Badge variant="warning" className="cursor-pointer">Pending (33)</Badge>
            <Badge variant="success" className="cursor-pointer">Approved (187)</Badge>
            <Badge variant="destructive" className="cursor-pointer">Flagged (7)</Badge>
          </div>

          <div className="space-y-3">
            {questions.map((q) => (
              <Card key={q.id} className={`border-l-4 ${q.status === "approved" ? "border-l-green-500" : q.status === "flagged" ? "border-l-red-500" : q.status === "rejected" ? "border-l-gray-500" : "border-l-yellow-500"}`}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="info">{q.exam}</Badge>
                        <Badge variant="outline">{q.type}</Badge>
                        <Badge variant={q.difficulty === "Easy" ? "success" : q.difficulty === "Medium" ? "warning" : "destructive"}>{q.difficulty}</Badge>
                        <Badge variant={q.status === "approved" ? "success" : q.status === "flagged" ? "destructive" : q.status === "rejected" ? "secondary" : "warning"}>
                          {q.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{q.objective}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Quality: <span className={q.qualityScore > 0.8 ? "text-green-400" : "text-yellow-400"}>{Math.round(q.qualityScore * 100)}%</span></span>
                        <span>Grounding: <span className={q.groundingScore > 0.85 ? "text-green-400" : "text-yellow-400"}>{Math.round(q.groundingScore * 100)}%</span></span>
                        <span>Citation: <span className="text-blue-400">{Math.round(q.citationCoverage * 100)}%</span></span>
                        <span>Success Rate: <span className={q.successRate > 0.6 ? "text-green-400" : "text-red-400"}>{Math.round(q.successRate * 100)}%</span></span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-blue-400">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-yellow-400">
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-purple-400">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      {q.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-green-400" onClick={() => handleApprove(q.id)}>
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400" onClick={() => handleReject(q.id)}>
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="index" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <AdminStat icon={<Database className="h-5 w-5 text-blue-400" />} label="Total Documents" value="3,028" delta="Across all sources" />
            <AdminStat icon={<Search className="h-5 w-5 text-green-400" />} label="Vector Chunks" value="84,192" delta="text-embedding-3-large" />
            <AdminStat icon={<Activity className="h-5 w-5 text-yellow-400" />} label="Search Quality" value="0.91" delta="Avg semantic score" />
          </div>

          <div className="flex gap-2 mb-4">
            <label className="flex-1">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Upload documents to index</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD supported</p>
                <input type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" onChange={() => setUploading(true)} />
              </div>
            </label>
          </div>

          <div className="space-y-3">
            {INDEX_DOCS.map((doc) => (
              <Card key={doc.name}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.docs.toLocaleString()} documents · Last sync: {doc.lastSync}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={doc.status === "indexed" ? "success" : "warning"}>
                      {doc.status === "indexing" && <RefreshCw className="h-2.5 w-2.5 animate-spin mr-1" />}
                      {doc.status}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-xs">Reindex</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Questions by Exam</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={EXAM_DATA}>
                    <XAxis dataKey="exam" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="approved" fill="#22c55e" radius={[2, 2, 0, 0]} name="Approved" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Pending" />
                    <Bar dataKey="flagged" fill="#ef4444" radius={[2, 2, 0, 0]} name="Flagged" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Difficulty Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={DIFFICULTY_DATA} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {DIFFICULTY_DATA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Most Missed Questions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_QUESTIONS.filter((q) => q.successRate < 0.55).map((q) => (
                  <div key={q.id} className="flex items-center gap-3 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{q.exam}</span>
                      <span className="text-muted-foreground mx-1">·</span>
                      <span className="text-muted-foreground truncate">{q.objective}</span>
                    </div>
                    <span className="text-red-400 font-medium shrink-0">{Math.round(q.successRate * 100)}% success</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generation" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminStat icon={<Zap className="h-5 w-5 text-yellow-400" />} label="Generated Today" value="47" delta="via API requests" />
            <AdminStat icon={<Shield className="h-5 w-5 text-green-400" />} label="Grounding Avg" value="0.93" delta="Above threshold (0.75)" />
            <AdminStat icon={<AlertTriangle className="h-5 w-5 text-red-400" />} label="Blocked (Low Confidence)" value="5" delta="Below 0.75 threshold" />
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Generation Pipeline Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { step: "Azure AI Search Retrieval", status: "healthy", latency: "142ms", docs: "Top-5 chunks retrieved" },
                { step: "Context Compression", status: "healthy", latency: "8ms", docs: "Max 4096 tokens" },
                { step: "GPT-4o Generation", status: "healthy", latency: "2.1s", docs: "Question + Answer + Explanation" },
                { step: "Grounding Validator", status: "healthy", latency: "15ms", docs: "Threshold: 0.75" },
                { step: "Quality Scorer", status: "healthy", latency: "12ms", docs: "Blueprint alignment check" },
                { step: "Duplicate Detector", status: "healthy", latency: "35ms", docs: "Cosine similarity > 0.92 blocked" },
              ].map((s) => (
                <div key={s.step} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${s.status === "healthy" ? "bg-green-400" : "bg-red-400"}`} />
                    <span className="font-medium">{s.step}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    <span>{s.docs}</span>
                    <span className="text-primary">{s.latency}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminStat({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted/50 shrink-0">{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{delta}</div>
        </div>
      </CardContent>
    </Card>
  );
}
