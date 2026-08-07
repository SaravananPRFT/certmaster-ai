import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { aiApi, certificationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message { role: "user" | "assistant"; content: string; }

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm CertMaster AI, your personal study assistant.\n\nI can **explain concepts**, **generate practice questions**, and help you **build a study strategy**.\n\nSelect a certification below and ask me anything!" },
  ]);
  const [input, setInput] = useState("");
  const [certId, setCertId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: certs } = useQuery({
    queryKey: ["certifications"],
    queryFn: () => certificationsApi.getAll().then((r) => r.data),
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => aiApi.chat({ message: msg, certification_id: certId || undefined }),
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.data.message }]),
    onError: () => setMessages((m) => [...m, { role: "assistant", content: "Couldn't reach the AI service. Make sure Ollama is running:\n```\nollama serve\n```\nThen pull a model: `ollama pull llama3`" }]),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const msg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    chatMutation.mutate(msg);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Study Assistant</h1>
          <p className="text-muted-foreground text-sm">Ask questions, get explanations, generate practice material</p>
        </div>
        <select
          className="text-sm border rounded-md px-3 py-2 bg-background shrink-0"
          value={certId}
          onChange={(e) => setCertId(e.target.value)}
        >
          <option value="">All certifications</option>
          {certs?.map((c: { id: string; code: string; name: string }) => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>
      </div>
      <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-secondary"
              )}>
                {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={cn(
                "rounded-xl px-4 py-3 max-w-[80%] text-sm",
                msg.role === "assistant"
                  ? "bg-muted prose prose-sm dark:prose-invert max-w-none"
                  : "bg-primary text-primary-foreground"
              )}>
                {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>
        <div className="p-4 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about concepts, request a question, or get study advice..."
            disabled={chatMutation.isPending}
            className="flex-1"
          />
          <Button onClick={send} disabled={!input.trim() || chatMutation.isPending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
