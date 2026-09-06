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
    const { takeaways } = body;

    if (!takeaways || !Array.isArray(takeaways)) {
      return NextResponse.json({ error: "Missing takeaways" }, { status: 400 });
    }

    // Retrieve the Google access token
    const tokenDoc = await adminDb.collection("users").doc(uid).collection("tokens").doc("google").get();
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: "Google integration not connected. Please log out and log back in." }, { status: 403 });
    }
    const accessToken = tokenDoc.data()?.accessToken;

    // First get the default tasklist
    const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const listsData = await listsRes.json();
    if (!listsRes.ok) throw new Error(listsData.error?.message || "Failed to fetch task lists");
    
    const taskListId = listsData.items[0].id;

    // Insert each takeaway as a task
    for (const task of takeaways) {
      const taskRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: task,
          notes: "Generated from tJournal"
        })
      });
      if (!taskRes.ok) throw new Error("Failed to insert task");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Tasks Sync API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
