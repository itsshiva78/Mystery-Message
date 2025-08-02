import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Fallback questions in case of API failure
const fallbackQuestions = [
  "What's your favorite movie||How's the weather today||Got any fun plans",
  "What music do you like||Had any good food lately||Seen any good shows",
  "How was your weekend||What makes you happy||Tell me about your day"
];

// Add this helper function at the top level
const cleanAndExtractQuestions = (text: string): string => {
  // Remove any text before the first question and after the last question
  const cleaned = text.replace(/^[^a-zA-Z0-9]*/, '').replace(/[^a-zA-Z0-9?]*$/, '');
  // Split by || to check format
  const parts = cleaned.split('||');
  // Take only the first 3 parts that look like questions
  const questions = parts
    .filter(q => q.trim().endsWith('?') || q.length >= 10)
    .slice(0, 3)
    .join('||');
  return questions;
};

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GEMINI_API) {
    return NextResponse.json(
      { summary: fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)] },
      { status: 200 }
    );
  }

  try {
    const prompt = `You are a friendly conversation starter. Create exactly 3 short questions.
    Format them exactly like this example, with || between questions and no other characters:
    How's your day going||What's for lunch||Any weekend plans
    
    Rules:
    - Must be exactly 3 questions
    - Each between 15-40 characters
    - Simple and casual tone
    - No quotes or special characters`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const cleanText = text
      .replace(/["""''{}]/g, '')
      .replace(/\n/g, '')
      .trim();
    
    const processedText = cleanAndExtractQuestions(cleanText);
    const questions = processedText.split('||');
    
    // Validation
    if (questions.length !== 3 || questions.some(q => q.length < 10)) {
      const fallback = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      return NextResponse.json({ summary: cleanAndExtractQuestions(fallback) });
    }

    return NextResponse.json({ summary: processedText });
  } catch (error) {
    console.error("Suggestion generation error:", error);
    return NextResponse.json(
      { summary: fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)] },
      { status: 200 }
    );
  }
}