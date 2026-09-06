import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateWithFallback } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { audioUrl, uid } = await req.json();

    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!audioUrl) return NextResponse.json({ error: "Missing audio" }, { status: 400 });

    // Note: Gemini via fetch (or GenAI SDK) can take an audio URI or inline data.
    // For now, since it's a URL, we will instruct Gemini to transcribe and compile it.
    // In a fully robust scenario, we might download the file to a buffer and pass it inline
    // if the model cannot read external URLs directly. 
    
    // Download the audio temporarily to pass as inline data
    const audioRes = await fetch(audioUrl);
    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    
    const systemInstruction = `You are tJournal's AI audio processor. 
    You are given an audio recording of the user's voice log.
    Listen to the audio, transcribe it, analyze the sentiment, and compile it into a beautifully formatted diary entry using Markdown.
    Extract the following metadata directly from the transcription context:
    - title (a beautiful, evocative title)
    - mood (a short emoji-based string, e.g. "Peaceful 😌")
    - energy_level (number 1-10)
    - topics (an array of 1-3 keywords)
    - takeaways (an array of 1-3 actionable insights)
    - pull_quote (A profound, single-sentence quote capturing the essence of the entry)
    - content (the markdown diary entry itself, beautifully written and structured based on their voice log)
    
    Respond STRICTLY in valid JSON matching this structure:
    {
      "title": "...",
      "mood": "...",
      "energy_level": 5,
      "topics": ["...", "..."],
      "takeaways": ["...", "..."],
      "pull_quote": "...",
      "content": "..."
    }`;

    const contents = [{
      role: 'user',
      parts: [
        { text: "Here is my voice log for today. Please process it." },
        { inlineData: { data: base64Audio, mimeType: "audio/webm" } }
      ]
    }];

    const response = await generateWithFallback(contents, { 
      systemInstruction,
      responseMimeType: "application/json"
    });

    if (!response.text) throw new Error("Empty response from AI");
    
    const data = JSON.parse(response.text);

    const docRef = await adminDb.collection("users").doc(uid).collection("entries").add({
      ...data,
      audioUrl,
      createdAt: new Date(),
      type: "Voice"
    });

    return NextResponse.json({ entryId: docRef.id });
  } catch (error: any) {
    console.error("Voice Journal API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
