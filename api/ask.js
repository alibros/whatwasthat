// Load environment variables for Vercel
import dotenv from "dotenv";
dotenv.config();

import { askModelForMediaLookup } from "../src/openaiClient.js";
import { enrichMediaData } from "../src/tmdbClient.js";

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            status: "error", 
            error_message: "Method not allowed" 
        });
    }

    try {
        const { question } = req.body || {};
        if (!question || typeof question !== "string") {
            return res.status(400).json({
                status: "error",
                error_message: "Body must include a 'question' string"
            });
        }

        const result = await askModelForMediaLookup(question);

        // If the model already indicates error, send 404 for not-found style errors, otherwise 200
        if (result?.status === "error") {
            return res.status(404).json(result);
        }

        // Enrich the result with TMDB data
        const enrichedResult = await enrichMediaData(result);
        return res.status(200).json(enrichedResult);
    } catch (err) {
        console.error("/ask error:", err);
        const devMessage = process.env.NODE_ENV === "production" 
            ? "Internal server error" 
            : (err?.message || "Internal server error");
        return res.status(500).json({ 
            status: "error", 
            error_message: devMessage 
        });
    }
}
