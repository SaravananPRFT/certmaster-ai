"use client";
import React, { useState } from "react";
import { CaseStudy, Question, UserAnswer } from "@/types/exam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionRenderer } from "./QuestionRenderer";
import { ExplanationPanel } from "./ExplanationPanel";
import { Building2, Server, Target, AlertTriangle, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  caseStudy: CaseStudy;
  answers: Record<string, UserAnswer>;
  onAnswer: (questionId: string, answer: UserAnswer) => void;
  showResult?: boolean;
}

export function CaseStudyViewer({ caseStudy, answers, onAnswer, showResult = false }: Props) {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const question = caseStudy.questions[activeQuestion];

  return (
    <div className="flex h-full gap-0">
      <div className="w-1/2 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info">Case Study</Badge>
            <span className="font-semibold text-sm">{caseStudy.title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{caseStudy.questions.length} questions in this case study</p>
        </div>
        <Tabs defaultValue="background" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3 grid grid-cols-4">
            <TabsTrigger value="background" className="text-xs">Background</TabsTrigger>
            <TabsTrigger value="environment" className="text-xs">Environment</TabsTrigger>
            <TabsTrigger value="requirements" className="text-xs">Requirements</TabsTrigger>
            <TabsTrigger value="constraints" className="text-xs">Constraints</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 p-4">
            <TabsContent value="background">
              <CaseSection icon={<Building2 className="h-4 w-4 text-blue-400" />} title="Company Background" content={caseStudy.companyBackground} />
            </TabsContent>
            <TabsContent value="environment">
              <CaseSection icon={<Server className="h-4 w-4 text-green-400" />} title="Existing Environment" content={caseStudy.existingEnvironment} />
            </TabsContent>
            <TabsContent value="requirements">
              <div className="space-y-4">
                <CaseSection icon={<Target className="h-4 w-4 text-yellow-400" />} title="Business Requirements" content={caseStudy.businessRequirements} />
                <CaseSection icon={<FileText className="h-4 w-4 text-purple-400" />} title="Technical Requirements" content={caseStudy.technicalRequirements} />
              </div>
            </TabsContent>
            <TabsContent value="constraints">
              <CaseSection icon={<AlertTriangle className="h-4 w-4 text-red-400" />} title="Constraints" content={caseStudy.constraints} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <div className="w-1/2 flex flex-col">
        <div className="p-3 border-b border-border bg-card flex gap-1 overflow-x-auto">
          {caseStudy.questions.map((q, i) => {
            const ans = answers[q.questionId];
            const answered = ans?.selectedOptions?.length > 0;
            return (
              <button
                key={q.questionId}
                onClick={() => setActiveQuestion(i)}
                className={`flex-shrink-0 w-8 h-8 rounded border text-xs font-medium transition-all ${
                  activeQuestion === i
                    ? "bg-primary text-primary-foreground border-primary"
                    : answered
                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <ScrollArea className="flex-1 p-6">
          {question && (
            <>
              <div className="text-xs text-muted-foreground mb-4">
                Question {activeQuestion + 1} of {caseStudy.questions.length}
              </div>
              <QuestionRenderer
                question={question}
                answer={answers[question.questionId]}
                onAnswer={(ans) => onAnswer(question.questionId, ans)}
                showResult={showResult}
              />
              {showResult && answers[question.questionId] && (
                <ExplanationPanel question={question} selectedAnswer={answers[question.questionId].selectedOptions} />
              )}
            </>
          )}
        </ScrollArea>
        <div className="p-3 border-t border-border flex justify-between">
          <button
            onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))}
            disabled={activeQuestion === 0}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 px-3 py-1 rounded border border-border disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={() => setActiveQuestion(Math.min(caseStudy.questions.length - 1, activeQuestion + 1))}
            disabled={activeQuestion === caseStudy.questions.length - 1}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 px-3 py-1 rounded border border-border disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseSection({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  return (
    <Card className="border-border">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
