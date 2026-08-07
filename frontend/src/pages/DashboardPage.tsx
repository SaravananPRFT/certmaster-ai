import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle, Target, TrendingUp, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.getDashboard().then((r) => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const stats = [
    { title: "Questions Answered", value: dashboard?.total_questions_answered ?? 0, icon: CheckCircle, color: "text-green-500" },
    { title: "Accuracy", value: `${dashboard?.accuracy_percentage ?? 0}%`, icon: Target, color: "text-blue-500" },
    { title: "Readiness Score", value: `${dashboard?.readiness_score ?? 0}%`, icon: TrendingUp, color: "text-purple-500" },
    { title: "Certifications", value: dashboard?.certification_progress?.length ?? 0, icon: BookOpen, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
        <p className="text-muted-foreground mt-1">Track your certification preparation progress</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.title}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {dashboard?.certification_progress?.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Certification Progress</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {dashboard.certification_progress.map((cert: { certification_id: string; certification_code: string; certification_name: string; readiness_score: number; total_attempted: number }) => (
              <Card key={cert.certification_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{cert.certification_code}</CardTitle>
                    <Badge variant={cert.readiness_score >= 70 ? "default" : "secondary"}>
                      {cert.readiness_score}% Ready
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{cert.certification_name}</p>
                </CardHeader>
                <CardContent>
                  <Progress value={cert.readiness_score} className="mb-2" />
                  <p className="text-xs text-muted-foreground">{cert.total_attempted} questions attempted</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No progress yet</h3>
            <p className="text-muted-foreground mb-4">Start practicing to track your progress</p>
            <Link to="/certifications"><Button>Browse Certifications</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
