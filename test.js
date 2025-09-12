import OpenAI from "openai";
import "dotenv/config";

const endpoint = "https://pex-playground.openai.azure.com/openai/v1/";
const modelName = "gpt-4.1";
const deployment_name = "gpt-4.1";
const api_key = process.env.OPENAI_API_KEY;

const client = new OpenAI({
    baseURL: endpoint,
    apiKey: api_key
});

async function main() {
  const completion = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "developer", content: "You talk like a pirate." },
      { role: "user", content: "Can you help me?" }
    ],
    model: deployment_name,
  });

  console.log(completion.choices[0]);
}

main();