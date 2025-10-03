// Lightweight debug endpoint to verify serverless routing and environment
import dotenv from "dotenv";
dotenv.config();

console.log("[BOOT] api/debug.js module loaded at", new Date().toISOString());

export default async function handler(req, res) {
  const t0 = Date.now();
  const info = {
    status: "ok",
    message: "Debug route responding",
    method: req.method,
    now: new Date().toISOString(),
    uptime_s: process.uptime(),
    env_presence: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      OPENAI_BASE_URL: !!process.env.OPENAI_BASE_URL,
      OPENAI_MODEL: !!process.env.OPENAI_MODEL,
      TMDB_API_KEY: !!process.env.TMDB_API_KEY
    }
  };
  res.setHeader("x-debug-elapsed-ms", Date.now() - t0);
  res.status(200).json(info);
}