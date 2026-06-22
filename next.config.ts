import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Frame-Options",        value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",     value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.amazonaws.com https://*.cloudfront.net",
      "font-src 'self'",
      "connect-src 'self' https://*.amazonaws.com https://*.cloudfront.net https://sentry.io",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Amplify SSR Lambda does not receive console env vars at runtime —
  // bake them in at build time so process.env.* works in Lambda.
  env: {
    APP_SECRET:              process.env.APP_SECRET              ?? "",
    NEON_DATABASE_URL:       process.env.NEON_DATABASE_URL       ?? "",
    GROQ_API_KEY:            process.env.GROQ_API_KEY            ?? "",
    GOOGLE_CLIENT_ID:        process.env.GOOGLE_CLIENT_ID        ?? "",
    GOOGLE_CLIENT_SECRET:    process.env.GOOGLE_CLIENT_SECRET    ?? "",
    S3_ACCESS_KEY_ID:        process.env.S3_ACCESS_KEY_ID        ?? "",
    S3_SECRET_ACCESS_KEY:    process.env.S3_SECRET_ACCESS_KEY    ?? "",
    S3_REGION:               process.env.S3_REGION               ?? "",
    S3_BUCKET_NAME:          process.env.S3_BUCKET_NAME          ?? "",
    S3_CLOUDFRONT_URL:       process.env.S3_CLOUDFRONT_URL       ?? "",
    EMAIL_APP_PASSWORD:      process.env.EMAIL_APP_PASSWORD      ?? "",
    EMAIL_FROM:              process.env.EMAIL_FROM              ?? "",
    NEXTAUTH_URL:            process.env.NEXTAUTH_URL            ?? "",
    SAFEPAY_SECRET_KEY:      process.env.SAFEPAY_SECRET_KEY      ?? "",
    SAFEPAY_PUBLIC_KEY:      process.env.SAFEPAY_PUBLIC_KEY      ?? "",
    SAFEPAY_WEBHOOK_SECRET:  process.env.SAFEPAY_WEBHOOK_SECRET  ?? "",
    SAFEPAY_ENV:             process.env.SAFEPAY_ENV             ?? "sandbox",
  },
  turbopack: {
    resolveAlias: {
      "@mediapipe/face_mesh": "./src/stubs/mediapipe-face-mesh.js",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
