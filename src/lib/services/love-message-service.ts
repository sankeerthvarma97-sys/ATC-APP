import crypto from "node:crypto";
import { computeWebhookSignature } from "./webhook-service";

export type LoveMessageOccasion =
  | "ROMANTIC"
  | "SWEET_CARING"
  | "PLAYFUL"
  | "HEARTFELT"
  | "APOLOGY"
  | "GOOD_MORNING"
  | "GOOD_NIGHT"
  | "ANNIVERSARY"
  | "BIRTHDAY"
  | "GRATITUDE"
  | "LONG_LETTER"
  | "POETRY"
  | "RECONCILIATION";

export type LoveMessageTone =
  | "PASSIONATE"
  | "GENTLE"
  | "PLAYFUL"
  | "POETIC"
  | "ELEGANT"
  | "WITTY"
  | "WARM";

export type LoveMessageStyle =
  | "SHORT"
  | "BALANCED"
  | "LONG_LETTER"
  | "POETRY";

export type LoveMessageLanguage =
  | "EN" // English
  | "ES" // Spanish
  | "FR" // French
  | "DE" // German
  | "HI" // Hindi
  | "TE" // Telugu
  | "JA" // Japanese
  | "IT"; // Italian

export interface LoveMessageInput {
  recipientNickname?: string;
  occasion: LoveMessageOccasion;
  tone?: LoveMessageTone;
  style?: LoveMessageStyle;
  language?: LoveMessageLanguage;
  context?: string;
  senderName?: string;
}

export interface LoveMessageResult {
  success: boolean;
  message: string;
  provider: "n8n" | "local-ai-engine";
  meta: {
    occasion: LoveMessageOccasion;
    tone: LoveMessageTone;
    style: LoveMessageStyle;
    language: LoveMessageLanguage;
    recipientNickname?: string;
    generatedAt: string;
    durationMs: number;
    wordCount: number;
    charCount: number;
  };
}

// In-memory rate limiting map: identifier -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

/**
 * Checks rate limiting for AI message generation to prevent abuse.
 */
export function checkLoveMessageRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  activeTimestamps.push(now);
  rateLimitMap.set(identifier, activeTimestamps);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - activeTimestamps.length };
}

/**
 * High-quality curated template generation engine for fallback or offline n8n scenarios.
 */
function generateLocalLoveMessage(input: LoveMessageInput): string {
  const recipient = input.recipientNickname?.trim() || "My Love";
  const sender = input.senderName?.trim() || "Always Yours";
  const lang = input.language || "EN";
  const occasion = input.occasion;
  const context = input.context?.trim() ? ` ${input.context.trim()}` : "";

  // Multilingual curated love message library
  if (lang === "ES") {
    switch (occasion) {
      case "GOOD_MORNING":
        return `Buenos días, mi amor ${recipient}. Que tu día sea tan brillante y hermoso como la sonrisa que me regalaste cuando te conocí.${context} Te amo con todo mi corazón.`;
      case "GOOD_NIGHT":
        return `Buenas noches, cielo ${recipient}. Descansa sabiendo que eres mi pensamiento favorito antes de dormir y el primero al despertar.${context} Que sueñes con los angelitos.`;
      case "APOLOGY":
        return `Mi querida ${recipient}, lamento profundamente haberte causado tristeza. Tu paz y tu felicidad son lo más sagrado para mí.${context} Por favor permíteme compensarte y abrazarte fuerte.`;
      case "POETRY":
        return `En el cielo de tus ojos encontré mi devoción,\n${recipient} de mi alma, eres tú mi adoración.\nNi la brisa ni el destino nos podrán separar,\nporque amarte es mi gloria y mi dicha sin igual.`;
      case "ANNIVERSARY":
        return `¡Feliz Aniversario, ${recipient}! Cada segundo contigo ha sido una bendición inolvidable.${context} Que el destino nos regale una eternidad juntos. Con amor infinito, ${sender}.`;
      default:
        return `Para mi amada ${recipient}: No existe distancia ni tiempo que pueda apagar lo que siento por ti. Eres mi hogar, mi paz y mi mayor alegría.${context} Con todo mi amor, ${sender}.`;
    }
  }

  if (lang === "FR") {
    switch (occasion) {
      case "GOOD_MORNING":
        return `Bonjour mon amour, ${recipient}. Que cette journée t'apporte autant de joie et de douceur que tu en donnes à ma vie.${context} Je pense à toi sans cesse.`;
      case "GOOD_NIGHT":
        return `Bonne nuit, mon cœur ${recipient}. Dors bien en sachant que tu es mon plus doux rêve devenu réalité.${context} Doux baisers sous les étoiles.`;
      case "POETRY":
        return `Dans le silence de la nuit brille ton regard doré,\nChère ${recipient}, par ta beauté mon âme est enchantée.\nÀ jamais lié à ton souffle, sous ce ciel infini,\nMon amour pour toi ne s'éteindra jamais dans cette vie.`;
      default:
        return `Mon amour ${recipient}, chaque battement de mon cœur prononce ton nom. Tu es la plus belle chose qui me soit arrivée.${context} Tendrement, ${sender}.`;
    }
  }

  if (lang === "HI") {
    switch (occasion) {
      case "GOOD_MORNING":
        return `सुप्रभात मेरी जान ${recipient}। मेरी सुबह की पहली और सबसे खूबसूरत किरण हमेशा तुम्हारी याद होती है।${context} तुम्हारा दिन प्यार और खुशियों से भरा रहे।`;
      case "GOOD_NIGHT":
        return `शुभ रात्रि ${recipient}। सपनों में भी बस तेरा ही चेहरा रहे, तेरी मुस्कुराहट से ही मेरी हर रात मुकम्मल होती है।${context} मीठे सपने और ढेर सारा प्यार।`;
      case "APOLOGY":
        return `मेरी प्यारी ${recipient}, अगर मेरी किसी बात से तुम्हारा दिल दुखा हो तो दिल से माफ़ी चाहता हूँ। तुम्हारी ख़ुशी से बढ़कर मेरे लिए कुछ नहीं है।${context} हमेशा सिर्फ तुम्हारा, ${sender}।`;
      case "POETRY":
        return `चाँदनी रात में तेरी यादों का साया है,\nमेरी ${recipient}, खुदा ने तुझे कितनी फुर्सत से बनाया है।\nहर सांस में सिर्फ तेरा ही नाम रहता है,\nये दिल सुबह-ओ-शाम बस तुझे ही चाहता है।`;
      default:
        return `मेरी जान ${recipient}, तुम्हारे आने से मेरी ज़िंदगी में खुशियों की बहार आ गई है। तुम्हारा साथ मेरी सबसे बड़ी ताकत है।${context} हमेशा प्यार के साथ, ${sender}।`;
    }
  }

  if (lang === "TE") {
    switch (occasion) {
      case "GOOD_MORNING":
        return `శుభోదయం నా ప్రాణం ${recipient}! నీ చిరునవ్వుతో నా రోజు ఎంతో అందంగా మొదలవుతుంది.${context} ప్రేమతో నీ కోసం ఎదురుచూస్తూ...`;
      case "GOOD_NIGHT":
        return `శుభరాత్రి ${recipient}. నిద్రపోయే ముందు నా చివరి ఆలోచన, మేల్కొన్నప్పుడు నా మొదటి తలపు నువ్వే.${context} తీపి కలలు, నా ప్రేమతో!`;
      default:
        return `నా ప్రియమైన ${recipient}, నా జీవితంలో నువ్వు ఉండడం నేను చేసుకున్న గొప్ప వరం. ఎప్పటికీ నీతోనే, నీ ప్రేమికుడు ${sender}.${context}`;
    }
  }

  // English Default
  switch (occasion) {
    case "GOOD_MORNING":
      return `Good morning, my sweet ${recipient}! The sun is bright, but nothing compares to the warmth you bring into my world.${context} May your day be as radiant and lovely as you are. All my love, ${sender}.`;

    case "GOOD_NIGHT":
      return `Good night, precious ${recipient}. As the stars illuminate the evening sky, my heart rests peacefully knowing you are mine.${context} Sleep deeply and dream of all the magical adventures waiting for us tomorrow. Yours always, ${sender}.`;

    case "APOLOGY":
      return `Dearest ${recipient}, I am genuinely sorry from the bottom of my heart. Your happiness means everything to me, and seeing you hurt breaks my heart.${context} Please forgive me and let me hold you close again. With love and devotion, ${sender}.`;

    case "ANNIVERSARY":
      return `Happy Anniversary, my soulmate ${recipient}! Looking back at our journey together fills me with endless gratitude and wonder.${context} Every day by your side is a gift, and I cannot wait for a lifetime more of holding your hand. Forever yours, ${sender}.`;

    case "BIRTHDAY":
      return `Happy Birthday to the most wonderful person in the universe, my darling ${recipient}! On your special day, I celebrate the kindness, grace, and beauty you bring into every room you enter.${context} May all your dreams take flight! With all my heart, ${sender}.`;

    case "PLAYFUL":
      return `Hey gorgeous ${recipient}! Just a gentle reminder that you have permanently stolen my heart, and I have zero intention of asking for it back.${context} Thinking of you and smiling like an idiot right now! Lots of love, ${sender}.`;

    case "SWEET_CARING":
      return `My darling ${recipient}, I just wanted to wrap you in a warm mental hug today. Remember to breathe, drink water, and take care of your beautiful self.${context} You mean the absolute world to me. Always here for you, ${sender}.`;

    case "GRATITUDE":
      return `Dearest ${recipient}, thank you for simply being you. Your gentle laughter, your patience, and the unconditional love you give me inspire me every single day.${context} I am blessed beyond measure to call you mine. Forever grateful, ${sender}.`;

    case "POETRY":
      return `Like stars that guide the wandering flight across the boundless sea,\nMy heart finds harbor in your grace, wherever you may be.\nDearest ${recipient}, sweet and true, through storm and calm sunshine,\nI pledge my love with every breath, forever to be thine.\n\n— ${sender}`;

    case "LONG_LETTER":
      return `My Dearest ${recipient},\n\nI sat down today thinking about how fortunate I am that our paths crossed. In a bustling world full of fleeting moments, the love we share feels timeless and serene. Your voice is my comforting anchor, and your smile is my guiding beacon.\n\n${context ? `${context}\n\n` : ""}No matter what trials or triumphs tomorrow brings, knowing that I get to walk beside you makes every challenge worth conquering. Thank you for choosing me, for loving me, and for filling my life with pure wonder.\n\nWith all my love and devotion,\n${sender}`;

    case "RECONCILIATION":
      return `Dear ${recipient}, our bond means too much to let misunderstandings build walls between us. I cherish our shared memories and the genuine love we've built.${context} Whenever you are ready, I would love nothing more than to listen, understand, and move forward together hand in hand. With sincerity, ${sender}.`;

    case "ROMANTIC":
    case "HEARTFELT":
    default:
      return `Dearest ${recipient}, words often fall short when I try to express how deeply I adore you. You bring peace to my busiest days and warmth to my coldest nights.${context} Loving you is the easiest and most beautiful thing I have ever done. Forever and always, ${sender}.`;
  }
}

/**
 * Main AI Love Message Generator:
 * Dispatches to external n8n workflow if configured; seamlessly falls back to local AI engine on timeout or offline state.
 */
export async function generateLoveMessage(input: LoveMessageInput, identifier = "guest"): Promise<LoveMessageResult> {
  const startedAt = Date.now();
  const n8nWebhookUrl = process.env.N8N_LOVE_MESSAGE_WEBHOOK_URL?.trim() || process.env.N8N_WEBHOOK_URL?.trim();
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET?.trim();

  // Try n8n integration if webhook URL is configured
  if (n8nWebhookUrl) {
    try {
      const payloadString = JSON.stringify({
        event: "GENERATE_AI_LOVE_MESSAGE",
        timestamp: new Date().toISOString(),
        input: {
          recipientNickname: input.recipientNickname?.trim() || undefined,
          occasion: input.occasion,
          tone: input.tone || "PASSIONATE",
          style: input.style || "BALANCED",
          language: input.language || "EN",
          context: input.context?.trim() || undefined,
          senderName: input.senderName?.trim() || undefined,
        },
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (n8nSecret) {
        headers["x-aocc-signature"] = `sha256=${computeWebhookSignature(payloadString, n8nSecret)}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json().catch(() => null);
        const generatedText = responseData?.message || responseData?.output || responseData?.text;

        if (typeof generatedText === "string" && generatedText.trim().length > 10) {
          const durationMs = Date.now() - startedAt;
          const cleanText = generatedText.trim();
          return {
            success: true,
            message: cleanText,
            provider: "n8n",
            meta: {
              occasion: input.occasion,
              tone: input.tone || "PASSIONATE",
              style: input.style || "BALANCED",
              language: input.language || "EN",
              recipientNickname: input.recipientNickname,
              generatedAt: new Date().toISOString(),
              durationMs,
              wordCount: cleanText.split(/\s+/).length,
              charCount: cleanText.length,
            },
          };
        }
      }
    } catch (err) {
      console.warn("Outbound n8n webhook call failed; switching to local AI generation engine:", err);
    }
  }

  // Fallback to intelligent local generation
  const localMessage = generateLocalLoveMessage(input);
  const durationMs = Date.now() - startedAt;

  return {
    success: true,
    message: localMessage,
    provider: "local-ai-engine",
    meta: {
      occasion: input.occasion,
      tone: input.tone || "PASSIONATE",
      style: input.style || "BALANCED",
      language: input.language || "EN",
      recipientNickname: input.recipientNickname,
      generatedAt: new Date().toISOString(),
      durationMs,
      wordCount: localMessage.split(/\s+/).length,
      charCount: localMessage.length,
    },
  };
}
