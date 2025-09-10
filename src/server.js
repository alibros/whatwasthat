import express from "express";
import "dotenv/config";
import { askModelForMediaLookup } from "./openaiClient.js";
import { enrichMediaData } from "./tmdbClient.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

app.post("/ask", async (req, res) => {
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
		return res.json(enrichedResult);
	} catch (err) {
		console.error("/ask error:", err);
		const devMessage = process.env.NODE_ENV === "production" ? "Internal server error" : (err?.message || "Internal server error");
		return res.status(500).json({ status: "error", error_message: devMessage });
	}
});

app.listen(port, () => {
	console.log(`whatwasthat API listening on port ${port}`);
});


