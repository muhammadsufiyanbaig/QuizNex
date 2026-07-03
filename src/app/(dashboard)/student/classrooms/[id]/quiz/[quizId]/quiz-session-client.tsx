"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuizSessionStore } from "@/store/quiz-session.store";
import type { FaceLandmarksDetector } from "@tensorflow-models/face-landmarks-detection";
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
  Send,
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

type Phase = "camera-check" | "countdown" | "quiz" | "ended_violation" | "submitting";

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
  const [phase, setPhase]                   = useState<Phase>("camera-check");
  const [countdown, setCountdown]           = useState(3);
  const [cameraGranted, setCameraGranted]   = useState(false);
  const [cameraError, setCameraError]       = useState("");
  const [startError, setStartError]         = useState("");
  const [showConfirm, setShowConfirm]       = useState(false);
  const [submitError, setSubmitError]       = useState("");
  const [gazeWarning, setGazeWarning]       = useState(false);
  const [gazeWarningCount, setGazeWarningCount] = useState(0);
  const [violationReason, setViolationReason] = useState("");
  const [requizSent, setRequizSent]         = useState(false);
  const [requizError, setRequizError]       = useState("");
  const [requizLoading, setRequizLoading]   = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const videoRef            = useRef<HTMLVideoElement>(null);
  const streamRef           = useRef<MediaStream | null>(null);
  const attemptIdRef        = useRef(existingAttempt?.id ?? "");
  const elapsedRef          = useRef(existingAttempt?.timerElapsedSecs ?? 0);
  const lsKey = () => attemptIdRef.current ? `quiznex_answers_${attemptIdRef.current}` : null;
  const pausedRef           = useRef(false);
  const isSubmittingRef     = useRef(false);
  const gazeViolationCount  = useRef(0);
  const qaDebounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionStartRef    = useRef(Date.now());
  const gazeWarnTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceModelRef        = useRef<FaceLandmarksDetector | null>(null);
  const canvasRef           = useRef<HTMLCanvasElement>(null);
  const gazeAwayRef         = useRef(false);
  const faceKpsRef          = useRef<Array<{ x: number; y: number }> | null>(null);
  const pendingSavesRef     = useRef(0);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const timeLimitSecs      = quiz.timeLimitMins * 60;
  const timeRemainingStore = timeLimitSecs - timerElapsedSecs;
  const isTimeLow          = timeRemainingStore < 300;
  const currentQ           = questions[currentQuestionIndex];
  const currentAnswer      = currentQ ? answers[currentQ.id] : undefined;
  const unansweredCount    = questions.filter((q) => !answers[q.id]?.selectedOptionId && !answers[q.id]?.textAnswer).length;

  // ── Save answers to localStorage on every change ─────────────────────────────
  useEffect(() => {
    const key = lsKey();
    if (!key || phase !== "quiz") return;
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch { /* storage full — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, phase]);

  // ── On mount, merge cached answers (server wins on conflict) ─────────────────
  useEffect(() => {
    if (!existingAttempt?.id) return;
    try {
      const cached = localStorage.getItem(`quiznex_answers_${existingAttempt.id}`);
      if (!cached) return;
      const parsed = JSON.parse(cached) as typeof answers;
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

  useEffect(() => {
    if (cameraGranted && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraGranted, phase]);

  // ── Start quiz ──────────────────────────────────────────────────────────────
  async function handleStart() {
    setStartError("");

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may not be available in all browsers/configs — continue anyway
    }

    if (existingAttempt) {
      attemptIdRef.current = existingAttempt.id;
      elapsedRef.current   = existingAttempt.timerElapsedSecs;
      initSession(existingAttempt.id, quiz.id);
      setTimerElapsed(existingAttempt.timerElapsedSecs);
      for (const [qId, ans] of Object.entries(existingAttempt.answers)) {
        setAnswer(qId, ans);
      }
    } else {
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
      const cq = questions[useQuizSessionStore.getState().currentQuestionIndex];
      if (cq) incrementTimeTaken(cq.id, 1);
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

  // ── Fullscreen listener — exit immediately ends quiz ─────────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;

    function onFsChange() {
      const isFs = !!document.fullscreenElement;
      setFullscreen(isFs);
      if (!isFs && !isSubmittingRef.current) {
        logEvent("FULLSCREEN_EXIT");
        doViolationEnd("You exited fullscreen — quiz ended automatically.");
      }
    }

    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Key + clipboard blocking ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;

    const BLOCKED = new Set([
      "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
      "Escape","Meta","ContextMenu","PrintScreen",
      "Tab", // prevent tabbing to browser chrome or between elements
    ]);

    function onKey(e: KeyboardEvent) {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Tab — blocked everywhere, no exceptions
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Alt combos — blocked everywhere
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        logEvent("KEY_BLOCKED", { key: e.key, modifier: "alt" });
        return;
      }

      // Ctrl/Meta combos — allow only undo/redo inside text inputs; block all else
      // (this disables Ctrl+C, Ctrl+V, Ctrl+X copy/paste shortcuts)
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (inInput && (k === "z" || k === "y")) return; // undo / redo only
        e.preventDefault();
        e.stopPropagation();
        logEvent("KEY_BLOCKED", { key: e.key, modifier: "ctrl" });
        return;
      }

      // Shift — block only when combined with other modifiers (Shift alone allows capitals)
      if (e.shiftKey && (e.altKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Individual blocked keys
      if (BLOCKED.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        logEvent("KEY_BLOCKED", { key: e.key });
      }
    }

    function onCtx(e: MouseEvent) { e.preventDefault(); }
    function onClipboard(e: ClipboardEvent) { e.preventDefault(); }

    document.addEventListener("keydown",     onKey,      true);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("copy",        onClipboard);
    document.addEventListener("cut",         onClipboard);
    document.addEventListener("paste",       onClipboard);

    return () => {
      document.removeEventListener("keydown",     onKey,      true);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("copy",        onClipboard);
      document.removeEventListener("cut",         onClipboard);
      document.removeEventListener("paste",       onClipboard);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab visibility ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;
    function onVis() {
      if (document.hidden) recordGazeAway();
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
      const [tf, fld] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow-models/face-landmarks-detection"),
      ]);
      await tf.ready();
      const model = await fld.createDetector(
        fld.SupportedModels.MediaPipeFaceMesh,
        { runtime: "tfjs", refineLandmarks: true, maxFaces: 1 }
      );
      if (!cancelled) faceModelRef.current = model;
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [cameraGranted]);

  // ── Canvas drawing loop — video frame + face mesh (runs every animation frame) ─
  useEffect(() => {
    if (!cameraGranted) return;

    const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

    let animId: number;

    function draw() {
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video || video.videoWidth === 0) { animId = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { animId = requestAnimationFrame(draw); return; }

      const cw = canvas.width, ch = canvas.height;
      const vw = video.videoWidth, vh = video.videoHeight;

      // Cover-fit: scale video to fill canvas, crop excess
      const scale = Math.max(cw / vw, ch / vh);
      const srcW  = cw / scale, srcH = ch / scale;
      const srcX  = (vw - srcW) / 2,  srcY = (vh - srcH) / 2;

      // Draw mirrored video frame
      ctx.save();
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, cw, ch);
      ctx.restore();

      // Overlay face mesh if keypoints are available
      const kps = faceKpsRef.current;
      if (kps && kps.length > 0) {
        // Map from video space → canvas space (with mirror)
        const toC = (kp: { x: number; y: number }) => ({
          x: cw - (kp.x - srcX) * scale, // mirror x
          y: (kp.y - srcY) * scale,
        });

        // Face oval: filled transparent mask + outline
        ctx.beginPath();
        FACE_OVAL.forEach((i, idx) => {
          const p = kps[i]; if (!p) return;
          const { x, y } = toC(p);
          if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle   = "rgba(0,200,255,0.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,210,255,0.85)";
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // Landmark dots
        ctx.fillStyle = "rgba(0,230,210,0.60)";
        for (const kp of kps) {
          const { x, y } = toC(kp);
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraGranted]);

  // ── Iris gaze detection via MediaPipe FaceMesh (runs every 1 s) ──────────────
  useEffect(() => {
    if (phase !== "quiz") return;

    const iv = setInterval(async () => {
      const model = faceModelRef.current;
      const video = videoRef.current;
      if (!model || !video || video.videoWidth === 0 || isSubmittingRef.current || pausedRef.current) return;

      try {
        const faces = await model.estimateFaces(video);

        // Store keypoints for canvas drawing loop
        faceKpsRef.current = faces.length > 0 ? faces[0].keypoints : null;

        if (faces.length === 0) {
          recordGazeAway();
          return;
        }

        const kp = faces[0].keypoints;
        const leftIris  = kp[468];
        const rightIris = kp[473];

        if (!leftIris || !rightIris) {
          recordGazeBack();
          return;
        }

        const leftOuter  = kp[33];
        const leftInner  = kp[133];
        const rightInner = kp[362];
        const rightOuter = kp[263];

        function irisRatio(outerX: number, innerX: number, irisX: number): number {
          const eyeW = Math.abs(innerX - outerX);
          if (eyeW < 5) return 0.5;
          return (irisX - Math.min(outerX, innerX)) / eyeW;
        }

        const leftRatio  = irisRatio(leftOuter.x,  leftInner.x,  leftIris.x);
        const rightRatio = irisRatio(rightInner.x, rightOuter.x, rightIris.x);
        const avgRatio   = (leftRatio + rightRatio) / 2;

        if (avgRatio < 0.30 || avgRatio > 0.70) {
          recordGazeAway();
        } else {
          recordGazeBack();
        }
      } catch { /* ignore transient errors */ }
    }, 1000);

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── SSE — detect teacher stopping the quiz mid-session ───────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;

    const es = new EventSource(`/api/quizzes/${quiz.id}/stream`);

    es.onmessage = (e: MessageEvent) => {
      try {
        const { status } = JSON.parse(e.data as string) as { status: string };
        if (status === "COMPLETED" && !isSubmittingRef.current) {
          es.close();
          doSubmit("AUTO_SUBMITTED");
        }
      } catch { /* ignore */ }
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

  function recordGazeAway() {
    if (isSubmittingRef.current || gazeAwayRef.current) return;
    gazeAwayRef.current = true;
    gazeViolationCount.current += 1;
    setGazeWarningCount(gazeViolationCount.current);
    incrementViolation();
    logEvent("GAZE_AWAY");
    showGazeWarning();
    if (gazeViolationCount.current >= 3) {
      doViolationEnd("3 gaze-away violations detected — quiz ended automatically.");
    }
  }

  function recordGazeBack() {
    gazeAwayRef.current = false;
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

  // ── Violation end — submits as FLAGGED, then shows re-quiz request UI ─────────
  async function doViolationEnd(reason: string) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    pausedRef.current = true;
    setViolationReason(reason);
    setPhase("submitting");
    setStatus("FLAGGED");
    syncTimer();
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try { const k = lsKey(); if (k) localStorage.removeItem(k); } catch { /* ignore */ }

    await fetch(`/api/attempts/${attemptIdRef.current}/submit`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        status:           "FLAGGED",
        timerElapsedSecs: elapsedRef.current,
        flagReason:       reason,
      }),
    }).catch(() => {});

    isSubmittingRef.current = false;
    setPhase("ended_violation");
  }

  // ── Re-quiz request ──────────────────────────────────────────────────────────
  async function handleRequizRequest() {
    setRequizLoading(true);
    setRequizError("");
    try {
      const res = await fetch(`/api/attempts/${attemptIdRef.current}/requiz-request`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason: violationReason }),
      });
      if (res.ok) {
        setRequizSent(true);
      } else {
        const json = await res.json();
        setRequizError(json.error ?? "Failed to send request.");
      }
    } catch {
      setRequizError("Network error. Please try again.");
    } finally {
      setRequizLoading(false);
    }
  }

  // ── Answer handling ──────────────────────────────────────────────────────────
  function handleMcqSelect(questionId: string, optionId: string) {
    setAnswer(questionId, { selectedOptionId: optionId });
    if (!attemptIdRef.current) return;
    pendingSavesRef.current++;
    fetch(`/api/attempts/${attemptIdRef.current}/answer`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        attemptId:        attemptIdRef.current,
        questionId,
        selectedOptionId: optionId,
        timeTakenSecs:    answers[questionId]?.timeTakenSecs ?? 0,
      }),
    })
    .catch(() => {})
    .finally(() => { pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1); });
  }

  function handleQaInput(questionId: string, text: string) {
    setAnswer(questionId, { textAnswer: text });
    if (qaDebounceRef.current) clearTimeout(qaDebounceRef.current);
    qaDebounceRef.current = setTimeout(() => {
      if (!attemptIdRef.current) return;
      pendingSavesRef.current++;
      fetch(`/api/attempts/${attemptIdRef.current}/answer`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          attemptId:     attemptIdRef.current,
          questionId,
          textAnswer:    text,
          timeTakenSecs: answers[questionId]?.timeTakenSecs ?? 0,
        }),
      })
      .catch(() => {})
      .finally(() => { pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1); });
    }, 1500);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function navigateTo(idx: number) {
    goToQuestion(idx);
    questionStartRef.current = Date.now();
  }

  // ── Submit (voluntary or time-up) ────────────────────────────────────────────
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
    try { const k = lsKey(); if (k) localStorage.removeItem(k); } catch { /* ignore */ }

    // Drain any in-flight answer saves before scoring — prevents race where
    // last answer fires after submit reads DB (would score as 0).
    const deadline = Date.now() + 3000;
    while (pendingSavesRef.current > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }

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

        {/* Rules */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Before you begin</h2>
          {[
            "Your browser will enter fullscreen mode — do NOT exit during the quiz",
            "Exiting fullscreen will immediately end and flag your attempt",
            "Keep your eyes on the screen at all times",
            "3 gaze-away events will immediately end your attempt",
            "Do not switch tabs or minimize the window",
            "Ctrl, Alt, and function keys are disabled",
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
        <p className="text-sm text-slate-500">Please don&apos;t close this tab</p>
      </div>
    );
  }

  // ── Phase: ended_violation ───────────────────────────────────────────────────
  if (phase === "ended_violation") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#05050f] p-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <ZapOff className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Quiz Ended</h2>
          <p className="text-sm text-slate-400">{violationReason}</p>
          <p className="text-xs text-slate-500">Your progress has been saved and your attempt flagged.</p>
        </div>

        {/* Re-quiz request card */}
        <div className="glass-card w-full max-w-sm rounded-2xl p-6 space-y-4">
          {requizSent ? (
            <div className="text-center space-y-3 py-2">
              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <p className="text-sm font-semibold text-white">Request sent to teacher!</p>
              <p className="text-xs text-slate-400">
                Your teacher will review your request. You&apos;ll be notified when approved.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white">Request Re-quiz</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Ask your teacher to allow you to retake this quiz. Your teacher must approve before you can attempt it again.
                </p>
              </div>
              {requizError && (
                <p className="text-xs text-red-400">{requizError}</p>
              )}
              <button
                onClick={handleRequizRequest}
                disabled={requizLoading}
                className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {requizLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
                {requizLoading ? "Sending…" : "Request Re-quiz from Teacher"}
              </button>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <Link
            href={`/student/classrooms/${classroomId}/quiz/${quiz.id}/result`}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            View attempt results
          </Link>
          <Link
            href={`/student/classrooms/${classroomId}`}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Back to classroom
          </Link>
        </div>
      </div>
    );
  }

  // ── Phase: quiz ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#05050f]">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 bg-[#05050f] px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="truncate text-sm font-semibold text-white">{quiz.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 tabular-nums text-sm font-bold ${
            isTimeLow
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-white/10 bg-white/5 text-white"
          }`}>
            <Clock className="h-3.5 w-3.5" />
            {formatTime(timeRemainingStore)}
          </div>

          <span className="hidden text-xs text-slate-500 sm:block">
            {currentQuestionIndex + 1} / {questions.length}
          </span>

          <button
            onClick={() => setShowConfirm(true)}
            className="btn-gradient flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
          >
            Submit
          </button>
        </div>
      </div>

      {/* ── Gaze-away warning banner ─────────────────────────────────────────── */}
      {gazeWarning && (
        <div className="absolute left-1/2 top-16 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-300 shadow-xl backdrop-blur-sm animate-pulse pointer-events-none">
          <EyeOff className="h-4 w-4 shrink-0" />
          Warning #{gazeWarningCount}: Keep your eyes on the screen! ({3 - gazeWarningCount} left before quiz ends)
        </div>
      )}

      {/* ── Question area ─────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        {currentQ && (
          <div className="mx-auto max-w-2xl space-y-5">
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

            <p className="text-base leading-relaxed text-white">{currentQ.text}</p>

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
        <div className="relative h-44 w-56 overflow-hidden rounded-xl border border-white/15 bg-black shadow-xl shadow-black/60">
          {/* Video hidden — canvas draws frames from it via drawImage */}
          <video ref={videoRef} autoPlay muted playsInline className="hidden" />
          <canvas
            ref={canvasRef}
            width={224}
            height={176}
            className="h-full w-full"
          />
          {/* Warning overlay on camera feed */}
          {gazeWarning && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-1 bg-red-500/70 py-1 text-[10px] font-bold text-white">
              <EyeOff className="h-3 w-3 shrink-0" />
              Warning {gazeWarningCount}/3
            </div>
          )}
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
