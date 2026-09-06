import { generateWithFallback } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { query, uid } = await req.json();
    
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    // Fetch the user's past journal entries (limit to 50 for context size, though Gemini can handle more)
    const entriesSnapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('entries')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (entriesSnapshot.empty) {
      return NextResponse.json({ answer: "You don't have any journal entries yet. Start writing to build your memories!" });
    }

    const contextData = entriesSnapshot.docs.map(doc => {
      const data = doc.data();
      return `Date: ${data.createdAt.toDate().toISOString()}\nTitle: ${data.title}\nMood: ${data.mood || 'N/A'}\nTopics: ${(data.topics || []).join(', ')}\nContent:\n${data.content}`;
    }).join("\n\n---\n\n");

    const systemInstruction = `You are tJournal's intelligent memory assistant. 
    The user is asking a question about their past journal entries.
    Read the provided journal entries and answer the user's question empathetically and accurately based ONLY on the provided context.
    If the answer cannot be found in their journals, gently let them know.
    Do not use markdown headers unless necessary, keep it conversational.`;

    const prompt = `User's Question: ${query}\n\nUser's Journal History:\n\n${contextData}`;

    const response = await generateWithFallback(
      [{ role: 'user', parts: [{ text: prompt }] }],
      { systemInstruction }
    );

    if (!response.text) throw new Error("Empty response from AI");

    return NextResponse.json({ answer: response.text });
  } catch (error: any) {
    console.error("Ask API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
