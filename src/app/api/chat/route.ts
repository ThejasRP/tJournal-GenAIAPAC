import { generateWithFallback } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

import { personas } from "@/config/personas";

export async function POST(req: NextRequest) {
  try {
    const { messages, journalType, personaId } = await req.json();

    const baseInstruction = `You are tJournal, a smart journaling assistant. The user is writing a "${journalType}" journal.`;
    const personaInstruction = personaId && personas[personaId] 
      ? personas[personaId].instruction 
      : "Guide them, reflect on their thoughts, and ask probing questions to help them write better. Keep your responses conversational, concise, and empathetic.";
    
    const systemInstruction = `${baseInstruction} ${personaInstruction} Do not use markdown headers unless necessary.`;

    const response = await generateWithFallback(
      messages,
      { systemInstruction }
    );

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
