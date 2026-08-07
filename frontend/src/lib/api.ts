import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({ baseURL: "" });

api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("token");
      Cookies.remove("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (d: { email: string; password: string; display_name: string }) =>
    api.post("/api/auth/register", d),
  login: (d: { email: string; password: string }) =>
    api.post("/api/auth/login", d),
};

export const certificationsApi = {
  getAll: () => api.get("/api/certifications/"),
  getById: (id: string) => api.get(`/api/certifications/${id}`),
};

export const questionsApi = {
  getQuestions: (p: {
    certification_id: string;
    difficulty?: string;
    skill_area?: string;
    page?: number;
    page_size?: number;
  }) => api.get("/api/questions/", { params: p }),
  bookmark: (question_id: string, notes?: string) =>
    api.post("/api/questions/bookmarks", { question_id, notes }),
  removeBookmark: (question_id: string) =>
    api.delete(`/api/questions/bookmarks/${question_id}`),
  getBookmarks: () => api.get("/api/questions/bookmarks/list"),
};

export const practiceApi = {
  startSession: (d: {
    certification_id: string;
    difficulty?: string;
    skill_area?: string;
  }) => api.post("/api/practice/sessions", d),
  getSessions: () => api.get("/api/practice/sessions"),
  startMockExam: (d: {
    certification_id: string;
    duration_minutes?: number;
    question_count?: number;
  }) => api.post("/api/practice/mock-exams", d),
  submitMockExam: (d: {
    mock_exam_id: string;
    answers: {
      question_id: string;
      selected_option_id?: string;
      time_taken_seconds: number;
    }[];
  }) => api.post("/api/practice/mock-exams/submit", d),
};

export const analyticsApi = {
  getDashboard: () => api.get("/api/analytics/dashboard"),
};

export const aiApi = {
  generateQuestions: (d: {
    certification_id: string;
    skill_area: string;
    difficulty: string;
    count?: number;
  }) => api.post("/api/ai/generate-questions", d),
  chat: (d: { message: string; certification_id?: string }) =>
    api.post("/api/ai/chat", d),
  generateStudyPlan: (d: {
    certification_id: string;
    exam_date: string;
    daily_study_hours: number;
  }) => api.post("/api/ai/study-plan", d),
  getChatHistory: () => api.get("/api/ai/chat/history"),
};
