"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ChevronLeft, Sparkles, Download, Quote } from "lucide-react";
import React from "react";
import { toPng } from "html-to-image";

function RewindContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const days = searchParams.get("days") || "7";
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewindData, setRewindData] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const exportRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchRewind = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/rewind", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ days })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Failed to generate rewind");
        
        setRewindData(data.rewindData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRewind();
  }, [user, days]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (action: 'download' | 'share' = 'download') => {
    if (!exportRef.current) {
      alert("Error: The hidden export template is not loaded in the DOM. Please refresh the page.");
      return;
    }
    
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
      
      if (action === 'share' && navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `tJournal-Rewind-${days}Days.png`, { type: 'image/png' });
        await navigator.share({
          title: `My tJournal Rewind (${days} Days)`,
          text: 'Check out my AI-generated journal retrospective! 🧠✨',
          files: [file]
        });
      } else if (action === 'share') {
        alert("Native sharing is not supported on this browser. Try downloading instead.");
      } else {
        const link = document.createElement("a");
        link.download = `tJournal-Rewind-${days}Days.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err: any) {
      console.error("Failed to export rewind", err);
      alert(`Failed to export: ${err.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, 3));
  const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  if (loading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-black text-white p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 w-[40rem] h-[40rem] bg-purple-500/20 rounded-full blur-[100px] -z-10 translate-x-[-50%] translate-y-[-50%] animate-pulse" />
        <Sparkles className="text-purple-400 mb-6 animate-spin-slow" size={48} />
        <h2 className="text-3xl font-bold mb-4">Generating your Rewind...</h2>
        <p className="text-white/60">Our AI is analyzing your past {days} days of reflections.</p>
      </div>
    );
  }

  if (error || !rewindData) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-background p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Oops!</h2>
        <p className="text-foreground/70 mb-8">{error}</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-foreground text-background rounded-full">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const slides = [
    // Slide 0: Title
    <div key="slide0" className="w-full h-full flex flex-col justify-center items-center text-center px-8">
      <h3 className="text-purple-400 tracking-widest uppercase font-bold mb-4">Your Past {days} Days</h3>
      <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
        {rewindData.retrospective_title}
      </h1>
      <p className="text-xl text-white/60 max-w-xl">
        A chapter of your life, analyzed and summarized.
      </p>
    </div>,

    // Slide 1: Mood Arc & Themes
    <div key="slide1" className="w-full h-full flex flex-col justify-center items-start px-8 md:px-24">
      <h2 className="text-4xl font-bold mb-12">The Emotional Arc</h2>
      <p className="text-2xl md:text-3xl font-light text-white/90 leading-relaxed border-l-4 border-purple-500 pl-6 mb-16">
        "{rewindData.mood_arc}"
      </p>
      
      <h3 className="text-xl text-white/50 mb-6 uppercase tracking-wider">Top Themes</h3>
      <div className="flex flex-wrap gap-4">
        {rewindData.top_themes?.map((theme: string, i: number) => (
          <span key={i} className="px-6 py-3 bg-white/10 rounded-full text-xl font-medium border border-white/5 backdrop-blur-md">
            #{theme}
          </span>
        ))}
      </div>
    </div>,

    // Slide 2: Breakthroughs (Caveat)
    <div key="slide2" className="w-full h-full flex flex-col justify-center items-center text-center px-8">
      <Quote className="text-pink-400 opacity-50 mb-8" size={64} />
      <div className="font-handwriting text-4xl md:text-5xl text-white leading-relaxed max-w-3xl mb-12">
        <span className="text-pink-300">Breakthrough: </span> {rewindData.breakthrough_moment}
      </div>
      <div className="font-handwriting text-3xl md:text-4xl text-white/70 leading-relaxed max-w-3xl">
        <span className="text-purple-300">Unsung Win: </span> {rewindData.unsung_win}
      </div>
    </div>,

    // Slide 3: Summary & Export
    <div key="slide3" className="w-full h-full flex flex-col justify-center items-center px-8 md:px-24">
      <h2 className="text-3xl font-bold mb-8 w-full text-left">The Narrative</h2>
      <div className="prose prose-invert prose-lg max-w-none text-white/80 leading-relaxed mb-12">
        {rewindData.narrative_summary.split('\n').map((paragraph: string, idx: number) => (
          <p key={idx} className="mb-4">{paragraph}</p>
        ))}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <button 
          onClick={() => handleExport('download')}
          disabled={isExporting}
          className={`flex items-center justify-center space-x-2 px-8 py-4 bg-white text-black font-bold rounded-full shadow-2xl transition-transform ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <Download size={20} />
          <span>{isExporting ? 'Processing...' : 'Save Snapshot'}</span>
        </button>
        <button 
          onClick={() => handleExport('share')}
          disabled={isExporting}
          className={`flex items-center justify-center space-x-2 px-8 py-4 bg-purple-500 text-white font-bold rounded-full shadow-2xl transition-transform ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <Sparkles size={20} />
          <span>{isExporting ? 'Processing...' : 'Share Rewind'}</span>
        </button>
      </div>
    </div>
  ];

  return (
    <div className="flex-1 h-full bg-[#0a0a0a] text-white relative overflow-hidden flex flex-col">
      {/* Dynamic Backgrounds based on slide */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000 z-0">
        <div className={`absolute top-0 right-0 w-[50rem] h-[50rem] rounded-full blur-[120px] mix-blend-screen opacity-30 transition-colors duration-1000 ${
          currentSlide === 0 ? "bg-purple-600" :
          currentSlide === 1 ? "bg-blue-600" :
          currentSlide === 2 ? "bg-pink-600" :
          "bg-emerald-600"
        } translate-x-1/3 -translate-y-1/3`} />
        
        <div className={`absolute bottom-0 left-0 w-[50rem] h-[50rem] rounded-full blur-[120px] mix-blend-screen opacity-20 transition-colors duration-1000 ${
          currentSlide === 0 ? "bg-pink-600" :
          currentSlide === 1 ? "bg-emerald-600" :
          currentSlide === 2 ? "bg-orange-600" :
          "bg-purple-600"
        } -translate-x-1/3 translate-y-1/3`} />
      </div>

      {/* Header / Nav */}
      <div className="relative z-20 flex justify-between items-center p-6 lg:p-8">
        <button onClick={() => router.push("/dashboard")} className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft size={20} /> Dashboard
        </button>
        
        {/* Progress Dots */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === currentSlide ? "w-8 bg-white" : "w-2 bg-white/20"}`} />
          ))}
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="absolute inset-0 flex"
          >
            {slides[currentSlide]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Navigation Controls */}
      <div className="relative z-20 flex justify-between items-center p-6 lg:p-12">
        <button 
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`p-4 rounded-full backdrop-blur-md border border-white/10 transition-all ${currentSlide === 0 ? "opacity-0 pointer-events-none" : "bg-white/5 hover:bg-white/20"}`}
        >
          <ChevronLeft size={32} />
        </button>
        
        <button 
          onClick={nextSlide}
          disabled={currentSlide === 3}
          className={`p-4 rounded-full backdrop-blur-md border border-white/10 transition-all ${currentSlide === 3 ? "opacity-0 pointer-events-none" : "bg-white/5 hover:bg-white/20"}`}
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Hidden Export Card */}
      <div style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}>
        <div ref={exportRef} className="w-[1080px] h-[1920px] bg-gradient-to-br from-[#0a0a0a] to-[#1a1a2e] text-white p-16 flex flex-col relative overflow-hidden font-sans">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/30 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-pink-600/20 rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3" />
          
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <h3 className="text-purple-400 tracking-widest uppercase font-bold text-3xl mb-4">tJournal Rewind • {days} Days</h3>
            <h1 className="text-8xl font-black mb-16 leading-tight">{rewindData.retrospective_title}</h1>
            
            <div className="mb-16 border-l-8 border-purple-500 pl-8">
              <p className="text-4xl font-light text-white/90 leading-relaxed">
                {rewindData.mood_arc}
              </p>
            </div>
            
            <div className="font-handwriting text-5xl text-pink-300 leading-relaxed mb-16">
              " {rewindData.breakthrough_moment} "
            </div>

            <div className="flex flex-wrap gap-4 mt-auto">
              {rewindData.top_themes?.map((theme: string, i: number) => (
                <span key={i} className="px-6 py-3 bg-white/10 rounded-full text-2xl font-medium">
                  #{theme}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function RewindPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#0a0a0a]" />}>
      <RewindContent />
    </Suspense>
  );
}
