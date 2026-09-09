import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export interface ExtractedSlots {
  name?: string;
  guests?: number;
  occasion?: 'casual' | 'birthday' | 'anniversary' | 'corporate' | 'party';
  date?: string;
  time?: string;
  intent?: 'book' | 'modify' | 'cancel' | 'question' | 'greeting';
  question?: string;
  language?: 'en' | 'hi' | 'hinglish';
}

export function fallbackExtract(message: string, currentDate: string): ExtractedSlots {
  const lower = message.toLowerCase();
  const slots: ExtractedSlots = {};
  
  const numMatch = message.match(/\b(\d+)\b/);
  if (numMatch) slots.guests = parseInt(numMatch[1], 10);
  
  if (lower.includes('birthday') || lower.includes('bday') || lower.includes('janamdin')) slots.occasion = 'birthday';
  if (lower.includes('cancel') || lower.includes('rdd')) slots.intent = 'cancel';
  if (lower.match(/\b(hi|hello|hey)\b/)) slots.intent = 'greeting';
  if (message.includes('?')) slots.intent = 'question';
  if (lower.includes('kal') || lower.includes('tomorrow')) slots.date = '<tomorrow>';
  if (lower.includes('aaj') || lower.includes('today')) slots.date = currentDate;
  
  return slots;
}

// FIX: previously `JSON.parse(jsonStr)` was cast directly to ExtractedSlots
// with zero runtime validation. A hallucinated enum value, malformed date,
// or garbage number from the LLM would flow straight into DB writes and
// customer-facing message templates unvalidated. This validates each field
// against its expected shape and drops anything that doesn't match,
// falling back to the regex extractor on outright parse failure.
const VALID_OCCASIONS = new Set<string>(['casual', 'birthday', 'anniversary', 'corporate', 'party']);
const VALID_INTENTS = new Set<string>(['book', 'modify', 'cancel', 'question', 'greeting']);
const VALID_LANGUAGES = new Set<string>(['en', 'hi', 'hinglish']);
const DATE_RE = /^(\d{4}-\d{2}-\d{2}|<tomorrow>)$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (dateStr === '<tomorrow>') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

function sanitizeExtractedSlots(raw: unknown): ExtractedSlots {
  if (!raw || typeof raw !== 'object') return {};
  const rawObj = raw as Record<string, unknown>;
  const out: ExtractedSlots = {};

  if (typeof rawObj.name === 'string' && rawObj.name.trim() && rawObj.name.length <= 100) {
    out.name = rawObj.name.trim().slice(0, 100);
  }

  if (typeof rawObj.guests === 'number' && Number.isFinite(rawObj.guests) && rawObj.guests >= 1 && rawObj.guests <= 100) {
    out.guests = Math.round(rawObj.guests);
  }

  if (typeof rawObj.occasion === 'string' && VALID_OCCASIONS.has(rawObj.occasion)) {
    out.occasion = rawObj.occasion as ExtractedSlots['occasion'];
  }

  if (typeof rawObj.date === 'string' && DATE_RE.test(rawObj.date) && isValidCalendarDate(rawObj.date)) {
    out.date = rawObj.date;
  }

  if (typeof rawObj.time === 'string' && TIME_RE.test(rawObj.time)) {
    out.time = rawObj.time;
  }

  if (typeof rawObj.intent === 'string' && VALID_INTENTS.has(rawObj.intent)) {
    out.intent = rawObj.intent as ExtractedSlots['intent'];
  }

  if (typeof rawObj.question === 'string' && rawObj.question.trim()) {
    out.question = rawObj.question.trim().slice(0, 500);
  }

  if (typeof rawObj.language === 'string' && VALID_LANGUAGES.has(rawObj.language)) {
    out.language = rawObj.language as ExtractedSlots['language'];
  }

  return out;
}

export async function extractSlots(message: string, currentDate: string, currentTime: string): Promise<ExtractedSlots> {
  const dayName = new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' });

  if (!config.geminiApiKey) {
    return fallbackExtract(message, currentDate);
  }

  const ai = new GoogleGenerativeAI(config.geminiApiKey);
  const model = ai.getGenerativeModel({ 
    model: 'gemini-2.0-flash', 
    generationConfig: { temperature: 0, responseMimeType: 'application/json' } 
  });

  const prompt = `You are a restaurant reservation slot extractor for an Indian restaurant. Parse the user's message and extract booking information.

Current date: ${currentDate} (YYYY-MM-DD format)
Current time: ${currentTime} (HH:MM 24h IST)
Current day: ${dayName}

RULES:
1. Extract any of these fields if mentioned: name, guests (number), occasion, date, time
2. Resolve relative dates: "aaj"/"today" = ${currentDate}, "kal"/"tomorrow" = tomorrow's date, "parson"/"day after" = day after tomorrow
3. Resolve day names: "Friday"/"Saturday" etc = next occurrence of that day from current date
4. Resolve times: "8 baje" = 20:00 (assume dinner if ambiguous), "dopaher 1" = 13:00, "raat 9" = 21:00, "shaam" = 19:00
5. Hinglish mapping: "log"/"logo" = people/guests, "baje" = o'clock, "ke liye" = for
6. Detect intent: "book"/"reserve"/"table" = 'book', "cancel"/"rdd" = 'cancel', "change"/"modify"/"badlo" = 'modify', questions about menu/parking/location = 'question', greetings = 'greeting'
7. If the message is a question (asking about parking, menu, timings, etc.), set intent='question' and put the question text in 'question' field
8. Detect language: pure English = 'en', pure Hindi = 'hi', mixed = 'hinglish'
9. Occasion mapping: "bday"/"birthday"/"janamdin" = 'birthday', "anniversary"/"salgirah" = 'anniversary', "party" = 'party', "meeting"/"corporate" = 'corporate', default/casual = 'casual'

Return ONLY a valid JSON object. No markdown, no explanation. Omit fields that cannot be determined.

Examples:
- "Table for 4 tonight at 8 under Amit" → {"name":"Amit","guests":4,"time":"20:00","date":"${currentDate}","intent":"book"}
- "Kal raat 9 baje 6 logo ke liye birthday" → {"guests":6,"time":"21:00","date":"<tomorrow>","occasion":"birthday","intent":"book","language":"hinglish"}
- "parking hai kya?" → {"intent":"question","question":"Is there parking available?","language":"hinglish"}
- "hi" → {"intent":"greeting","language":"en"}
- "cancel karo mera booking" → {"intent":"cancel","language":"hinglish"}

Message: ${message}`;

  try {
    const result = await model.generateContent(prompt);
    const jsonStr = result.response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Gemini returned non-JSON output, falling back to regex extractor:', parseErr);
      return fallbackExtract(message, currentDate);
    }

    const sanitized = sanitizeExtractedSlots(parsed);
    if (Object.keys(sanitized).length === 0) {
      console.warn('Gemini output failed validation entirely — falling back to regex extractor.');
      return fallbackExtract(message, currentDate);
    }
    return sanitized;
  } catch (error) {
    console.error('Gemini extraction error:', error);
    return fallbackExtract(message, currentDate);
  }
}
