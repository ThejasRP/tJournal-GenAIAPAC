"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Sparkles, Mic, Square } from "lucide-react";
import OnboardingWalkthrough from "@/components/OnboardingWalkthrough";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      const checkOnboarding = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().hasSeenOnboarding) {
            setShowOnboarding(false);
          } else {
            setShowOnboarding(true);
          }
        } catch (e) {
          console.error("Failed to check onboarding status", e);
        } finally {
          setCheckingOnboarding(false);
        }
      };
      checkOnboarding();
    } else if (!loading && !user) {
      setCheckingOnboarding(false);
    }
  }, [user, loading]);

  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to use Voice Journal.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    if (!user) return;
    setIsUploading(true);
    try {
      // Import here to avoid client boundary issues if needed, but it's fine
      const { storage } = await import("@/lib/firebase");
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      
      const filename = `voice_${Date.now()}.webm`;
      const storageRef = ref(storage, `users/${user.uid}/audio/${filename}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Call the API route
      const res = await fetch("/api/voice-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: downloadURL, uid: user.uid })
      });
      
      if (!res.ok) throw new Error("Voice journal processing failed");
      
      const { entryId } = await res.json();
      router.push(`/dashboard/journal/${entryId}`);
      
    } catch (err) {
      console.error("Error uploading audio:", err);
      alert("Failed to process voice journal.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleAsk = async () => {
    if (!query.trim() || isAsking || !user) return;
    
    setIsAsking(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, uid: user.uid })
      });
      if (!res.ok) throw new Error("Failed to get answer");
      const data = await res.json();
      setAnswer(data.answer);
    } catch (error) {
      console.error(error);
      setAnswer("Sorry, I couldn't search your journal right now.");
    } finally {
      setIsAsking(false);
    }
  };

  if (loading || checkingOnboarding || !user) return null;

  return (
    <div className="flex-1 h-full flex flex-col p-8 lg:p-16 overflow-y-auto bg-background/50">
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWalkthrough onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
      <div className="max-w-4xl mx-auto w-full space-y-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Good to see you, <span className="text-crimson">{user.displayName?.split(" ")[0]}</span>.
          </h1>
          <p className="text-foreground/60 text-lg">
            Ready to capture your thoughts today?
          </p>
        </motion.div>

        {/* Semantic Search (Ask tJournal) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-background rounded-3xl p-8 border border-foreground/10 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex items-center space-x-2 mb-6">
            <Sparkles className="text-crimson" size={24} />
            <h2 className="text-2xl font-bold">Ask tJournal</h2>
          </div>
          <p className="text-foreground/60 mb-6">
            Search your past memories, moods, and reflections using natural language.
          </p>
          
          <div className="relative flex items-center shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-foreground/5 border border-foreground/10">
            <Search className="absolute left-4 text-foreground/50" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="e.g. What usually helps me calm down when I'm stressed?"
              className="w-full bg-transparent rounded-2xl pl-12 pr-16 py-4 focus:outline-none text-lg font-medium"
              disabled={isAsking}
            />
            <button
              onClick={handleAsk}
              disabled={!query.trim() || isAsking}
              className={`absolute right-2 px-4 py-2 rounded-xl text-white font-medium transition-all ${
                query.trim() && !isAsking ? "bg-crimson hover:bg-crimson/90 cursor-pointer shadow-md" : "bg-foreground/20 cursor-not-allowed"
              }`}
            >
              {isAsking ? <Loader2 size={20} className="animate-spin" /> : "Ask"}
            </button>
          </div>

          {answer && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 p-6 bg-crimson/5 rounded-2xl border border-crimson/20"
            >
              <div className="flex items-start space-x-3">
                <Sparkles className="text-crimson shrink-0 mt-1" size={20} />
                <p className="text-foreground/90 leading-relaxed text-lg">
                  {answer}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Voice Logging UI */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background rounded-3xl p-8 border border-foreground/10 shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center space-y-4"
        >
          <div className="flex items-center space-x-2">
            <Mic className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold">Voice Journal</h2>
          </div>
          <p className="text-foreground/60 max-w-md">
            Speak your thoughts aloud. We'll automatically transcribe, analyze, and compile it into a diary entry.
          </p>
          
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
            className={`mt-4 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:shadow-xl cursor-pointer ${
              isRecording 
                ? "bg-red-500 animate-pulse scale-110" 
                : isUploading 
                ? "bg-blue-400 cursor-not-allowed" 
                : "bg-blue-600 hover:scale-105 hover:bg-blue-500"
            }`}
          >
            {isUploading ? <Loader2 size={32} className="animate-spin" /> : (isRecording ? <Square size={28} className="fill-white" /> : <Mic size={32} />)}
          </button>
          {isRecording && <p className="text-red-500 font-medium animate-pulse">Recording...</p>}
          {isUploading && <p className="text-blue-500 font-medium animate-pulse">Processing your voice log...</p>}
        </motion.div>

        {/* tJournal Rewind Trigger */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl p-8 border border-purple-500/20 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="text-purple-500" size={24} />
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">tJournal Rewind</h2>
          </div>
          <p className="text-foreground/70 mb-8 max-w-lg">
            Generate an AI-powered retrospective of your emotional journey, recurring themes, and hidden victories over the past week or month.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push("/dashboard/rewind?days=7")}
              className="px-6 py-3 bg-foreground text-background font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              Rewind Last 7 Days
            </button>
            <button
              onClick={() => router.push("/dashboard/rewind?days=30")}
              className="px-6 py-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold rounded-full border border-purple-500/20 hover:bg-purple-500/20 transition-all cursor-pointer"
            >
              Rewind Last 30 Days
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
