import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Skill { skill_area: string; total_attempted: number; accuracy_percentage: number; }
interface CertProgress {
  certification_id: string; certification_code: string; certification_name: string;
  readiness_score: number; total_attempted: number; total_correct: number;
  skill_breakdown: Skill[];
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.getDashboard().then((r) => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Your detailed performance breakdown</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Overall Accuracy", value: `${data?.accuracy_percentage ?? 0}%` },
          { label: "Questions Answered", value: data?.total_questions_answered ?? 0 },
          { label: "Readiness Score", value: `${data?.readiness_score ?? 0}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-2">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {!data?.certification_progress?.length && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No data yet. Start practicing to see analytics here.
          </CardContent>
        </Card>
      )}
      {data?.certification_progress?.map((cert: CertProgress) => (
        <Card key={cert.certification_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{cert.certification_code} — {cert.certification_name}</CardTitle>
              <Badge variant={cert.readiness_score >= 70 ? "default" : "secondary"}>
                {cert.readiness_score}% Ready
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {cert.total_attempted} attempted · {cert.total_correct} correct
            </p>
          </CardHeader>
          <CardContent>
            <Progress value={cert.readiness_score} className="mb-6" />
            <div className="space-y-3">
              <p className="text-sm font-medium">Skill Breakdown</p>
              {cert.skill_breakdown?.map((skill) => (
                <div key={skill.skill_area}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground truncate max-w-xs">{skill.skill_area}</span>
                    <span className={cn(
                      "flex items-center gap-1 font-medium shrink-0",
                      skill.accuracy_percentage >= 70 ? "text-green-600" : "text-destructive"
                    )}>
                      {skill.accuracy_percentage >= 70
                        ? <TrendingUp className="h-3.5 w-3.5" />
                        : <TrendingDown className="h-3.5 w-3.5" />}
                      {skill.accuracy_percentage}%
                    </span>
                  </div>
                  <Progress value={skill.accuracy_percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
