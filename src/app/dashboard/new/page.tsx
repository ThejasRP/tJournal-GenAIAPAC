"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, Loader2, BookHeart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { personas } from "@/config/personas";

type JournalType = "Hobby" | "Daily" | "Tip" | "Professional" | null;

interface Message {
  role: "user" | "model";
  parts: any[];
}

export default function NewJournalPage() {
  const [journalType, setJournalType] = useState<JournalType>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isCatharsisMode, setIsCatharsisMode] = useState(false);
  const [isClarityLens, setIsClarityLens] = useState(false);
  const [isBurning, setIsBurning] = useState(false);

  const handleCompileJournal = async () => {
    if (isCompiling || !user) return;
    
    if (isCatharsisMode) {
      setIsBurning(true);
      // Simulate burning time
      setTimeout(() => {
        setMessages([]);
        setJournalType(null);
        setIsBurning(false);
        setIsCatharsisMode(false);
        router.push("/dashboard");
        alert("Your thoughts have been released. 🔥");
      }, 2000);
      return;
    }

    setIsCompiling(true);
    setErrorMsg(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ messages, journalType, locationContext, clarityLens: isClarityLens })
      });
      if (!response.ok) {
        const text = await response.text();
        let errData;
        try { errData = JSON.parse(text); } catch { throw new Error(`Status ${response.status}: ${text}`); }
        throw new Error(errData?.error || "Compilation failed");
      }
      const { entryId } = await response.json();
      router.push(`/dashboard/journal/${entryId}`);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Something went wrong.");
      setIsCompiling(false);
    }
  };

  const [locationContext, setLocationContext] = useState<string | null>(null);

  const handleTypeSelect = async (type: JournalType) => {
    setJournalType(type);
    setMessages([
      { role: "model", parts: [{ text: `Welcome to your ${type} journal! What's on your mind today?` }] }
    ]);

    // Request Location asynchronously
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const res = await fetch(`/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          if (res.ok) {
            const data = await res.json();
            setLocationContext(`in ${data.city}, ${data.temp} and ${data.condition}`);
          }
        } catch (e) {
          console.error("Weather fetch failed", e);
        }
      }, (err) => console.warn("Geolocation denied/failed", err));
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !imageFile) || isLoading) return;
    setErrorMsg(null);

    let inlineData = undefined;
    if (imageFile) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(imageFile);
      const base64 = await base64Promise;
      inlineData = {
        inlineData: { data: base64, mimeType: imageFile.type }
      };
    }

    const parts: any[] = [];
    if (inputValue.trim()) parts.push({ text: inputValue });
    if (inlineData) parts.push(inlineData);

    const userMessage: Message = { role: "user", parts };
    
    // We add the user message locally, but keep a copy of the old messages 
    // in case the API fails so we can revert it or at least not duplicate it.
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const previousInputValue = inputValue;
    const previousImageFile = imageFile;
    
    setInputValue("");
    setImageFile(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          journalType,
          personaId
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errData;
        try { errData = JSON.parse(text); } catch { throw new Error(`Status ${response.status}: ${text}`); }
        throw new Error(errData?.error || "Failed to send message");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "model", parts: [{ text: data.text }] }]);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Failed to send message");
      // Revert the input so the user doesn't lose their draft
      setInputValue(previousInputValue);
      setImageFile(previousImageFile);
      // Remove the message we just optimistically added
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const [personaId, setPersonaId] = useState<string>("gentle_listener");
  
  if (!journalType) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-center">What kind of journal are we writing today?</h1>
        <div className="grid grid-cols-2 gap-4 max-w-lg w-full">
          {(["Daily", "Professional", "Hobby", "Tip"] as JournalType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              className="p-6 rounded-2xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 hover:border-crimson/50 transition-all text-xl font-medium cursor-pointer flex flex-col items-center justify-center space-y-2 group shadow-sm hover:shadow-md"
            >
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Dynamic Accent Color Based on Type
  const accentColor = 
    journalType === "Professional" ? "bg-blue-600" :
    journalType === "Hobby" ? "bg-green-600" :
    journalType === "Tip" ? "bg-yellow-600" : "bg-crimson";

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Ambient Aura Background */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-30 mix-blend-screen"
        animate={{
          background: isCompiling 
            ? "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.8) 0%, rgba(236,72,153,0.5) 40%, transparent 80%)"
            : isLoading
            ? "radial-gradient(circle at 50% 50%, rgba(220,20,60,0.8) 0%, rgba(220,20,60,0.2) 40%, transparent 70%)"
            : "radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%)",
          scale: isCompiling || isLoading ? [1, 1.05, 1] : 1
        }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* Header Badge & Actions */}
      <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex flex-wrap items-center gap-3 pointer-events-auto">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white ${accentColor} shadow-sm transform -rotate-2`}>
            {journalType} ✨
          </span>
          
          {/* Persona Selector Dropdown */}
          <select 
            value={personaId} 
            onChange={(e) => setPersonaId(e.target.value)}
            className="bg-background/80 backdrop-blur border border-foreground/10 text-foreground/80 text-sm rounded-xl px-3 py-1.5 font-medium outline-none cursor-pointer hover:bg-foreground/5 transition-colors"
          >
            {Object.values(personas).map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.label}
              </option>
            ))}
          </select>

          {/* Clarity Lens Toggle */}
          <button
            onClick={() => setIsClarityLens(!isClarityLens)}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer flex items-center space-x-2 ${
              isClarityLens ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-foreground/5 border-foreground/10 text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            <span>🧠</span>
            <span className="hidden sm:inline">Clarity Lens</span>
          </button>
          
          {/* Catharsis Mode Toggle */}
          <button
            onClick={() => setIsCatharsisMode(!isCatharsisMode)}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer flex items-center space-x-2 ${
              isCatharsisMode ? "bg-orange-500/20 border-orange-500/50 text-orange-500" : "bg-foreground/5 border-foreground/10 text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            <span>🔥</span>
            <span className="hidden sm:inline">Catharsis Mode</span>
          </button>
        </div>
        
        {messages.length > 2 && (
          <button 
            onClick={handleCompileJournal}
            disabled={isCompiling || isBurning}
            className={`pointer-events-auto flex items-center space-x-2 text-white px-5 py-2.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer font-bold ${
              isCatharsisMode ? "bg-orange-500 hover:bg-orange-400" : "bg-crimson"
            }`}
          >
            {(isCompiling || isBurning) ? <Loader2 className="animate-spin" size={20} /> : (isCatharsisMode ? <span>🔥</span> : <BookHeart size={20} />)}
            <span>{isCatharsisMode ? (isBurning ? "Burning..." : "Release & Burn") : "Compile Diary"}</span>
          </button>
        )}
      </div>

      {/* Burn Animation Overlay */}
      <AnimatePresence>
        {isBurning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-orange-600/20 backdrop-blur-sm flex flex-col items-center justify-center mix-blend-color-burn"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              className="text-8xl"
            >
              🔥
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 pt-24 space-y-6 custom-scrollbar relative">
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-2"
            >
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-2 font-bold cursor-pointer hover:text-white/80">&times;</button>
            </motion.div>
          )}
          {messages.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[75%] p-4 rounded-3xl leading-relaxed shadow-sm flex flex-col space-y-2 ${
                  msg.role === "user" 
                    ? "bg-foreground text-background rounded-tr-sm font-medium" 
                    : "bg-foreground/5 border border-foreground/10 rounded-tl-sm text-foreground"
                }`}
              >
                {msg.parts.map((part: any, i) => {
                  if (part.text) return <span key={i}>{part.text}</span>;
                  if (part.inlineData) {
                    return (
                      <img 
                        key={i} 
                        src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                        alt="Upload" 
                        className="rounded-xl max-w-full h-auto mt-2 object-contain shadow-sm border border-foreground/10 transform rotate-1 hover:rotate-0 transition-transform"
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="p-4 rounded-3xl bg-foreground/5 border border-foreground/10 rounded-tl-sm flex space-x-2 items-center shadow-sm">
              <div className="w-2.5 h-2.5 bg-crimson/60 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-2.5 h-2.5 bg-crimson/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-2.5 h-2.5 bg-crimson/60 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto relative flex flex-col space-y-2">
          {imageFile && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-crimson shadow-md origin-bottom-left">
              <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setImageFile(null)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 cursor-pointer hover:bg-black"
              >
                &times;
              </button>
            </motion.div>
          )}
          <div className="relative flex items-center shadow-sm hover:shadow-md transition-shadow rounded-full bg-foreground/5">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                }
              }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-4 text-foreground/50 hover:text-crimson transition-colors cursor-pointer p-2 rounded-full hover:bg-foreground/10"
            >
              <ImageIcon size={22} />
            </button>
            
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Jot down your thoughts..."
              className="w-full bg-transparent rounded-full pl-16 pr-16 py-4 focus:outline-none text-lg font-medium"
              disabled={isLoading || isCompiling}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !imageFile) || isLoading || isCompiling}
              className={`absolute right-3 p-2.5 rounded-full text-white transition-all ${
                (inputValue.trim() || imageFile) && !isLoading && !isCompiling ? accentColor + " hover:opacity-90 cursor-pointer shadow-md transform hover:scale-110 active:scale-95" : "bg-foreground/20 cursor-not-allowed"
              }`}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
