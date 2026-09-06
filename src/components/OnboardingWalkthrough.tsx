"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, BookHeart, Sparkles, X } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface Props {
  onComplete: () => void;
}

export default function OnboardingWalkthrough({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    setIsFinishing(true);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), {
          hasSeenOnboarding: true
        }, { merge: true });
      } catch (e) {
        console.error("Failed to update onboarding status", e);
      }
    }
    onComplete();
  };

  const slides = [
    {
      title: "Welcome to tJournal ✨",
      description: "Your AI-powered safe space. Whether you prefer to type out your thoughts or simply speak your mind using Voice Logging, tJournal listens without judgment.",
      icon: <Mic className="text-blue-400" size={64} />,
      color: "bg-blue-500/20",
      accent: "text-blue-400"
    },
    {
      title: "Beautifully Compiled Diaries",
      description: "Don't worry about grammar or structure. Vent freely, and our AI will ghostwrite your chaotic thoughts into a cohesive, deeply personal diary entry. It also tracks your mood invisibly.",
      icon: <BookHeart className="text-pink-400" size={64} />,
      color: "bg-pink-500/20",
      accent: "text-pink-400"
    },
    {
      title: "Catharsis Mode 🔥",
      description: "Sometimes you just need to scream into the void. Toggle Catharsis Mode before writing to bypass our database entirely. After you vent, your entry will literally burn away into pixels. Nothing is saved.",
      icon: <div className="text-7xl">🔥</div>,
      color: "bg-orange-500/20",
      accent: "text-orange-500"
    },
    {
      title: "Clarity Lens 🧠",
      description: "Stuck in a thought spiral? Toggle Clarity Lens on. When compiling your diary, our AI will gently identify cognitive distortions (like catastrophizing) and offer a compassionate, CBT-style reframe to help you reset.",
      icon: <div className="text-7xl">🧠</div>,
      color: "bg-indigo-500/20",
      accent: "text-indigo-400"
    },
    {
      title: "Time Capsules & Rewinds ⏳",
      description: "Save profound moments as Time Capsules to unlock them on future days when you feel similar emotions. At the end of the month, generate a 'Spotify Wrapped' style visual Rewind of your mental journey.",
      icon: <Sparkles className="text-purple-400" size={64} />,
      color: "bg-purple-500/20",
      accent: "text-purple-400"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col"
      >
        <button 
          onClick={handleFinish}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10 p-2"
        >
          <X size={24} />
        </button>

        <div className="relative h-64 sm:h-80 w-full flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 ${slides[step].color} transition-colors duration-500`}
            />
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              transition={{ type: "spring", damping: 15 }}
              className="relative z-10 bg-[#1a1a1a] p-8 rounded-full shadow-2xl border border-white/5"
            >
              {slides[step].icon}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-8 sm:p-12 flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h2 className={`text-3xl font-black ${slides[step].accent}`}>
                {slides[step].title}
              </h2>
              <p className="text-lg text-white/70 leading-relaxed max-w-md mx-auto">
                {slides[step].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 w-full flex items-center justify-between">
            <div className="flex space-x-2">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-500 ${i === step ? "w-8 bg-white" : "w-2 bg-white/20"}`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (step === slides.length - 1) handleFinish();
                else setStep(prev => prev + 1);
              }}
              disabled={isFinishing}
              className="px-8 py-3 bg-white text-black font-bold rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95 disabled:opacity-50"
            >
              {step === slides.length - 1 ? "Let's Begin" : "Next"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
