"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Edit3, Download, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: any; // Firestore Timestamp
  mood?: string;
  energy_level?: number;
  topics?: string[];
  takeaways?: string[];
  audioUrl?: string;
  pull_quote?: string;
  locationContext?: string;
  clarity_reframe?: {
    pattern?: string;
    reframe?: string;
  };
  unlocked_capsule?: {
    id: string;
    title: string;
    triggerMood: string;
  };
}

export default function JournalEntryPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const quoteRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    
    const fetchEntry = async () => {
      try {
        const docRef = doc(db, "users", user.uid, "entries", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setEntry({ id: docSnap.id, ...docSnap.data() } as JournalEntry);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching entry:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEntry();
  }, [id, user, router]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportQuote = async (action: 'download' | 'share' = 'download') => {
    if (!quoteRef.current) {
      alert("Error: The hidden quote template is not loaded in the DOM.");
      return;
    }
    
    setIsExporting(true);
    try {
      const dataUrl = await toPng(quoteRef.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
      
      if (action === 'share' && navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `tJournal-Quote-${format(new Date(), "yyyy-MM-dd")}.png`, { type: 'image/png' });
        await navigator.share({
          title: `My tJournal Reflection`,
          text: 'A profound thought from my AI journal today 💭',
          files: [file]
        });
      } else if (action === 'share') {
        alert("Native sharing is not supported on this browser. Try downloading instead.");
      } else {
        const link = document.createElement("a");
        link.download = `tJournal-Quote-${format(new Date(), "yyyy-MM-dd")}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err: any) {
      console.error("Failed to export quote", err);
      alert(`Failed to export quote image: ${err.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-crimson border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!entry) return null;

  const dateStr = format(entry.createdAt.toDate(), "EEEE, MMMM do, yyyy");
  const timeStr = format(entry.createdAt.toDate(), "h:mm a");

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <button 
          onClick={() => router.push("/dashboard")}
          className="mb-8 flex items-center space-x-2 text-foreground/60 hover:text-crimson transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>

        {/* Physical Diary Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          className="relative bg-[#fffdf5] dark:bg-[#1a1a1a] rounded-r-3xl rounded-l-xl shadow-2xl min-h-[70vh] p-8 md:p-14 border border-foreground/10"
        >
          {/* Binding Graphic */}
          <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-black/20 to-transparent rounded-l-xl" />
          <div className="absolute top-4 left-3 bottom-4 flex flex-col justify-between py-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-4 h-6 rounded-full border-2 border-foreground/30 bg-background/50 shadow-inner" />
            ))}
          </div>

          <div className="pl-6 font-handwriting prose prose-lg dark:prose-invert prose-crimson max-w-none text-xl sm:text-2xl leading-relaxed text-foreground/90">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-crimson/20 pb-4 mb-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-crimson mb-2 m-0 flex items-center gap-3">
                  <Edit3 className="text-crimson/50" size={32} />
                  {entry.title}
                </h1>
                <div className="text-foreground/50 text-xl flex flex-wrap gap-x-4 gap-y-2 mt-2">
                  <span>{dateStr}</span>
                  <span>•</span>
                  <span>{timeStr}</span>
                  {entry.locationContext && (
                    <>
                      <span>•</span>
                      <span>{entry.locationContext}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex flex-wrap gap-2 justify-end">
                <span className="px-3 py-0.5 border border-dashed border-crimson/50 rounded-full text-crimson text-base opacity-70">
                  {entry.type}
                </span>
                {entry.mood && (
                  <span className="px-3 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-base">
                    Mood: {entry.mood}
                  </span>
                )}
                {entry.energy_level && (
                  <span className="px-3 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full text-base">
                    Energy: {entry.energy_level}/10
                  </span>
                )}
              </div>
            </div>

            {/* Topics Tags */}
            {entry.topics && entry.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {entry.topics.map((topic: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-foreground/5 text-foreground/60 rounded-md text-sm">
                    #{topic}
                  </span>
                ))}
              </div>
            )}

            {/* Audio Playback */}
            {entry.audioUrl && (
              <div className="mb-8 p-4 bg-blue-500/10 rounded-2xl flex items-center gap-4">
                <audio controls src={entry.audioUrl} className="w-full h-10 outline-none" />
              </div>
            )}

            {/* Unlocked Capsule Alert */}
            {entry.unlocked_capsule && (
              <div className="mb-8 p-6 bg-purple-500/10 border-l-4 border-purple-500 rounded-r-xl cursor-pointer hover:bg-purple-500/20 transition-all shadow-sm" onClick={() => router.push(`/dashboard/journal/${entry.unlocked_capsule?.id}`)}>
                <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 m-0 mb-2 flex items-center gap-2">
                  ⏳ Time Capsule Unlocked!
                </h3>
                <p className="text-foreground/80 text-base mb-0">
                  Your entry matched a past capsule: <strong>"{entry.unlocked_capsule.title}"</strong> (Mood: {entry.unlocked_capsule.triggerMood}). Click to revisit it.
                </p>
              </div>
            )}

            {/* Markdown Content */}
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({children}) => <p className="mb-6">{children}</p>,
                li: ({children}) => <li className="mb-2">{children}</li>,
              }}
            >
              {entry.content}
            </ReactMarkdown>

            {/* Clarity Lens Reframe */}
            {entry.clarity_reframe?.pattern && entry.clarity_reframe?.reframe && (
              <div className="mt-12 p-6 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl">
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 m-0 mb-2 flex items-center gap-2">
                  🧠 Clarity Lens
                </h3>
                <p className="text-foreground/70 text-sm mb-4">
                  <strong>Noticed Pattern:</strong> {entry.clarity_reframe.pattern}
                </p>
                <p className="text-foreground/90 font-medium italic text-lg leading-relaxed">
                  " {entry.clarity_reframe.reframe} "
                </p>
              </div>
            )}

            {/* Takeaways Section */}
            {entry.takeaways && entry.takeaways.length > 0 && (
              <div className="mt-12 p-6 bg-crimson/5 border-l-4 border-crimson rounded-r-xl">
                <h3 className="text-2xl font-bold text-crimson m-0 mb-4 flex items-center gap-2">
                  ✨ Key Takeaways
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-foreground/80 m-0">
                  {entry.takeaways.map((takeaway: string, i: number) => (
                    <li key={i}>{takeaway}</li>
                  ))}
                </ul>
                
                <div className="mt-6 flex flex-wrap gap-4">
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      try {
                        const token = await user.getIdToken();
                        const res = await fetch("/api/sync/tasks", {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({ takeaways: entry.takeaways })
                        });
                        if (res.ok) alert("Tasks successfully added to Google Tasks!");
                        else {
                          const data = await res.json();
                          alert(`Failed to add tasks: ${data.error || 'Please ensure Google Tasks API is enabled in your Google Cloud Console.'}`);
                        }
                      } catch(e) { console.error(e); }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full text-sm transition-colors cursor-pointer"
                  >
                    <span>Add to Google Tasks</span>
                  </button>
                  
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      try {
                        const token = await user.getIdToken();
                        const res = await fetch("/api/sync/calendar", {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({ title: entry.title })
                        });
                        if (res.ok) alert("30 min reflection block added to Google Calendar for tomorrow at 9 AM!");
                        else {
                          const data = await res.json();
                          alert(`Failed to add event: ${data.error || 'Please ensure Google Calendar API is enabled in your Google Cloud Console.'}`);
                        }
                      } catch(e) { console.error(e); }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-full text-sm transition-colors cursor-pointer"
                  >
                    <span>Block Time in Calendar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Export Buttons */}
            {entry.pull_quote && (
              <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  onClick={() => handleExportQuote('download')}
                  disabled={isExporting}
                  className={`flex items-center justify-center space-x-2 px-6 py-3 bg-foreground text-background font-bold rounded-full shadow-lg transition-all ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105'}`}
                >
                  <Download size={20} />
                  <span>{isExporting ? 'Processing...' : 'Save Quote Card'}</span>
                </button>
                <button 
                  onClick={() => handleExportQuote('share')}
                  disabled={isExporting}
                  className={`flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white font-bold rounded-full shadow-lg transition-all ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105'}`}
                >
                  <Sparkles size={20} />
                  <span>{isExporting ? 'Processing...' : 'Share Quote'}</span>
                </button>
                <button 
                  onClick={async () => {
                    if (!user) return;
                    const btn = document.getElementById("capsule-btn");
                    if (btn) btn.innerText = "Saving...";
                    try {
                      const token = await user.getIdToken();
                      await fetch("/api/capsule", {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          entryId: id,
                          title: entry.title,
                          content: entry.content,
                          triggerMood: entry.mood
                        })
                      });
                      if (btn) {
                        btn.innerText = "Capsule Saved! ⏳";
                        btn.classList.add("bg-green-500", "text-white");
                      }
                    } catch (e) {
                      if (btn) btn.innerText = "Failed";
                    }
                  }}
                  id="capsule-btn"
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-foreground/5 text-foreground font-bold rounded-full border border-foreground/10 hover:bg-foreground/10 transition-all cursor-pointer"
                >
                  ⏳ Save as Time Capsule
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Hidden Quote Card for Export */}
        {entry.pull_quote && (
          <div style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}>
            <div 
              ref={quoteRef} 
              className="w-[1080px] h-[1080px] bg-gradient-to-br from-[#111111] to-[#222222] text-white p-24 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden font-handwriting"
            >
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-crimson/20 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />
              
              <p className="text-6xl md:text-7xl leading-tight mb-16 relative z-10 font-bold">
                "{entry.pull_quote}"
              </p>
              
              <div className="relative z-10 flex flex-col items-center mt-12 opacity-80">
                <div className="w-16 h-1 bg-crimson mb-6 rounded-full" />
                <p className="text-3xl font-sans tracking-widest uppercase font-bold text-crimson">tJournal</p>
                <p className="text-2xl mt-4 font-sans">{dateStr}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
