"use client";

import React, { useState } from "react";
import {
  Heart,
  Sparkles,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Globe,
  Feather,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import type {
  LoveMessageOccasion,
  LoveMessageTone,
  LoveMessageStyle,
  LoveMessageLanguage,
  LoveMessageResult,
} from "@/lib/services/love-message-service";

interface SavedMessage {
  id: string;
  message: string;
  occasion: string;
  tone: string;
  style: string;
  language: string;
  recipient?: string;
  savedAt: string;
}

const OCCASIONS: { label: string; value: LoveMessageOccasion }[] = [
  { label: "❤️ Romantic & Deep Love", value: "ROMANTIC" },
  { label: "🌸 Sweet & Caring", value: "SWEET_CARING" },
  { label: "✨ Cute & Playful", value: "PLAYFUL" },
  { label: "💖 Emotional & Heartfelt", value: "HEARTFELT" },
  { label: "🙏 Sincere Apology & Healing", value: "APOLOGY" },
  { label: "☀️ Sweet Good Morning", value: "GOOD_MORNING" },
  { label: "🌙 Gentle Good Night", value: "GOOD_NIGHT" },
  { label: "🥂 Anniversary Celebration", value: "ANNIVERSARY" },
  { label: "🎂 Birthday Wishes", value: "BIRTHDAY" },
  { label: "🕊️ Appreciation & Gratitude", value: "GRATITUDE" },
  { label: "💌 Long Intimate Letter", value: "LONG_LETTER" },
  { label: "📜 Poetic Verse", value: "POETRY" },
  { label: "🌿 Respectful Reconciliation", value: "RECONCILIATION" },
];

const TONES: { label: string; value: LoveMessageTone }[] = [
  { label: "Passionate & Intense", value: "PASSIONATE" },
  { label: "Gentle & Tender", value: "GENTLE" },
  { label: "Playful & Flirty", value: "PLAYFUL" },
  { label: "Poetic & Lyrical", value: "POETIC" },
  { label: "Elegant & Classy", value: "ELEGANT" },
  { label: "Witty & Charming", value: "WITTY" },
  { label: "Warm & Cozy", value: "WARM" },
];

const STYLES: { label: string; value: LoveMessageStyle }[] = [
  { label: "Short Message (Quick & sweet)", value: "SHORT" },
  { label: "Balanced (Expressive paragraph)", value: "BALANCED" },
  { label: "Long Letter (Full emotional narrative)", value: "LONG_LETTER" },
  { label: "Poetry (Rhymed or lyrical stanzas)", value: "POETRY" },
];

const LANGUAGES: { label: string; value: LoveMessageLanguage }[] = [
  { label: "English (EN)", value: "EN" },
  { label: "Español (ES)", value: "ES" },
  { label: "Français (FR)", value: "FR" },
  { label: "Deutsch (DE)", value: "DE" },
  { label: "हिन्दी - Hindi (HI)", value: "HI" },
  { label: "తెలుగు - Telugu (TE)", value: "TE" },
  { label: "日本語 - Japanese (JA)", value: "JA" },
  { label: "Italiano (IT)", value: "IT" },
];

export function AiLoveMessagesCard() {
  const [activeTab, setActiveTab] = useState<"compose" | "saved">("compose");

  // Form states
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState<LoveMessageOccasion>("ROMANTIC");
  const [tone, setTone] = useState<LoveMessageTone>("PASSIONATE");
  const [style, setStyle] = useState<LoveMessageStyle>("BALANCED");
  const [language, setLanguage] = useState<LoveMessageLanguage>("EN");
  const [context, setContext] = useState("");
  const [senderName, setSenderName] = useState("");

  // Result & loading states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoveMessageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Favorites with lazy localStorage initialization
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("aocc_ai_love_favorites");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isCurrentSaved, setIsCurrentSaved] = useState(false);

  const saveToFavorites = (item: LoveMessageResult) => {
    const newEntry: SavedMessage = {
      id: "fav-" + Date.now(),
      message: item.message,
      occasion: item.meta.occasion,
      tone: item.meta.tone,
      style: item.meta.style,
      language: item.meta.language,
      recipient: item.meta.recipientNickname,
      savedAt: new Date().toLocaleDateString(),
    };
    const updated = [newEntry, ...savedMessages];
    setSavedMessages(updated);
    setIsCurrentSaved(true);
    try {
      localStorage.setItem("aocc_ai_love_favorites", JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  const removeFavorite = (id: string) => {
    const updated = savedMessages.filter((m) => m.id !== id);
    setSavedMessages(updated);
    try {
      localStorage.setItem("aocc_ai_love_favorites", JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setIsCurrentSaved(false);

    try {
      const response = await fetch("/api/ai/love-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientNickname: recipient.trim() || undefined,
          occasion,
          tone,
          style,
          language,
          context: context.trim() || undefined,
          senderName: senderName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI love message.");
      }

      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomize = () => {
    const randomOccasion = OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)].value;
    const randomTone = TONES[Math.floor(Math.random() * TONES.length)].value;
    const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)].value;
    setOccasion(randomOccasion);
    setTone(randomTone);
    setStyle(randomStyle);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 border border-rose-500/20 p-6 backdrop-blur-md">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Heart className="w-5 h-5 fill-rose-500/40 text-rose-400 animate-pulse" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AI Love & Appreciation Studio
                <Badge variant="outline" className="border-rose-500/40 text-rose-300 bg-rose-950/30 text-xs">
                  n8n AI Engine
                </Badge>
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Express profound warmth, sincere apologies, heartfelt poetry, or thoughtful daily greetings.
              Integrated via secure n8n workflows with fallback multi-lingual intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "compose" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("compose")}
              className={activeTab === "compose" ? "bg-rose-600 hover:bg-rose-700 text-white" : "border-slate-700"}
            >
              <Feather className="w-4 h-4 mr-1.5" />
              Studio Composer
            </Button>
            <Button
              variant={activeTab === "saved" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("saved")}
              className={activeTab === "saved" ? "bg-rose-600 hover:bg-rose-700 text-white" : "border-slate-700"}
            >
              <Bookmark className="w-4 h-4 mr-1.5" />
              Saved Notes ({savedMessages.length})
            </Button>
          </div>
        </div>
      </div>

      {activeTab === "compose" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    Message Parameters
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRandomize}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 h-7 px-2"
                  >
                    🎲 Surprise Me
                  </Button>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Customize the emotional signature and linguistic nuances of your message.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                {/* Recipient Nickname */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Recipient Nickname / Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Maya, My Captain, Sweetheart"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    maxLength={50}
                    className="bg-slate-950/60 border-slate-700 focus:border-rose-500 text-sm"
                  />
                </div>

                {/* Occasion / Relationship context */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Occasion / Intent
                  </label>
                  <Select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value as LoveMessageOccasion)}
                    className="bg-slate-950/60 border-slate-700 focus:border-rose-500 text-sm"
                  >
                    {OCCASIONS.map((occ) => (
                      <option key={occ.value} value={occ.value} className="bg-slate-900 text-slate-100">
                        {occ.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Tone & Style Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Tone</label>
                    <Select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as LoveMessageTone)}
                      className="bg-slate-950/60 border-slate-700 focus:border-rose-500 text-xs"
                    >
                      {TONES.map((t) => (
                        <option key={t.value} value={t.value} className="bg-slate-900 text-slate-100">
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Length & Style</label>
                    <Select
                      value={style}
                      onChange={(e) => setStyle(e.target.value as LoveMessageStyle)}
                      className="bg-slate-950/60 border-slate-700 focus:border-rose-500 text-xs"
                    >
                      {STYLES.map((s) => (
                        <option key={s.value} value={s.value} className="bg-slate-900 text-slate-100">
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Language Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Language
                  </label>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LoveMessageLanguage)}
                    className="bg-slate-950/60 border-slate-700 focus:border-rose-500 text-xs"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value} className="bg-slate-900 text-slate-100">
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Custom Context / Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Personal Nuance / Shared Memory (Optional)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {context.length}/400
                    </span>
                  </div>
                  <Textarea
                    placeholder="e.g. Remind them of our evening by the bay, their laugh during flight training, or how much their reassurance helps me..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    maxLength={400}
                    rows={3}
                    className="bg-slate-950/60 border-slate-700 focus:border-rose-500 text-xs resize-none"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-rose-950/50 transition-all duration-200 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Crafting Message via AI...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4 fill-white" />
                      Generate Love Message
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Result Presentation Column */}
          <div className="lg:col-span-7">
            {error && (
              <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Generation Problem</div>
                  <div className="text-xs text-rose-300/90">{error}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="mt-2 text-xs border-rose-500/40 text-rose-300 hover:bg-rose-950/50 h-7"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {result ? (
              <Card className="border-rose-500/30 bg-slate-900/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-bl-full pointer-events-none" />
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-rose-950/80 text-rose-300 border-rose-500/40 text-xs">
                        {result.meta.occasion.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                        {result.meta.tone}
                      </Badge>
                      <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                        {result.meta.language}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Engine: {result.provider === "n8n" ? "n8n Workflow" : "Local AI Fallback"}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 pb-6 space-y-6">
                  {/* Generated Quote Text */}
                  <div className="relative p-6 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-100 font-serif text-base sm:text-lg leading-relaxed whitespace-pre-wrap shadow-inner">
                    <span className="text-3xl font-serif text-rose-400/40 leading-none select-none block mb-1">
                      &ldquo;
                    </span>
                    {result.message}
                    <span className="text-3xl font-serif text-rose-400/40 leading-none select-none block text-right mt-1">
                      &rdquo;
                    </span>
                  </div>

                  {/* Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                      <span>{result.meta.wordCount} words</span>
                      <span>•</span>
                      <span>{result.meta.charCount} characters</span>
                      <span>•</span>
                      <span>Generated in {result.meta.durationMs}ms</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CopyButton
                        value={result.message}
                        label="Copy Message"
                        className="h-8 px-3 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveToFavorites(result)}
                        disabled={isCurrentSaved}
                        className="h-8 px-3 text-xs border-slate-700 hover:border-rose-500 text-slate-300"
                      >
                        {isCurrentSaved ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-rose-400 mr-1.5" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                            Save to Favorites
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={loading}
                        className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                        title="Regenerate another version"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-slate-800 bg-slate-900/30 p-12 text-center h-full flex flex-col items-center justify-center min-h-[380px]">
                <div className="p-4 rounded-full bg-rose-950/30 border border-rose-500/20 text-rose-400 mb-3 animate-pulse">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="text-base font-medium text-slate-200 mb-1">
                  Your personalized note will appear here
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Select an occasion, customize your tone and language, then click &ldquo;Generate Love Message&rdquo; to start.
                </p>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Saved Messages Tab */
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-rose-400" />
              Saved Notes & Favorites ({savedMessages.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Personal messages stored securely in your local browser sandbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedMessages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No saved messages yet. Generate a message and click &ldquo;Save to Favorites&rdquo; to collect them here.
              </div>
            ) : (
              <div className="space-y-3">
                {savedMessages.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-rose-950/60 text-rose-300 border-rose-500/30 text-[10px]">
                          {item.occasion.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-slate-400">{item.tone}</span>
                        {item.recipient && (
                          <span className="text-slate-500">To: {item.recipient}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{item.savedAt}</span>
                    </div>

                    <p className="text-sm text-slate-200 font-serif leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                      <CopyButton value={item.message} label="Copy" className="h-7 text-xs" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFavorite(item.id)}
                        className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
