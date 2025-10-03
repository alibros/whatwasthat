// Load environment variables for Vercel
import dotenv from "dotenv";
dotenv.config();

// Note: we import from ../src (original source). vercel.json includeFiles ensures bundling.
import { askModelForMediaLookup } from "../src/openaiClient.js";
import { enrichMediaData } from "../src/tmdbClient.js";

console.log("[BOOT] api/ask.js module loaded (cold start) at", new Date().toISOString());

async function readJsonBody(req) {
    if (req.body && typeof req.body === "object") {
        return req.body;
    }

    if (req.body && typeof req.body === "string") {
        try {
            return JSON.parse(req.body);
        } catch (error) {
            throw new Error("Invalid JSON body supplied");
        }
    }

    if (typeof req.setEncoding === "function") {
        req.setEncoding("utf8");
    }

    let rawBody = "";

    for await (const chunk of req) {
        rawBody += chunk;
        if (rawBody.length > 1_000_000) {
            throw new Error("Request body too large");
        }
    }

    if (!rawBody) {
        return {};
    }

    try {
        return JSON.parse(rawBody);
    } catch (error) {
        throw new Error("Invalid JSON body supplied");
    }
}

export default async function handler(req, res) {
    console.log(`[${new Date().toISOString()}] Received request for /api/ask`);
    console.log(`Request Method: ${req.method}`);

    if (req.method !== "POST") {
        console.log("Responding with 405 Method Not Allowed");
        return res.status(405).json({
            status: "error",
            error_message: "Method not allowed"
        });
    }

    try {
        console.log("Attempting to read request body.");
        const { question } = await readJsonBody(req);
        console.log(`Received question: "${question}"`);

        if (!question || typeof question !== "string") {
            console.log("Responding with 400 Bad Request: Missing or invalid question.");
            return res.status(400).json({
                status: "error",
                error_message: "Body must include a 'question' string"
            });
        }

        console.log("Calling askModelForMediaLookup...");
        const result = await askModelForMediaLookup(question);
        console.log("Received result from askModelForMediaLookup:", JSON.stringify(result, null, 2));

        if (result?.status === "error") {
            console.log("Model returned an error. Responding with 500.");
            return res.status(500).json(result);
        }

        console.log("Enriching result with TMDB data...");
        const enrichedResult = await enrichMediaData(result);
        console.log("Enrichment complete. Sending final response.");
        return res.status(200).json(enrichedResult);
    } catch (err) {
        console.error("[FATAL] /api/ask error:", err);
        const devMessage = process.env.NODE_ENV === "production"
            ? "Internal server error"
            : (err?.message || "Internal server error");
        return res.status(500).json({
            status: "error",
            error_message: devMessage
        });
    }
}
