"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Brain, BookHeart, Search, ArrowRight, LogIn, Mic, Calendar, Download } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/tasks');
      provider.setCustomParameters({ prompt: 'consent' });
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (token && result.user) {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        await setDoc(doc(db, "users", result.user.uid, "tokens", "google"), {
          accessToken: token,
          updatedAt: new Date()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-crimson border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-crimson/30 overflow-x-hidden font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-xl bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-crimson to-rose-400 flex items-center justify-center shadow-lg shadow-crimson/20">
            <BookHeart className="text-white" size={16} />
          </div>
          <span className="text-xl font-bold tracking-tighter">tJournal</span>
        </div>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <LogIn size={16} />
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 flex flex-col items-center text-center">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-crimson/20 rounded-full blur-[120px] -z-10 mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-blue-600/20 rounded-full blur-[100px] -z-10 mix-blend-screen animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80 mb-8 backdrop-blur-md">
            <Sparkles size={16} className="text-crimson" />
            <span className="tracking-wide uppercase text-xs font-bold">The Next-Gen AI Diary</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-black tracking-tighter mb-8 leading-[1.1]">
            Journaling, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson via-rose-400 to-orange-400">
              reinvented by AI.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto leading-relaxed font-light mb-12">
            Speak or chat your thoughts. We instantly analyze your mood, extract actionable insights, and compile it into a beautifully formatted physical diary.
          </p>

          <button
            onClick={handleSignIn}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full text-lg font-bold overflow-hidden transition-transform hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-2">
              Start Your Journey <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </motion.div>
      </div>

      {/* Feature Grid */}
      <div className="relative py-24 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">More than just a blank page.</h2>
            <p className="text-xl text-white/50 max-w-2xl mx-auto">
              tJournal completely removes the friction from journaling by acting as your empathetic listener and automated ghostwriter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group"
            >
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-3xl">
                🔥
              </div>
              <h3 className="text-2xl font-bold mb-3">Catharsis Mode</h3>
              <p className="text-white/60 leading-relaxed">
                Sometimes you just need to scream. Vent unfiltered feelings and watch them literally burn away into pixels without ever touching the database.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group"
            >
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-3xl">
                🧠
              </div>
              <h3 className="text-2xl font-bold mb-3">Clarity Lens</h3>
              <p className="text-white/60 leading-relaxed">
                Stuck in a spiral? Our AI detects cognitive distortions (like catastrophizing) and gently appends a compassionate, CBT-style reframe.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group"
            >
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="text-purple-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Time Capsules & Rewind</h3>
              <p className="text-white/60 leading-relaxed">
                Save profound emotional states as capsules. Generate beautiful, shareable "Spotify Wrapped" style visual retrospectives of your past month.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group"
            >
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mic className="text-blue-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Voice Logs</h3>
              <p className="text-white/60 leading-relaxed">
                Too tired to type? Hit record. We transcribe, analyze, and beautifully ghostwrite your spoken thoughts into a perfect diary entry.
              </p>
            </motion.div>

            {/* Feature 5 (Wide) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-crimson/20 to-rose-500/10 border border-crimson/20 p-8 rounded-3xl hover:border-crimson/40 transition-colors group lg:col-span-2 relative overflow-hidden"
            >
              <div className="absolute right-[-10%] top-[-20%] w-64 h-64 bg-crimson/30 blur-[80px] rounded-full" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-crimson/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Calendar className="text-crimson" size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Google Workspace Sync</h3>
                <p className="text-white/80 leading-relaxed max-w-xl text-lg">
                  Every entry extracts actionable takeaways. With one click, push your tasks to Google Tasks and automatically block out reflection time in your Google Calendar.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="py-32 px-6 text-center border-t border-white/5 bg-[#0a0a0a]">
        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">Ready to clear your mind?</h2>
        <button
          onClick={handleSignIn}
          className="px-10 py-5 bg-crimson hover:bg-rose-600 text-white rounded-full text-xl font-bold shadow-2xl shadow-crimson/20 transition-all hover:scale-105 active:scale-95"
        >
          Sign in with Google
        </button>
      </div>

    </div>
  );
}
