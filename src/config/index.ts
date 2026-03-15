export const APP_CONFIG = {
  name: "QuizNex",
  description: "AI-Powered Proctored Quiz Platform",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  // Proctoring
  proctoring: {
    gazeAwayThreshold: 10,       // violations per rolling window
    gazeWindowSecs: 60,          // rolling window in seconds
    autoSaveIntervalMs: 30_000,  // answer auto-save interval
  },

  // Invitations
  invitationExpiryDays: 7,

  // Password reset
  passwordResetExpiryHours: 1,

  // File uploads
  upload: {
    maxSizeMb: 20,
    allowedTypes: ["application/pdf", "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"],
  },

  // Join key format
  joinKey: {
    length: 7, // e.g. AX7-K29
  },
} as const;
