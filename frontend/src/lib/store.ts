import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ExamSession, UserAnswer, Question } from "@/types/exam";

interface ExamStore {
  session: ExamSession | null;
  currentIndex: number;
  timeRemaining: number;
  isFullscreen: boolean;
  showExplanation: boolean;
  showHint: boolean;

  setSession: (session: ExamSession) => void;
  setCurrentIndex: (index: number) => void;
  setTimeRemaining: (time: number) => void;
  setAnswer: (questionId: string, answer: UserAnswer) => void;
  toggleMarkForReview: (questionId: string) => void;
  setFullscreen: (v: boolean) => void;
  setShowExplanation: (v: boolean) => void;
  setShowHint: (v: boolean) => void;
  clearSession: () => void;
}

export const useExamStore = create<ExamStore>()(
  persist(
    (set, get) => ({
      session: null,
      currentIndex: 0,
      timeRemaining: 0,
      isFullscreen: false,
      showExplanation: false,
      showHint: false,

      setSession: (session) => set({ session, currentIndex: 0, timeRemaining: session.durationMinutes * 60 }),
      setCurrentIndex: (currentIndex) => set({ currentIndex }),
      setTimeRemaining: (timeRemaining) => set({ timeRemaining }),

      setAnswer: (questionId, answer) =>
        set((state) => ({
          session: state.session
            ? { ...state.session, answers: { ...state.session.answers, [questionId]: answer } }
            : null,
        })),

      toggleMarkForReview: (questionId) =>
        set((state) => {
          if (!state.session) return state;
          const marked = state.session.markedForReview ?? [];
          const next = marked.includes(questionId)
            ? marked.filter((id) => id !== questionId)
            : [...marked, questionId];
          return { session: { ...state.session, markedForReview: next } };
        }),

      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      setShowExplanation: (showExplanation) => set({ showExplanation }),
      setShowHint: (showHint) => set({ showHint }),
      clearSession: () => set({ session: null, currentIndex: 0, timeRemaining: 0 }),
    }),
    { name: "certmaster-exam", partialize: (state) => ({ session: state.session, currentIndex: state.currentIndex }) }
  )
);

interface AppStore {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: "certmaster-app" }
  )
);
