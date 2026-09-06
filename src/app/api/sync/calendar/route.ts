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
    try { decodedToken = await adminAuth.verifyIdToken(token); } 
    catch (e) { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }
    
    const uid = decodedToken.uid;
    const body = (await req.json().catch(() => null)) || {};
    const { title } = body;

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const tokenDoc = await adminDb.collection("users").doc(uid).collection("tokens").doc("google").get();
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: "Google integration not connected. Please log out and log back in." }, { status: 403 });
    }
    const accessToken = tokenDoc.data()?.accessToken;

    // Block 30 minutes for reflection, starting tomorrow at 9 AM (simplification)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const end = new Date(tomorrow.getTime() + 30 * 60000);

    const event = {
      summary: `Reflection: ${title || "tJournal"}`,
      description: "Time blocked automatically by tJournal to reflect and act on your diary insights.",
      start: { dateTime: tomorrow.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" }
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Failed to create calendar event");

    return NextResponse.json({ success: true, eventLink: data.htmlLink });
  } catch (error: any) {
    console.error("Calendar Sync API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
