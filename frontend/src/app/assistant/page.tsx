"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { EXAM_BLUEPRINTS } from "@/lib/examConfig";
import { Button } from "@/components/ui/button";
import {
  Bot, Send, Plus, LogIn,
  BookOpen, PenLine, Lightbulb, GitCompare, Target, Calendar,
} from "lucide-react";
import { assistantApi } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={i} className="bg-background/60 border border-border px-1 py-0.5 rounded text-[11px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      })}
    </>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const k = () => String(key++);

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <pre key={k()} className="bg-background/70 border border-border rounded-lg p-3 my-2 overflow-x-auto text-[11px] font-mono leading-relaxed">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      result.push(<h3 key={k()} className="text-sm font-semibold mt-3 mb-1">{inline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      result.push(<h2 key={k()} className="text-base font-semibold mt-3 mb-1">{inline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      result.push(<h1 key={k()} className="text-base font-bold mt-3 mb-1">{inline(line.slice(2))}</h1>);
      i++; continue;
    }

    // Bullet list
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      result.push(
        <ul key={k()} className="my-1.5 space-y-0.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="text-[#0078d4] mt-1 flex-shrink-0 leading-none">•</span>
              <span>{inline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      let idx = 1;
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      result.push(
        <ol key={k()} className="my-1.5 space-y-0.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="text-[#0078d4] font-medium flex-shrink-0 w-4">{j + 1}.</span>
              <span>{inline(item)}</span>
            </li>
          ))}
        </ol>
      );
      idx; // suppress unused
      continue;
    }

    // Blank line → skip
    if (line.trim() === "") { i++; continue; }

    // Paragraph
    result.push(<p key={k()} className="leading-relaxed my-0.5">{inline(line)}</p>);
    i++;
  }

  return <>{result}</>;
}

// ── Quick action chips ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: BookOpen,    label: "Explain a concept",    prompt: "Explain a key concept I should know for this exam." },
  { icon: PenLine,     label: "Practice question",    prompt: "Generate a practice question for me with the correct answer and a detailed explanation." },
  { icon: Lightbulb,  label: "Study tips",           prompt: "What are the most effective study strategies for passing this exam?" },
  { icon: GitCompare,  label: "Compare services",     prompt: "What are the key Azure services I need to know and when should I use each one?" },
  { icon: Target,      label: "Weak area focus",      prompt: "What topics do most candidates struggle with on this exam? How should I prepare?" },
  { icon: Calendar,    label: "Exam day strategy",    prompt: "What should I know about the exam day format, timing, and question strategy?" },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [examCode, setExamCode]   = useState("AZ-104");
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  const storageKey = `certmaster-chat-${examCode}`;

  useEffect(() => setMounted(true), []);

  // Load conversation from localStorage when exam changes
  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem(storageKey);
      setMessages(saved ? (JSON.parse(saved) as ChatMessage[]) : []);
    } catch {
      setMessages([]);
    }
  }, [storageKey, mounted]);

  // Persist conversation
  useEffect(() => {
    if (!mounted) return;
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey, mounted]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
        const data = await assistantApi.chat({
          message: text.trim(),
          exam_code: examCode,
          conversation_history: history,
        });
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: data.response, timestamp: Date.now() },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content:
              "Sorry, I couldn't process that request. Please make sure the backend is running and try again.",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [loading, messages, examCode]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!mounted) return <div className="h-[calc(100vh-3.5rem)]" />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#0078d4] flex items-center justify-center mx-auto shadow-lg shadow-[#0078d4]/20">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">AI Study Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to chat with your personal Microsoft certification coach — get explanations, practice questions, and study strategies.
            </p>
          </div>
          <Button variant="azure" className="w-full gap-2" onClick={() => router.push("/login")}>
            <LogIn className="h-4 w-4" /> Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  const userInitial = user?.initials?.[0] ?? "U";

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ── Header ──────────────────────────────────── */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 bg-background/95 backdrop-blur flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#0078d4] flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#0078d4]/30">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold leading-tight">AI Study Assistant</h1>
          <p className="text-xs text-muted-foreground hidden sm:block leading-tight">
            Ask questions · get explanations · generate practice material
          </p>
        </div>
        <select
          value={examCode}
          onChange={(e) => setExamCode(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring max-w-[160px] flex-shrink-0"
        >
          {Object.values(EXAM_BLUEPRINTS).map((e) => (
            <option key={e.examCode} value={e.examCode}>{e.examCode}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 flex-shrink-0 h-8 text-xs"
          onClick={handleNewChat}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </div>

      {/* ── Messages ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Welcome / empty state */
          <div className="h-full flex flex-col items-center justify-center px-4 py-10">
            <div className="w-12 h-12 rounded-full bg-[#0078d4] flex items-center justify-center mb-4 shadow-md shadow-[#0078d4]/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-base font-semibold mb-1">Hello! I&apos;m CertMasterAI</h2>
            <p className="text-sm text-muted-foreground text-center mb-7 max-w-sm">
              Your personal coach for{" "}
              <strong className="text-foreground">{examCode}</strong>. Ask me anything about
              the exam, Azure concepts, or study strategy.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-xl">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={loading}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-border hover:border-[#0078d4]/50 hover:bg-[#0078d4]/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon className="h-4 w-4 text-[#0078d4] mt-0.5 flex-shrink-0 group-hover:scale-105 transition-transform" />
                    <span className="text-xs font-medium leading-tight">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Chat history */
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    msg.role === "user"
                      ? "bg-[#0078d4] shadow-sm shadow-[#0078d4]/30"
                      : "bg-muted border border-border"
                  }`}
                >
                  {msg.role === "user" ? (
                    <span className="text-white text-xs font-bold">{userInitial}</span>
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-[#0078d4] text-white rounded-tr-sm"
                      : "bg-muted border border-border/60 rounded-tl-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="prose-sm">{renderMarkdown(msg.content)}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="bg-muted border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ───────────────────────────────── */}
      <div className="border-t border-border bg-background/95 backdrop-blur px-4 pt-3 pb-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${examCode} concepts, request a practice question…`}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 min-h-[42px] max-h-[120px] overflow-auto leading-relaxed"
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <Button
            variant="azure"
            size="icon"
            className="h-[42px] w-[42px] rounded-xl flex-shrink-0"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
