import { generateWithFallback } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    const uid = decodedToken.uid;
    const body = (await req.json().catch(() => null)) || {};
    const { messages, journalType, locationContext, clarityLens } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    // Extract text from messages for compilation
    const textHistory = messages.map((m: any) => {
      const textParts = m.parts.filter((p: any) => p.text).map((p: any) => p.text).join(" ");
      return `${m.role.toUpperCase()}: ${textParts}`;
    }).join("\n\n");

    // Retrieve user's capsules to check for semantic matching
    const capsulesSnapshot = await adminDb.collection('users').doc(uid).collection('capsules').orderBy('createdAt', 'desc').limit(5).get();
    const availableCapsules = capsulesSnapshot.docs.map(doc => doc.data());
    
    let capsulesContext = "";
    if (availableCapsules.length > 0) {
      capsulesContext = "\n\nThe user has previously saved the following 'Time Capsules'. If the user's CURRENT emotional state or topic deeply resonates with one of these past capsules, you MUST unlock it by including the 'unlocked_capsule_id' in your response.\n";
      availableCapsules.forEach((c: any) => {
        capsulesContext += `- ID: ${c.entryId}, Trigger Mood: ${c.triggerMood}, Title: ${c.title}, ContentSnippet: ${c.content.substring(0, 200)}...\n`;
      });
    }

    let systemInstruction = `You are an expert ghostwriter. The user just had a multi-turn journaling session of type "${journalType}". 
    Read their chat history and compile it into a cohesive, beautifully written diary entry written from their first-person perspective. 
    Make it sound cute, reflective, and personal. 
    
    You must ALSO perform invisible mood tracking and actionable insights extraction.
    ${capsulesContext}
    
    Return a JSON object strictly following this schema:
    {
      "title": "A concise, fitting title for the entry",
      "content": "The full compiled diary entry formatted using markdown.",
      "mood": "A single word or short phrase describing the overall mood",
      "energy_level": 5, // integer 1-10
      "topics": ["topic1", "topic2"], // array of key themes discussed
      "takeaways": ["action item 1", "reflection 2"], // array of actionable insights or key takeaways
      "pull_quote": "A profound, single-sentence quote capturing the essence of the entry.",
      "unlocked_capsule_id": "Optional. The ID of the past capsule that matches the current mood/topic, if any."`;

    if (clarityLens) {
      systemInstruction += `,
      "clarity_reframe": {
        "pattern": "Optional. If the user exhibited cognitive distortions (e.g. catastrophizing, mind reading), name the pattern gently.",
        "reframe": "A compassionate, constructive alternative perspective to help rebalance the thought."
      }`;
    }
    
    systemInstruction += `\n    }`;

    const response = await generateWithFallback(
      [{ role: 'user', parts: [{ text: textHistory }] }],
      {
        systemInstruction,
        responseMimeType: "application/json",
      }
    );

    if (!response.text) throw new Error("Empty response from AI");

    const compiledData = JSON.parse(response.text);
    
    // Create new document in Firestore
    const docRef = adminDb.collection('users').doc(uid).collection('entries').doc();
    
    const docData: any = {
      id: docRef.id,
      title: compiledData.title,
      content: compiledData.content,
      type: journalType,
      mood: compiledData.mood || "Neutral",
      energy_level: compiledData.energy_level || 5,
      topics: compiledData.topics || [],
      takeaways: compiledData.takeaways || [],
      pull_quote: compiledData.pull_quote || "",
      locationContext: locationContext || null,
      createdAt: new Date(),
    };

    if (compiledData.clarity_reframe) {
      docData.clarity_reframe = compiledData.clarity_reframe;
    }

    if (compiledData.unlocked_capsule_id) {
      // Find the matched capsule data
      const matched = availableCapsules.find(c => c.entryId === compiledData.unlocked_capsule_id);
      if (matched) {
        docData.unlocked_capsule = {
          id: matched.entryId,
          title: matched.title,
          triggerMood: matched.triggerMood
        };
      }
    }
    
    const cleanPayload = JSON.parse(JSON.stringify(docData));
    await docRef.set(cleanPayload);

    return NextResponse.json({ entryId: docRef.id });
  } catch (error: any) {
    console.error("Compile API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
