// JSON schema that enforces the exact response structure from the model
// The model must ONLY output a single JSON object conforming to this schema.

export const responseSchema = {
	name: "MediaLookupResponse",
	strict: true,
	schema: {
		type: "object",
		additionalProperties: false,
		properties: {
			status: { type: "string", enum: ["success", "error"] },
			error_message: { type: ["string", "null"], description: "Set when status is 'error', otherwise null" },
			type: { anyOf: [ { type: "string", enum: ["movie", "series"] }, { type: "null" } ], description: "Content type or null on error" },
			// Movie fields
			movie_title: { type: ["string", "null"], description: "Movie title when type='movie', else null" },
			// Series fields
			series_title: { type: ["string", "null"], description: "Series title when type='series', else null" },
			season_number: { anyOf: [ { type: "integer", minimum: 1 }, { type: "null" } ], description: "Season when type='series', else null" },
			episode_number: { anyOf: [ { type: "integer", minimum: 1 }, { type: "null" } ], description: "Episode when type='series', else null" },
			episode_title: { type: ["string", "null"], description: "Episode title when type='series', else null" },
			// Timestamp fields
			timestamp_success: { anyOf: [ { type: "boolean" }, { type: "null" } ], description: "Whether a timestamp could be provided (null on error)" },
			timestamp: {
				type: ["string", "null"],
				description:
					"Timestamp in HH:MM:SS or MM:SS. If only approximate is known, give best estimate in this format.",
				pattern: "^(?:\\d{2}:)?[0-5]?\\d:[0-5]\\d$"
			},
			timestamp_error: { type: ["string", "null"], description: "Present when timestamp_success is false, else null" }
		},
		required: ["status","error_message","type","movie_title","series_title","season_number","episode_number","episode_title","timestamp_success","timestamp","timestamp_error"],
		// Conditional validation is not supported in the structured outputs subset; the model prompt will enforce semantics
	}
};

export function buildSystemPrompt() {
	return (
		"You are a film and TV knowledge assistant that ALWAYS provides your best guess. " +
		"Given a natural-language question about TV episodes or movies, identify the most likely piece of content. " +
		"NEVER return status='error' - always make your best educated guess even if you're not 100% certain. " +
		"If it is a series, return season number, episode number, and episode title. " +
		"If it is a movie, return the movie title. " +
		"Use your knowledge up to your training cutoff and make reasonable inferences. " +
		"For recent content or episodes you might not have complete data for, provide your best estimate based on patterns, typical episode structures, and context clues. " +
		"For shows like South Park, The Simpsons, etc., use your knowledge of their typical episode themes and seasons to make educated guesses. " +
		"If the user appears to request a timestamp for a moment in the content, set timestamp_success accordingly. " +
		"Only produce JSON that matches the provided JSON Schema, with no extra text. " +
		"Always return status='success' with your best identification attempt. " +
		"If you can identify the content but not the exact timestamp, return status='success' with timestamp_success=false and a descriptive timestamp_error. " +
		"Even if you're unsure about exact episode numbers or details, provide your most reasonable guess rather than refusing to answer. " +
		"Remember: It's better to provide a reasonable guess than no answer at all."
	);
}


