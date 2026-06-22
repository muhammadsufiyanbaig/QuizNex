export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    APP_SECRET: !!process.env.APP_SECRET,
    NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
}
