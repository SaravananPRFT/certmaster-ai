"use client";
import React from "react";
import { Question } from "@/types/exam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ExternalLink, Database, Target, BookOpen, Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  question: Question;
  selectedAnswer: string[];
}

export function ExplanationPanel({ question, selectedAnswer }: Props) {
  const correctAns = question.correctAnswer ?? [];
  const isCorrect = correctAns.every((a) => selectedAnswer.includes(a)) &&
    selectedAnswer.every((a) => correctAns.includes(a));

  return (
    <div className="space-y-4 mt-6">
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
        {isCorrect ? (
          <CheckCircle className="h-6 w-6 text-green-400 shrink-0" />
        ) : (
          <XCircle className="h-6 w-6 text-red-400 shrink-0" />
        )}
        <div>
          <p className={`font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
            {isCorrect ? "Correct!" : "Incorrect"}
          </p>
          {!isCorrect && (
            <p className="text-sm text-muted-foreground">
              Correct answer: <strong className="text-green-400">{correctAns.join(", ")}</strong>
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            Why this answer is correct
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.whyCorrect ?? ""}</ReactMarkdown>
        </CardContent>
      </Card>

      {Object.keys(question.whyIncorrect ?? {}).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              Why other options are incorrect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(question.whyIncorrect ?? {}).map(([optId, reason]) => (
              <div key={optId} className="flex gap-2 text-sm">
                <span className="font-bold text-muted-foreground shrink-0">{optId}:</span>
                <span className="text-muted-foreground">{reason}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            Explanation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.explanation ?? ""}</ReactMarkdown>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400" />
            Grounding Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <GroundingMetric
              label="Grounding Score"
              value={`${Math.round(question.grounding.groundingScore * 100)}%`}
              color={question.grounding.groundingScore > 0.8 ? "text-green-400" : "text-yellow-400"}
            />
            <GroundingMetric
              label="Citation Coverage"
              value={`${Math.round(question.grounding.citationCoverage * 100)}%`}
              color={question.grounding.citationCoverage > 0.7 ? "text-green-400" : "text-yellow-400"}
            />
            <GroundingMetric
              label="Sources Used"
              value={String(question.grounding.retrievedDocumentIds.length)}
              color="text-blue-400"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Retrieved document IDs: {question.grounding.retrievedDocumentIds.slice(0, 3).join(", ")}
            {question.grounding.retrievedDocumentIds.length > 3 && ` +${question.grounding.retrievedDocumentIds.length - 3} more`}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            References & Learning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {question.references.map((ref, i) => (
            <a
              key={i}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {ref.title}
            </a>
          ))}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>Domain: {question.objective}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GroundingMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
