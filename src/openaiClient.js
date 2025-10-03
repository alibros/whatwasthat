import OpenAI from "openai";
import { buildSystemPrompt, responseSchema } from "./schema.js";


// Lazy initialization of OpenAI client to ensure environment variables are loaded
let openai = null;

function getOpenAIClient() {
    if (!openai) {
        // Configure OpenAI client with environment variables
        // Use the original simple configuration that was working
        openai = new OpenAI({
            baseURL: process.env.OPENAI_BASE_URL,
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}
function isModelUnavailableError(err) {
	const msg = err?.message || "";
	return /model/i.test(msg) && /does not exist|not found|invalid/i.test(msg);
}

async function callModel(model, userQuestion, systemPrompt) {
	return getOpenAIClient().responses.create({
		model,
		input: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userQuestion }
		],
		text: {
			format: {
				type: "json_schema",
				name: responseSchema.name,
				schema: responseSchema.schema,
				strict: responseSchema.strict !== false
			}
		}
	});
}

export async function askModelForMediaLookup(userQuestion) {
	const systemPrompt = buildSystemPrompt();
	const preferredModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
	const fallbackModels = ["gpt-5.0-mini", "gpt-4o-mini"];
	const modelsToTry = [preferredModel, ...fallbackModels.filter((m) => m !== preferredModel)];

	let lastError;
	for (const model of modelsToTry) {
		try {
			const response = await callModel(model, userQuestion, systemPrompt);
			const text = response.output_text || (response.output?.[0]?.content?.[0]?.text ?? "");
			if (!text) {
				return { status: "error", error_message: "Empty model response" };
			}
			try {
				return JSON.parse(text);
			} catch {
				return { status: "error", error_message: "Model returned non-JSON output" };
			}
		} catch (err) {
			lastError = err;
			console.error("Error calling model:", err);
			if (isModelUnavailableError(err)) {
				continue; // try next model
			}
			// Non-model error, stop here
			return { status: "error", error_message: err?.message || "Upstream error" };
		}
	}

	return {
		status: "error",
		error_message: `Requested model not available. Tried: ${modelsToTry.join(", ")}`
	};
}


