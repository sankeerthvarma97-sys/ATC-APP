"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  FileText,
  Navigation,
  Plane,
  Search,
  Users,
  Warehouse,
  X,
  ArrowRight,
  Sparkles,
  Command,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResultItem {
  id: string;
  category: "PAGES" | "FLIGHTS" | "PASSENGERS" | "GATES" | "RUNWAYS" | "BOOKINGS" | "TICKETS" | "EMPLOYEES" | "AIRCRAFT";
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchResults("");
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  // Debounced search on typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query);
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].href);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl overflow-hidden font-mono text-slate-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="h-5 w-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search flights, callsigms, gates, PNRs, or portals... (Esc to close)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-900">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-500">Searching operational database...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching flights, portals, or resources found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {!loading &&
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition text-xs ${
                    isSelected
                      ? "bg-cyan-950/40 border border-cyan-500/40 text-white"
                      : "hover:bg-slate-900/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 border border-slate-800 text-cyan-400">
                      {item.category === "FLIGHTS" ? (
                        <Plane className="h-4 w-4" />
                      ) : item.category === "PASSENGERS" ? (
                        <Users className="h-4 w-4" />
                      ) : item.category === "GATES" ? (
                        <Warehouse className="h-4 w-4" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {item.title}
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-cyan-500/30 text-cyan-300"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.subtitle}</div>
                    </div>
                  </div>

                  <ArrowRight
                    className={`h-4 w-4 transition ${
                      isSelected ? "text-cyan-400 translate-x-1" : "text-slate-600"
                    }`}
                  />
                </div>
              );
            })}
        </div>

        {/* Keyboard hints footer */}
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; to navigate</span>
            <span>&crarr; to select</span>
            <span>ESC to close</span>
          </div>
          <div className="text-cyan-400/80">AOCC FAST COMMAND PALETTE</div>
        </div>
      </div>
    </div>
  );
}
