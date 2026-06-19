"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQuizSessionStore } from "@/store/quiz-session.store";
import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  Loader2,
  Maximize,
  Shield,
  X,
  ZapOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuizOption   = { id: string; text: string };
type QuizQuestion = {
  id:       string;
  text:     string;
  type:     "MCQ" | "QA";
  imageUrl: string | null;
  marks:    number;
  order:    number;
  options:  QuizOption[];
};
type QuizInfo = {
  id:            string;
  title:         string;
  description:   string | null;
  type:          "MCQ" | "QA" | "MIXED";
  totalMarks:    number;
  timeLimitMins: number;
  showResults:   boolean;
  maxAttempts:   number;
};
type ExistingAttempt = {
  id:               string;
  timerElapsedSecs: number;
  answers:          Record<string, { selectedOptionId?: string; textAnswer?: string; timeTakenSecs: number }>;
};

type Phase = "camera-check" | "countdown" | "quiz" | "paused" | "submitting";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const m = Math.max(0, Math.floor(secs / 60));
  const s = Math.max(0, secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizSessionClient({
  quiz,
  questions,
  classroomId,
  existingAttempt,
}: {
  quiz:             QuizInfo;
  questions:        QuizQuestion[];
  classroomId:      string;
  existingAttempt:  ExistingAttempt | null;
}) {
  const router = useRouter();

  // ── Zustand store ───────────────────────────────────────────────────────────
  const {
    currentQuestionIndex,
    answers,
    timerElapsedSecs,
    initSession,
    setAnswer,
    incrementTimeTaken,
    tickTimer,
    setTimerElapsed,
    setCameraActive,
    setFullscreen,
    incrementViolation,
    setStatus,
    goToQuestion,
    resetSession,
  } = useQuizSessionStore();

  // ── Local state ─────────────────────────────────────────────────────────────
  const [phase, setPhase]                 = useState<Phase>("camera-check");
  const [countdown, setCountdown]         = useState(3);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraError, setCameraError]     = useState("");
  const [startError, setStartError]       = useState("");
  const [showConfirm, setShowConfirm]     = useState(false);
  const [submitError, setSubmitError]     = useState("");
  const [gazeWarning, setGazeWarning]     = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const videoRef            = useRef<HTMLVideoElement>(null);
  const streamRef           = useRef<MediaStream | null>(null);
  const attemptIdRef        = useRef(existingAttempt?.id ?? "");
  const elapsedRef          = useRef(existingAttempt?.timerElapsedSecs ?? 0);

  // ── Phase 4: localStorage key helper ────────────────────────────────────────
  const lsKey = () => attemptIdRef.current ? `quiznex_answers_${attemptIdRef.current}` : null;
  const pausedRef           = useRef(false);
  const isSubmittingRef     = useRef(false);
  const gazeTimestamps      = useRef<number[]>([]);
  const qaDebounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionStartRef    = useRef(Date.now());
  const gazeWarnTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceModelRef        = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const timeLimitSecs      = quiz.timeLimitMins * 60;
  const timeRemainingStore = timeLimitSecs - timerElapsedSecs;
  const isTimeLow          = timeRemainingStore < 300; // < 5 min
  const currentQ           = questions[currentQuestionIndex];
  const currentAnswer      = currentQ ? answers[currentQ.id] : undefined;
  const unansweredCount    = questions.filter((q) => !answers[q.id]?.selectedOptionId && !answers[q.id]?.textAnswer).length;

  // ── Phase 4: save answers to localStorage on every change ───────────────────
  useEffect(() => {
    const key = lsKey();
    if (!key || phase !== "quiz") return;
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch { /* storage full — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, phase]);

  // ── Phase 4: on mount, merge cached answers (server wins on conflict) ────────
  useEffect(() => {
    if (!existingAttempt?.id) return;
    try {
      const cached = localStorage.getItem(`quiznex_answers_${existingAttempt.id}`);
      if (!cached) return;
      const parsed = JSON.parse(cached) as typeof answers;
      // Merge: cached first, then override with server answers
      for (const [qId, ans] of Object.entries(parsed)) {
        if (!existingAttempt.answers[qId]) {
          setAnswer(qId, ans);
        }
      }
    } catch { /* corrupt cache — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, [setCameraActive]);

  async function requestCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraGranted(true);
      setCameraActive(true);
    } catch {
      setCameraError("Camera access denied. Camera is required to attempt this quiz.");
    }
  }

  // Attach stream to video element once granted
  useEffect(() => {
    if (cameraGranted && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraGranted, phase]);

  // ── Start quiz ──────────────────────────────────────────────────────────────
  async function handleStart() {
    setStartError("");

    // Enter fullscreen (needs user gesture from button click)
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may not be available in all browsers/configs — continue anyway
    }

    if (existingAttempt) {
      // Resume: restore state from server-loaded data
      attemptIdRef.current = existingAttempt.id;
      elapsedRef.current   = existingAttempt.timerElapsedSecs;
      initSession(existingAttempt.id, quiz.id);
      setTimerElapsed(existingAttempt.timerElapsedSecs);
      for (const [qId, ans] of Object.entries(existingAttempt.answers)) {
        setAnswer(qId, ans);
      }
    } else {
      // Create new attempt
      try {
        const res  = await fetch("/api/attempts", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ quizId: quiz.id }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStartError(json.error ?? "Failed to start quiz");
          try { document.exitFullscreen(); } catch { /* ignore */ }
          return;
        }
        attemptIdRef.current = json.attemptId;
        initSession(json.attemptId, quiz.id);
        elapsedRef.current = 0;
      } catch {
        setStartError("Network error. Please try again.");
        try { document.exitFullscreen(); } catch { /* ignore */ }
        return;
      }
    }

    setPhase("countdown");
  }

  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(iv);
        questionStartRef.current = Date.now();
        setPhase("quiz");
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // ── Timer tick ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      elapsedRef.current += 1;
      tickTimer();
      // Accumulate time on current question
      const cq = questions[useQuizSessionStore.getState().currentQuestionIndex];
      if (cq) incrementTimeTaken(cq.id, 1);
      // Auto-submit when time runs out
      if (elapsedRef.current >= timeLimitSecs) {
        doSubmit("AUTO_SUBMITTED");
      }
    }, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Auto-save timer every 30s ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;
    const iv = setInterval(() => syncTimer(), 30_000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function syncTimer() {
    if (!attemptIdRef.current) return;
    fetch(`/api/attempts/${attemptIdRef.current}/timer`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ timerElapsedSecs: elapsedRef.current }),
    }).catch(() => {});
  }

  // ── Fullscreen listener ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz" && phase !== "paused") return;

    function onFsChange() {
      const isFs = !!document.fullscreenElement;
      setFullscreen(isFs);
      if (!isFs && !pausedRef.current && !isSubmittingRef.current) {
        pausedRef.current = true;
        setPhase("paused");
        syncTimer();
        logEvent("FULLSCREEN_EXIT");
      }
    }

    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Key blocking ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz" && phase !== "paused") return;

    const BLOCKED = new Set([
      "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
      "Escape","Meta","ContextMenu","PrintScreen",
    ]);

    function onKey(e: KeyboardEvent) {
      if (BLOCKED.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        logEvent("KEY_BLOCKED", { key: e.key });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ["w","t","n","r","j"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
    function onCtx(e: MouseEvent) { e.preventDefault(); }

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("contextmenu", onCtx);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("contextmenu", onCtx);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab visibility (always active as fallback) ────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;
    function onVis() {
      if (document.hidden) {
        showGazeWarning();
        recordGazeAway();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Load MediaPipe FaceMesh model once when camera is granted ────────────────
  useEffect(() => {
    if (!cameraGranted) return;
    let cancelled = false;
    (async () => {
      await tf.ready();
      const model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "mediapipe",
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4",
          refineLandmarks: true, // enables iris indices 468 (left) and 473 (right)
          maxFaces: 1,
        }
      );
      if (!cancelled) faceModelRef.current = model;
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [cameraGranted]);

  // ── Iris gaze detection via MediaPipe FaceMesh (runs every 2 s during quiz) ──
  useEffect(() => {
    if (phase !== "quiz") return;

    const iv = setInterval(async () => {
      const model = faceModelRef.current;
      const video = videoRef.current;
      if (!model || !video || video.videoWidth === 0 || isSubmittingRef.current || pausedRef.current) return;

      try {
        const faces = await model.estimateFaces(video);

        if (faces.length === 0) {
          showGazeWarning();
          recordGazeAway();
          return;
        }

        const kp = faces[0].keypoints;

        // Iris landmark indices (only present when refineLandmarks: true)
        // 468 = left iris center, 473 = right iris center
        const leftIris  = kp[468];
        const rightIris = kp[473];

        if (!leftIris || !rightIris) {
          // refineLandmarks unavailable — face detected, treat as looking at screen
          dismissGazeWarning();
          return;
        }

        // Left eye corners: 33 (outer/temporal), 133 (inner/nasal)
        // Right eye corners: 362 (inner/nasal), 263 (outer/temporal)
        const leftOuter  = kp[33];
        const leftInner  = kp[133];
        const rightInner = kp[362];
        const rightOuter = kp[263];

        function irisRatio(outerX: number, innerX: number, irisX: number): number {
          const eyeW = Math.abs(innerX - outerX);
          if (eyeW < 5) return 0.5; // too small — treat as centered
          return (irisX - Math.min(outerX, innerX)) / eyeW;
        }

        const leftRatio  = irisRatio(leftOuter.x,  leftInner.x,  leftIris.x);
        const rightRatio = irisRatio(rightInner.x, rightOuter.x, rightIris.x);
        const avgRatio   = (leftRatio + rightRatio) / 2;

        // 0.30–0.70 = iris centered in eye = looking at screen
        if (avgRatio < 0.30 || avgRatio > 0.70) {
          showGazeWarning();
          recordGazeAway();
        } else {
          dismissGazeWarning();
        }
      } catch { /* ignore transient errors */ }
    }, 2000);

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Phase 3: SSE — detect teacher stopping the quiz mid-session ─────────────
  useEffect(() => {
    if (phase !== "quiz" && phase !== "paused") return;

    const es = new EventSource(`/api/quizzes/${quiz.id}/stream`);

    es.onmessage = (e: MessageEvent) => {
      try {
        const { status } = JSON.parse(e.data as string) as { status: string };
        if (status === "COMPLETED" && !isSubmittingRef.current) {
          es.close();
          doSubmit("AUTO_SUBMITTED");
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => es.close();

    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, quiz.id]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (qaDebounceRef.current) clearTimeout(qaDebounceRef.current);
      if (gazeWarnTimerRef.current) clearTimeout(gazeWarnTimerRef.current);
    };
  }, [stopCamera]);

  // ── Proctoring helpers ───────────────────────────────────────────────────────
  function showGazeWarning() {
    setGazeWarning(true);
    if (gazeWarnTimerRef.current) clearTimeout(gazeWarnTimerRef.current);
    gazeWarnTimerRef.current = setTimeout(() => setGazeWarning(false), 3000);
  }

  function dismissGazeWarning() {
    if (gazeWarnTimerRef.current) clearTimeout(gazeWarnTimerRef.current);
    setGazeWarning(false);
  }

  function recordGazeAway() {
    if (isSubmittingRef.current) return;
    const now = Date.now();
    gazeTimestamps.current.push(now);
    gazeTimestamps.current = gazeTimestamps.current.filter((t) => now - t <= 60_000);
    incrementViolation();
    logEvent("GAZE_AWAY");
    if (gazeTimestamps.current.length >= 10) {
      doSubmit("FLAGGED", "Eye-tracking violations: ≥10 gaze-away events in 60 seconds");
    }
  }

  function logEvent(
    type: "FULLSCREEN_EXIT" | "GAZE_AWAY" | "KEY_BLOCKED",
    metadata?: Record<string, unknown>
  ) {
    if (!attemptIdRef.current) return;
    fetch(`/api/attempts/${attemptIdRef.current}/events`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type, metadata }),
    }).catch(() => {});
  }

  // ── Answer handling ──────────────────────────────────────────────────────────
  function handleMcqSelect(questionId: string, optionId: string) {
    setAnswer(questionId, { selectedOptionId: optionId });
    if (!attemptIdRef.current) return;
    fetch(`/api/attempts/${attemptIdRef.current}/answer`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        attemptId:        attemptIdRef.current,
        questionId,
        selectedOptionId: optionId,
        timeTakenSecs:    answers[questionId]?.timeTakenSecs ?? 0,
      }),
    }).catch(() => {});
  }

  function handleQaInput(questionId: string, text: string) {
    setAnswer(questionId, { textAnswer: text });
    if (qaDebounceRef.current) clearTimeout(qaDebounceRef.current);
    qaDebounceRef.current = setTimeout(() => {
      if (!attemptIdRef.current) return;
      fetch(`/api/attempts/${attemptIdRef.current}/answer`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          attemptId:     attemptIdRef.current,
          questionId,
          textAnswer:    text,
          timeTakenSecs: answers[questionId]?.timeTakenSecs ?? 0,
        }),
      }).catch(() => {});
    }, 1500);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function navigateTo(idx: number) {
    goToQuestion(idx);
    questionStartRef.current = Date.now();
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function doSubmit(
    status: "SUBMITTED" | "AUTO_SUBMITTED" | "FLAGGED",
    flagReason?: string
  ) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    pausedRef.current       = true;
    setPhase("submitting");
    setStatus(status);
    syncTimer();
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // Phase 4: clear localStorage buffer on submit
    try { const k = lsKey(); if (k) localStorage.removeItem(k); } catch { /* ignore */ }

    try {
      const res = await fetch(`/api/attempts/${attemptIdRef.current}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status, timerElapsedSecs: elapsedRef.current, flagReason }),
      });
      if (res.ok) {
        resetSession();
        router.push(`/student/classrooms/${classroomId}/quiz/${quiz.id}/result`);
      } else {
        const json = await res.json();
        setSubmitError(json.error ?? "Submission failed. Please try again.");
        isSubmittingRef.current = false;
        pausedRef.current       = false;
        setPhase("quiz");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
      isSubmittingRef.current = false;
      pausedRef.current       = false;
      setPhase("quiz");
    }
  }

  async function resumeQuiz() {
    try {
      await document.documentElement.requestFullscreen();
    } catch { /* ignore */ }
    pausedRef.current = false;
    setPhase("quiz");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── Render ───────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Phase: camera-check ──────────────────────────────────────────────────────
  if (phase === "camera-check") {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <div className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
              <Camera className="h-7 w-7 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
          <p className="mt-1 text-sm text-slate-400">Complete camera check to begin</p>
        </div>

        {/* Quiz info */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Questions", value: questions.length },
            { label: "Time Limit", value: `${quiz.timeLimitMins} min` },
            { label: "Total Marks", value: quiz.totalMarks },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Camera section */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            Proctoring Setup
          </h2>

          {/* Camera preview */}
          <div className="relative overflow-hidden rounded-xl bg-black/40 aspect-video flex items-center justify-center">
            {cameraGranted ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="text-center">
                <CameraOff className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">Camera not started</p>
              </div>
            )}
            {cameraGranted && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Camera active
              </div>
            )}
          </div>

          {cameraError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {cameraError}
            </div>
          )}

          {!cameraGranted && (
            <button
              onClick={requestCamera}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              <Camera className="h-4 w-4" />
              Allow Camera Access
            </button>
          )}
        </div>

        {/* Requirements list */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Before you begin</h2>
          {[
            "Your browser will enter fullscreen mode",
            "Keep your eyes focused on the screen",
            "Do not switch tabs or minimize the window",
            "Function keys and shortcuts are disabled",
            "10 gaze-away events in 60 seconds will auto-fail your attempt",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2.5 text-xs text-slate-400">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
              {rule}
            </div>
          ))}
        </div>

        {startError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {startError}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!cameraGranted}
          className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Maximize className="h-4 w-4" />
          {existingAttempt ? "Resume Quiz" : "Start Quiz"}
        </button>
      </div>
    );
  }

  // ── Phase: countdown ─────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05050f]">
        <p className="mb-6 text-lg font-medium text-slate-400 tracking-widest uppercase">Get Ready</p>
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-blue-500/10 ring-4 ring-blue-500/30">
          <span className="text-6xl font-black text-white tabular-nums">{countdown}</span>
        </div>
        <p className="mt-8 text-sm text-slate-500">{quiz.title}</p>
      </div>
    );
  }

  // ── Phase: submitting ────────────────────────────────────────────────────────
  if (phase === "submitting") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#05050f]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
        <p className="text-base font-semibold text-white">Submitting your answers…</p>
        <p className="text-sm text-slate-500">Please don't close this tab</p>
      </div>
    );
  }

  // ── Phase: quiz + paused ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#05050f]">

      {/* Fullscreen-exit paused overlay */}
      {phase === "paused" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#05050f]/95">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <AlertTriangle className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Quiz Paused</h2>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">
              You exited fullscreen. Your answers are saved and the timer is paused.
              Re-enter fullscreen to continue.
            </p>
          </div>
          <button
            onClick={resumeQuiz}
            className="btn-gradient flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20"
          >
            <Maximize className="h-4 w-4" />
            Re-enter Fullscreen &amp; Resume
          </button>
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Each exit is logged as a violation
          </p>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 bg-[#05050f] px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="truncate text-sm font-semibold text-white">{quiz.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 tabular-nums text-sm font-bold ${
            isTimeLow
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-white/10 bg-white/5 text-white"
          }`}>
            <Clock className="h-3.5 w-3.5" />
            {formatTime(timeRemainingStore)}
          </div>

          {/* Question counter */}
          <span className="hidden text-xs text-slate-500 sm:block">
            {currentQuestionIndex + 1} / {questions.length}
          </span>

          {/* Submit */}
          <button
            onClick={() => setShowConfirm(true)}
            className="btn-gradient flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
          >
            Submit
          </button>
        </div>
      </div>

      {/* ── Gaze-away warning banner ─────────────────────────────────────────── */}
      {gazeWarning && phase === "quiz" && (
        <div className="absolute left-1/2 top-16 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-300 shadow-xl backdrop-blur-sm animate-pulse pointer-events-none">
          <EyeOff className="h-4 w-4 shrink-0" />
          Please keep your eyes on the screen!
        </div>
      )}

      {/* ── Question area ─────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          {currentQ && (
            <div className="mx-auto max-w-2xl space-y-5">
              {/* Question header */}
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                  Q{currentQuestionIndex + 1}
                </span>
                <span className="text-xs text-slate-500">{currentQ.marks} mark{currentQ.marks !== 1 ? "s" : ""}</span>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  currentQ.type === "MCQ"
                    ? "border-blue-500/25 bg-blue-500/10 text-blue-400"
                    : "border-purple-500/25 bg-purple-500/10 text-purple-400"
                }`}>
                  {currentQ.type}
                </span>
              </div>

              {/* Question text */}
              <p className="text-base leading-relaxed text-white">{currentQ.text}</p>

              {/* Optional image */}
              {currentQ.imageUrl && (
                <Image
                  src={currentQ.imageUrl}
                  alt="Question image"
                  width={400}
                  height={250}
                  className="rounded-xl border border-white/10 object-contain"
                  unoptimized
                />
              )}

              {/* MCQ options */}
              {currentQ.type === "MCQ" && (
                <div className="space-y-2.5">
                  {currentQ.options.map((opt) => {
                    const selected = currentAnswer?.selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleMcqSelect(currentQ.id, opt.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all ${
                          selected
                            ? "border-blue-500/60 bg-blue-500/15 text-white"
                            : "border-white/10 bg-white/3 text-slate-300 hover:border-white/25 hover:bg-white/5"
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          selected ? "border-blue-400 bg-blue-500/30" : "border-slate-600"
                        }`}>
                          {selected && <span className="h-2 w-2 rounded-full bg-blue-400" />}
                        </span>
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* QA textarea */}
              {currentQ.type === "QA" && (
                <textarea
                  value={currentAnswer?.textAnswer ?? ""}
                  onChange={(e) => handleQaInput(currentQ.id, e.target.value)}
                  placeholder="Type your answer here…"
                  rows={8}
                  className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 resize-none"
                />
              )}
            </div>
          )}

          {submitError && (
            <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {submitError}
            </div>
          )}
        </div>

      {/* ── Bottom nav ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/8 bg-[#05050f] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button
            onClick={() => navigateTo(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          {/* Question palette — horizontal scroll so all buttons are always reachable */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {questions.map((q, idx) => {
              const ans      = answers[q.id];
              const answered = !!(ans?.selectedOptionId || ans?.textAnswer);
              const current  = idx === currentQuestionIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => navigateTo(idx)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    current   ? "bg-blue-500 text-white ring-2 ring-blue-400/50"
                    : answered ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    :            "border border-white/10 bg-white/3 text-slate-500 hover:bg-white/8"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => navigateTo(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Camera corner ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-16 right-4 z-30">
        <div className="relative h-24 w-32 overflow-hidden rounded-xl border border-white/15 bg-black shadow-lg shadow-black/50">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover scale-x-[-1]"
          />
          <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-400">
            <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
            REC
          </div>
        </div>
      </div>

      {/* ── Submit confirmation dialog ───────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Submit Quiz?</h3>
              <button onClick={() => setShowConfirm(false)} className="text-slate-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {unansweredCount > 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                You have {unansweredCount} unanswered question{unansweredCount !== 1 ? "s" : ""}.
              </div>
            ) : (
              <p className="text-sm text-slate-400">All {questions.length} questions answered.</p>
            )}
            <p className="text-xs text-slate-500">
              Once submitted, you cannot change your answers.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); doSubmit("SUBMITTED"); }}
                className="btn-gradient flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
              >
                <Check className="h-4 w-4" /> Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
