import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

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
    const { entryId, title, content, triggerMood } = body;

    if (!entryId || !triggerMood) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const docRef = adminDb.collection('users').doc(uid).collection('capsules').doc(entryId);
    const payload = {
      entryId,
      title: title || "Untitled Capsule",
      content: content || "",
      triggerMood,
      createdAt: new Date()
    };
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    
    await docRef.set(cleanPayload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Capsule API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
