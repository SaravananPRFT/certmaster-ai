import axios from "axios";
import {
  Question,
  QuestionGenerationRequest,
  ExamSession,
  QuestionFeedback,
  StudyProgress,
  ExamBlueprint,
} from "@/types/exam";

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        toCamelCase(v),
      ])
    );
  }
  return obj;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 300000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("certmaster-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => {
    r.data = toCamelCase(r.data);
    return r;
  },
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const examApi = {
  generateQuestions: (req: QuestionGenerationRequest) =>
    api.post<Question[]>("/questions/generate", req).then((r) => r.data),

  getQuestion: (id: string) =>
    api.get<Question>(`/questions/${id}`).then((r) => r.data),

  getBlueprint: (examCode: string) =>
    api.get<ExamBlueprint>(`/exams/${examCode}/blueprint`).then((r) => r.data),

  startSession: (examCode: string, mode: string, count: number, opts?: { difficulty?: string; domain?: string; questionType?: string }) =>
    api.post<ExamSession>("/sessions/", { exam_code: examCode, mode, count, difficulty: opts?.difficulty, domain: opts?.domain, question_type: opts?.questionType }).then((r) => r.data),

  getSession: (sessionId: string) =>
    api.get<ExamSession>(`/sessions/${sessionId}`).then((r) => r.data),

  submitSession: (sessionId: string, answers: Record<string, string[]>) =>
    api.post(`/sessions/${sessionId}/submit`, { answers }).then((r) => r.data),

  saveAnswer: (sessionId: string, questionId: string, selectedOptions: string[]) =>
    api.patch(`/sessions/${sessionId}/answers/${questionId}`, { selectedOptions }).then((r) => r.data),

  submitFeedback: (feedback: QuestionFeedback) =>
    api.post("/questions/feedback", feedback).then((r) => r.data),

  getProgress: (examCode: string) =>
    api.get<StudyProgress>(`/progress/${examCode}`).then((r) => r.data),

  getExams: () =>
    api.get<ExamBlueprint[]>("/exams").then((r) => r.data),

  adminGetQuestions: (params?: { status?: string; exam?: string; page?: number }) =>
    api.get("/admin/questions", { params }).then((r) => r.data),

  adminApproveQuestion: (id: string) =>
    api.patch(`/admin/questions/${id}/approve`).then((r) => r.data),

  adminRejectQuestion: (id: string, reason: string) =>
    api.patch(`/admin/questions/${id}/reject`, { reason }).then((r) => r.data),

  adminRegenerateQuestion: (id: string) =>
    api.post(`/admin/questions/${id}/regenerate`).then((r) => r.data),

  adminGetMetrics: () =>
    api.get("/admin/metrics").then((r) => r.data),

  adminIndexDocuments: (formData: FormData) =>
    api.post("/admin/index", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),

  adminReindex: () =>
    api.post("/admin/reindex").then((r) => r.data),
};

export const plannerApi = {
  generatePlan: (req: {
    exam_code: string;
    exam_date: string;
    daily_hours: number;
    experience_level: string;
    weak_domains: string[];
  }) => api.post("/planner/generate", req).then((r) => r.data),
};

export const assistantApi = {
  chat: (req: {
    message: string;
    exam_code?: string;
    conversation_history: { role: string; content: string }[];
  }) => api.post("/assistant/chat", req).then((r) => r.data),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    api.post("/auth/register", { name, email, password }).then((r) => r.data),

  me: () => api.get("/auth/me").then((r) => r.data),
};

export default api;
