import OpenAI from "openai";
import { NextResponse } from "next/server";
import "dotenv/config";

const systemPrompt = `You are an AI that makes recipes from a list of ingredients a person added in a Pantry Management App`;

export async function POST(req) {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const data = await req.json();
  console.log("Data", data);
  console.log("Data:", JSON.stringify(data, null, 2));

  // Ensure data is an array
  if (!Array.isArray(data)) {
    console.error('Data is not an array:', data);
    return new NextResponse("Invalid data format", { status: 400 });
  }

  // Extract content from each object in the data array
  const extractedContents = data.map(item => item.content).filter(content => content);

  console.log("extractedContents:", JSON.stringify(extractedContents, null, 2));

  // Create messages array with system prompt and extracted contents
  const messages = [{ role: 'system', content: systemPrompt }];
  messages.push(...extractedContents.map(content => ({ role: 'user', content })));

  const completion = await openai.chat.completions.create({
    messages: messages,
    model: "meta-llama/llama-3.1-8b-instruct:free",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
