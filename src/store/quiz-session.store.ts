import { create } from "zustand";
import type { ActiveQuizState, AttemptStatus } from "@/types/quiz";

interface QuizSessionStore extends ActiveQuizState {
  // Actions
  initSession: (attemptId: string, quizId: string) => void;
  setAnswer: (
    questionId: string,
    answer: { selectedOptionId?: string; textAnswer?: string }
  ) => void;
  incrementTimeTaken: (questionId: string, deltaSecs: number) => void;
  tickTimer: () => void;
  setTimerElapsed: (secs: number) => void;
  setFullscreen: (value: boolean) => void;
  setCameraActive: (value: boolean) => void;
  incrementViolation: () => void;
  setStatus: (status: AttemptStatus) => void;
  goToQuestion: (index: number) => void;
  resetSession: () => void;
}

const initialState: ActiveQuizState = {
  attemptId: "",
  quizId: "",
  currentQuestionIndex: 0,
  answers: {},
  timerElapsedSecs: 0,
  isFullscreen: false,
  isCameraActive: false,
  violationCount: 0,
  status: "IN_PROGRESS",
};

export const useQuizSessionStore = create<QuizSessionStore>((set) => ({
  ...initialState,

  initSession: (attemptId, quizId) =>
    set({ ...initialState, attemptId, quizId }),

  setAnswer: (questionId, answer) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: {
          ...state.answers[questionId],
          ...answer,
          timeTakenSecs: state.answers[questionId]?.timeTakenSecs ?? 0,
        },
      },
    })),

  incrementTimeTaken: (questionId, deltaSecs) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: {
          ...state.answers[questionId],
          timeTakenSecs: (state.answers[questionId]?.timeTakenSecs ?? 0) + deltaSecs,
        },
      },
    })),

  tickTimer: () => set((state) => ({ timerElapsedSecs: state.timerElapsedSecs + 1 })),

  setTimerElapsed: (secs) => set({ timerElapsedSecs: secs }),

  setFullscreen: (value) => set({ isFullscreen: value }),

  setCameraActive: (value) => set({ isCameraActive: value }),

  incrementViolation: () =>
    set((state) => ({ violationCount: state.violationCount + 1 })),

  setStatus: (status) => set({ status }),

  goToQuestion: (index) => set({ currentQuestionIndex: index }),

  resetSession: () => set(initialState),
}));
