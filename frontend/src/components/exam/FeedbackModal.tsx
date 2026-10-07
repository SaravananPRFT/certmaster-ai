"use client";
import React, { useState } from "react";
import { Question, QuestionFeedback } from "@/types/exam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { examApi } from "@/lib/api";
import { Flag, X, Send, CheckCircle } from "lucide-react";

interface Props {
  question: Question;
  onClose: () => void;
}

const ISSUE_TYPES: Array<{ value: QuestionFeedback["issueType"]; label: string }> = [
  { value: "inaccurate", label: "Question is inaccurate" },
  { value: "unclear", label: "Explanation is unclear" },
  { value: "outdated", label: "Reference is outdated" },
  { value: "typo", label: "Typo / formatting error" },
  { value: "other", label: "Other issue" },
];

export function FeedbackModal({ question, onClose }: Props) {
  const [issueType, setIssueType] = useState<QuestionFeedback["issueType"]>("inaccurate");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await examApi.submitFeedback({ questionId: question.questionId, issueType, comment });
      setSubmitted(true);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flag className="h-4 w-4 text-yellow-400" />
            Report Question Issue
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="font-semibold">Thank you for your feedback!</p>
              <p className="text-sm text-muted-foreground mt-1">Our team will review this question.</p>
              <Button variant="outline" className="mt-4" onClick={onClose}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 truncate">
                Question: {question.question.substring(0, 80)}...
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Issue Type</label>
                <div className="space-y-1.5">
                  {ISSUE_TYPES.map((t) => (
                    <label key={t.value} className="flex items-center gap-2 p-2 rounded border border-border hover:bg-accent cursor-pointer">
                      <input
                        type="radio"
                        name="issueType"
                        value={t.value}
                        checked={issueType === t.value}
                        onChange={() => setIssueType(t.value)}
                        className="text-primary"
                      />
                      <span className="text-sm">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Additional Comments (optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
                <Button variant="azure" size="sm" onClick={handleSubmit} disabled={loading} className="flex-1">
                  <Send className="h-3 w-3" />
                  {loading ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
