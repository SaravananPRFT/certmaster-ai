import { useQuery } from "@tanstack/react-query";
import { certificationsApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, PlayCircle, FileText, Loader2 } from "lucide-react";

interface Cert {
  id: string;
  code: string;
  name: string;
  description: string;
  level: string;
  question_count: number;
  skill_count: number;
}

const levelColors: Record<string, string> = {
  Fundamentals: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Associate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Expert: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function CertificationsPage() {
  const { data: certs, isLoading } = useQuery({
    queryKey: ["certifications"],
    queryFn: () => certificationsApi.getAll().then((r) => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Certifications</h1>
        <p className="text-muted-foreground mt-1">Choose a certification to start preparing</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certs?.map((cert: Cert) => (
          <Card key={cert.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{cert.code}</CardTitle>
                  <CardDescription className="mt-1">{cert.name}</CardDescription>
                </div>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${levelColors[cert.level] || "bg-gray-100 text-gray-700"}`}>
                  {cert.level}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{cert.description}</p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{cert.skill_count} skills</span>
                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{cert.question_count} questions</span>
              </div>
              <div className="flex gap-2">
                <Link to={`/practice?certId=${cert.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <PlayCircle className="h-3.5 w-3.5 mr-1" />Practice
                  </Button>
                </Link>
                <Link to={`/mock-exam?certId=${cert.id}`} className="flex-1">
                  <Button size="sm" className="w-full">
                    <FileText className="h-3.5 w-3.5 mr-1" />Mock Exam
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
