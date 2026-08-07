import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { aiApi, certificationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Clock } from "lucide-react";

interface Day { day_number: number; date: string; focus: string; tasks: string[]; estimated_minutes: number; }
interface Week { week_number: number; days: Day[]; }

export default function StudyPlannerPage() {
  const [certId, setCertId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState(2);
  const [plan, setPlan] = useState<{ plan_id: string; weeks: Week[]; note?: string } | null>(null);

  const { data: certs } = useQuery({
    queryKey: ["certifications"],
    queryFn: () => certificationsApi.getAll().then((r) => r.data),
  });

  const genMutation = useMutation({
    mutationFn: () => aiApi.generateStudyPlan({ certification_id: certId, exam_date: examDate, daily_study_hours: hours }),
    onSuccess: (res) => setPlan(res.data),
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Study Planner</h1>
        <p className="text-muted-foreground mt-1">Generate a personalized AI-powered study plan</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Configure Your Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Certification</label>
            <select
              className="w-full text-sm border rounded-md px-3 py-2 bg-background"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
            >
              <option value="">Select a certification...</option>
              {certs?.map((c: { id: string; code: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Exam Date</label>
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={minDate.toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Daily Study Hours</label>
              <Input
                type="number"
                min={1}
                max={8}
                value={hours}
                onChange={(e) => setHours(Math.max(1, Math.min(8, Number(e.target.value))))}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => genMutation.mutate()}
            disabled={!certId || !examDate || genMutation.isPending}
          >
            {genMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating with AI...</>
              : "Generate Study Plan"}
          </Button>
          {genMutation.isError && (
            <p className="text-sm text-destructive text-center">
              Failed to generate plan. Please try again.
            </p>
          )}
        </CardContent>
      </Card>

      {plan && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Your Personalized Study Plan</h2>
          {plan.note && (
            <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3">
              {plan.note}
            </div>
          )}
          {plan.weeks?.map((week) => (
            <Card key={week.week_number}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Week {week.week_number}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {week.days?.map((day) => (
                    <div key={day.day_number} className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="shrink-0 w-16 text-center">
                        <div className="text-xs text-muted-foreground">Day {day.day_number}</div>
                        <div className="text-xs font-medium mt-0.5">{day.date}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm font-medium">{day.focus}</span>
                          <Badge variant="outline" className="text-xs ml-auto shrink-0">
                            <Clock className="h-3 w-3 mr-1" />{day.estimated_minutes}min
                          </Badge>
                        </div>
                        <ul className="space-y-0.5">
                          {day.tasks?.map((t, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                              <span className="text-primary shrink-0">•</span>{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
