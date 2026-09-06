"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  LogOut, 
  Book,
  ChevronDown,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { groupEntries, JournalEntry } from "@/lib/history";

import { useAuth } from "@/context/AuthContext";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Expand state for accordion (dummy simplistic state for now)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "CURRENT_YEAR": true,
    "September": true,
  });
  
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "entries"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries: JournalEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
      setEntries(fetchedEntries);
      
      // Auto-expand current month if entries exist
      if (fetchedEntries.length > 0) {
        const currentMonth = fetchedEntries[0].createdAt.toLocaleString('default', { month: 'long' });
        setExpanded(prev => ({ ...prev, [currentMonth]: true, "CURRENT_YEAR": true }));
      }
    });

    return () => unsubscribe();
  }, [user]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const grouped = groupEntries(entries);

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? "80px" : "320px" }}
      className="h-full border-r border-foreground/10 bg-background/50 backdrop-blur-md flex flex-col transition-all duration-300 relative z-20"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <AnimatePresence mode="popLayout">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-2xl font-black tracking-tight cursor-default"
            >
              t<span className="text-crimson">Journal</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-foreground/10 text-foreground/70 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>

      {/* New Journal Button */}
      <div className="px-4 mb-6">
        <button 
          onClick={() => router.push("/dashboard/new")}
          className="w-full flex items-center justify-center space-x-2 bg-crimson text-white p-3 rounded-xl hover:bg-crimson/90 transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={20} />
          {!isCollapsed && <span className="font-medium">New Journal</span>}
        </button>
      </div>

      {/* History Area */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        {!isCollapsed && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider px-2">History</h3>
            
            <div className="space-y-2">
              {entries.length === 0 ? (
                <div className="px-2 py-4 text-center">
                  <p className="text-sm text-foreground/50 mb-2">No entries yet.</p>
                  <p className="text-xs text-foreground/40 italic">Click "New Journal" to capture your first thought.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([year, months]) => (
                  <div key={year} className="space-y-1">
                    {/* Only show Year if it's not the dummy CURRENT_YEAR */}
                    {year !== "CURRENT_YEAR" && (
                      <div 
                        onClick={() => toggleExpand(year)}
                        className="flex items-center justify-between p-2 hover:bg-foreground/5 rounded-lg cursor-pointer text-foreground/80 font-medium"
                      >
                        <span>{year}</span>
                        {expanded[year] ? <ChevronDown size={16} /> : <ChevronRightIcon size={16} />}
                      </div>
                    )}
                    
                    {/* Months */}
                    {(year === "CURRENT_YEAR" || expanded[year]) && Object.entries(months).map(([month, days]) => (
                      <div key={month} className={`${year !== "CURRENT_YEAR" ? "pl-4" : ""} space-y-1`}>
                        <div 
                          onClick={() => toggleExpand(month)}
                          className="flex items-center justify-between p-2 hover:bg-foreground/5 rounded-lg cursor-pointer text-foreground/70"
                        >
                          <span>{month}</span>
                          {expanded[month] ? <ChevronDown size={16} /> : <ChevronRightIcon size={16} />}
                        </div>
                        
                        {/* Days & Entries */}
                        {expanded[month] && (
                          <div className="pl-4 space-y-2 border-l border-foreground/10 ml-2 mt-1 mb-2">
                            {Object.entries(days).map(([dayLabel, entries]) => (
                              <div key={dayLabel} className="space-y-1">
                                <div className="text-xs font-semibold text-foreground/40 pl-2 mt-2 uppercase tracking-wide">
                                  {dayLabel}
                                </div>
                                {entries.map(entry => (
                                  <div 
                                    key={entry.id} 
                                    onClick={() => router.push(`/dashboard/journal/${entry.id}`)}
                                    className="flex items-center space-x-2 p-2 hover:bg-foreground/5 rounded-lg cursor-pointer text-sm transition-colors"
                                  >
                                    <Book size={14} className="text-crimson flex-shrink-0" />
                                    <span className="truncate hover:text-crimson transition-colors">{entry.title}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-foreground/10 flex flex-col space-y-2">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2`}>
          {!isCollapsed && <span className="text-sm text-foreground/60 cursor-default">Settings</span>}
          <ThemeToggle />
        </div>
        
        <button 
          onClick={handleSignOut}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 px-2'} py-2 text-foreground/60 hover:text-crimson transition-colors rounded-lg hover:bg-foreground/5 cursor-pointer`}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.div>
  );
}
