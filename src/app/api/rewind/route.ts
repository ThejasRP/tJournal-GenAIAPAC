import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { generateWithFallback } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try { decodedToken = await adminAuth.verifyIdToken(token); } 
    catch (e) { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }
    
    const uid = decodedToken.uid;
    const body = (await req.json().catch(() => null)) || {};
    const { days = 7 } = body;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    // Fetch entries
    const snapshot = await adminDb
      .collection("users")
      .doc(uid)
      .collection("entries")
      .where("createdAt", ">=", startDate)
      .where("createdAt", "<=", endDate)
      .orderBy("createdAt", "asc")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Not enough data to create a rewind for this period." }, { status: 400 });
    }

    const entries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        title: data.title,
        mood: data.mood,
        topics: data.topics,
        takeaways: data.takeaways,
        pull_quote: data.pull_quote,
        date: data.createdAt.toDate().toISOString()
      };
    });

    const systemInstruction = `You are an empathetic, insightful life coach and storyteller.
    The user wants a "tJournal Rewind" retrospective for the past ${days} days.
    Analyze their journal entries (provided below) and create a highly personalized, editorial-style summary.
    
    Return a JSON object STRICTLY following this schema:
    {
      "retrospective_title": "A creative, inspiring title capturing this chapter (e.g. 'The Week of Steady Momentum')",
      "narrative_summary": "A warm, 2-paragraph editorial story of their journey, growth, and challenges over this period.",
      "mood_arc": "A 1-sentence description of how their emotions evolved.",
      "top_themes": ["theme1", "theme2", "theme3"], // up to 4 recurring themes
      "breakthrough_moment": "The single most inspiring insight or realization from the period.",
      "unsung_win": "A subtle victory or positive shift they might have downplayed."
    }`;

    const response = await generateWithFallback(
      [{ role: 'user', parts: [{ text: JSON.stringify(entries) }] }],
      {
        systemInstruction,
        responseMimeType: "application/json",
      }
    );

    if (!response.text) throw new Error("Empty response from AI");

    const rewindData = JSON.parse(response.text);

    return NextResponse.json({ rewindData });
  } catch (error: any) {
    console.error("Rewind API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
