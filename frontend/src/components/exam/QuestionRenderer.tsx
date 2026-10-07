"use client";
import React, { useState } from "react";
import { Question, UserAnswer } from "@/types/exam";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckCircle, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  question: Question;
  answer: UserAnswer | undefined;
  onAnswer: (answer: UserAnswer) => void;
  showResult?: boolean;
  mode?: "exam" | "study" | "practice";
}

export function QuestionRenderer({ question, answer, onAnswer, showResult = false, mode = "exam" }: Props) {
  const selected = answer?.selectedOptions ?? [];

  const handleSelect = (optionId: string) => {
    if (question.type === "MultipleChoiceSingle" || question.type === "BestAnswer" || question.type === "YesNo") {
      onAnswer({ questionId: question.questionId, selectedOptions: [optionId], timeSpent: 0, flagged: false });
    } else if (question.type === "MultipleChoiceMultiple") {
      const newSelected = selected.includes(optionId)
        ? selected.filter((s) => s !== optionId)
        : [...selected, optionId];
      onAnswer({ questionId: question.questionId, selectedOptions: newSelected, timeSpent: 0, flagged: false });
    }
  };

  const isCorrect = (optionId: string) => question.correctAnswer.includes(optionId);
  const isSelected = (optionId: string) => selected.includes(optionId);

  const getOptionStyle = (optionId: string) => {
    if (!showResult) {
      return isSelected(optionId)
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border hover:border-primary/50 hover:bg-accent";
    }
    if (isCorrect(optionId)) return "border-green-500 bg-green-500/10 text-green-400";
    if (isSelected(optionId) && !isCorrect(optionId)) return "border-red-500 bg-red-500/10 text-red-400";
    return "border-border opacity-50";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="info">{question.type.replace(/([A-Z])/g, " $1").trim()}</Badge>
        <Badge variant={question.difficulty === "Easy" ? "success" : question.difficulty === "Medium" ? "warning" : "destructive"}>
          {question.difficulty}
        </Badge>
        <Badge variant="outline">{question.exam}</Badge>
        <span className="text-xs text-muted-foreground ml-auto">{question.objective}</span>
      </div>

      {question.context && (
        <Card className="bg-muted/30 border-border">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground italic">{question.context}</p>
          </CardContent>
        </Card>
      )}

      {question.codeSnippet && (
        <pre className="bg-zinc-950 border border-border rounded-lg p-4 text-sm overflow-x-auto font-mono text-green-400">
          <code>{question.codeSnippet}</code>
        </pre>
      )}

      <div className="text-base leading-relaxed text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.question}</ReactMarkdown>
      </div>

      {(question.type === "MultipleChoiceSingle" || question.type === "BestAnswer") && (
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                getOptionStyle(opt.id)
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5",
                isSelected(opt.id) && !showResult ? "border-primary bg-primary" : "border-current",
                showResult && isCorrect(opt.id) ? "border-green-500" : "",
                showResult && isSelected(opt.id) && !isCorrect(opt.id) ? "border-red-500" : ""
              )}>
                {showResult && isCorrect(opt.id) && <CheckCircle className="h-4 w-4 text-green-500" />}
                {showResult && isSelected(opt.id) && !isCorrect(opt.id) && <XCircle className="h-4 w-4 text-red-500" />}
                {!showResult && isSelected(opt.id) && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <span className="font-medium mr-2 text-muted-foreground">{opt.id}.</span>
                <span className="inline"><ReactMarkdown remarkPlugins={[remarkGfm]}>{opt.text}</ReactMarkdown></span>
              </div>
            </button>
          ))}
        </div>
      )}

      {question.type === "MultipleChoiceMultiple" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Select all that apply</p>
          {question.options?.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                getOptionStyle(opt.id)
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5",
                isSelected(opt.id) && !showResult ? "border-primary bg-primary" : "border-current"
              )}>
                {(isSelected(opt.id) || (showResult && isCorrect(opt.id))) && (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </div>
              <div>
                <span className="font-medium mr-2 text-muted-foreground">{opt.id}.</span>
                {opt.text}
              </div>
            </button>
          ))}
        </div>
      )}

      {question.type === "YesNo" && (
        <div className="flex gap-4">
          {["Yes", "No"].map((v) => (
            <button
              key={v}
              onClick={() => handleSelect(v)}
              className={cn(
                "flex-1 py-4 rounded-lg border text-lg font-semibold transition-all",
                isSelected(v) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
                showResult && isCorrect(v) ? "border-green-500 bg-green-500/10 text-green-400" : "",
                showResult && isSelected(v) && !isCorrect(v) ? "border-red-500 bg-red-500/10 text-red-400" : ""
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {question.type === "BuildList" && question.buildItems && (
        <BuildListQuestion
          items={question.buildItems}
          selected={selected}
          onAnswer={(items) => onAnswer({ questionId: question.questionId, selectedOptions: items, timeSpent: 0, flagged: false })}
          showResult={showResult}
          correct={question.correctAnswer}
        />
      )}

      {question.type === "MatchFollowing" && question.matchPairs && (
        <MatchFollowingQuestion
          pairs={question.matchPairs}
          selected={selected}
          onAnswer={(pairs) => onAnswer({ questionId: question.questionId, selectedOptions: pairs, timeSpent: 0, flagged: false })}
          showResult={showResult}
          correct={question.correctAnswer}
        />
      )}

      {question.type === "DragAndDrop" && question.dragItems && question.dropZones && (
        <DragDropQuestion
          items={question.dragItems}
          zones={question.dropZones}
          selected={selected}
          onAnswer={(ans) => onAnswer({ questionId: question.questionId, selectedOptions: ans, timeSpent: 0, flagged: false })}
          showResult={showResult}
          correct={question.correctAnswer}
        />
      )}
    </div>
  );
}

function SortableItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary/50"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function BuildListQuestion({ items, selected, onAnswer, showResult, correct }: {
  items: string[]; selected: string[]; onAnswer: (items: string[]) => void; showResult: boolean; correct: string[];
}) {
  const [ordered, setOrdered] = useState<string[]>(selected.length ? selected : [...items]);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = ordered.indexOf(String(active.id));
      const newIndex = ordered.indexOf(String(over.id));
      const newOrder = arrayMove(ordered, oldIndex, newIndex);
      setOrdered(newOrder);
      onAnswer(newOrder);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Drag items to arrange in correct order</p>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered} strategy={verticalListSortingStrategy}>
          {ordered.map((item) => (
            <SortableItem key={item} id={item} label={item} />
          ))}
        </SortableContext>
      </DndContext>
      {showResult && (
        <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">Correct Order:</p>
          {correct.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-green-400">
              <span className="text-muted-foreground">{i + 1}.</span> {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchFollowingQuestion({ pairs, selected, onAnswer, showResult, correct }: {
  pairs: Array<{ left: string; right: string }>; selected: string[]; onAnswer: (pairs: string[]) => void; showResult: boolean; correct: string[];
}) {
  const [matches, setMatches] = useState<Record<string, string>>(
    Object.fromEntries(selected.map((s) => s.split("=")).filter((p) => p.length === 2))
  );
  const rights = pairs.map((p) => p.right);

  const handleMatch = (left: string, right: string) => {
    const newMatches = { ...matches, [left]: right };
    setMatches(newMatches);
    onAnswer(Object.entries(newMatches).map(([k, v]) => `${k}=${v}`));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
          {pairs.map((pair) => (
            <div key={pair.left} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card text-sm">
              {pair.left}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Match With</p>
          {pairs.map((pair) => (
            <select
              key={pair.left}
              value={matches[pair.left] || ""}
              onChange={(e) => handleMatch(pair.left, e.target.value)}
              className="w-full p-3 rounded-lg border border-border bg-card text-sm focus:border-primary outline-none"
            >
              <option value="">-- Select --</option>
              {rights.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ))}
        </div>
      </div>
    </div>
  );
}

function DragDropQuestion({ items, zones, selected, onAnswer, showResult, correct }: {
  items: string[]; zones: string[]; selected: string[]; onAnswer: (ans: string[]) => void; showResult: boolean; correct: string[];
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    Object.fromEntries(selected.map((s) => s.split("->")).filter((p) => p.length === 2))
  );

  const handleAssign = (item: string, zone: string) => {
    const newAssignments = { ...assignments, [item]: zone };
    setAssignments(newAssignments);
    onAnswer(Object.entries(newAssignments).map(([k, v]) => `${k}->${v}`));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Assign each item to the correct category</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: items with their zone selectors stacked vertically */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items to assign</p>
          {items.map((item) => (
            <div key={item} className="p-3 bg-card border border-border rounded-lg text-sm space-y-2">
              <span className="block leading-relaxed">{item}</span>
              <select
                value={assignments[item] || ""}
                onChange={(e) => handleAssign(item, e.target.value)}
                className="w-full text-xs bg-muted border border-border rounded-md px-2 py-1.5 outline-none focus:border-primary cursor-pointer"
              >
                <option value="">→ Assign to zone…</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          ))}
        </div>
        {/* Right: drop zones showing which items have been assigned */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drop zones</p>
          {zones.map((zone) => {
            const assignedItems = Object.entries(assignments)
              .filter(([, z]) => z === zone)
              .map(([item]) => item);
            return (
              <div key={zone} className="p-3 border-2 border-dashed border-border rounded-lg min-h-[60px]">
                <p className="text-xs text-muted-foreground mb-2 leading-tight">{zone}</p>
                <div className="flex flex-wrap gap-1">
                  {assignedItems.length > 0 ? (
                    assignedItems.map((assignedItem) => (
                      <span
                        key={assignedItem}
                        className="text-xs bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 leading-tight"
                      >
                        {assignedItem}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">No items assigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
