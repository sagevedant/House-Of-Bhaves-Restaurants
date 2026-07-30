"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackExtract = fallbackExtract;
exports.extractSlots = extractSlots;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("../config");
function fallbackExtract(message, currentDate) {
    const lower = message.toLowerCase();
    const slots = {};
    const numMatch = message.match(/\b(\d+)\b/);
    if (numMatch)
        slots.guests = parseInt(numMatch[1], 10);
    if (lower.includes('birthday') || lower.includes('bday') || lower.includes('janamdin'))
        slots.occasion = 'birthday';
    if (lower.includes('cancel') || lower.includes('rdd'))
        slots.intent = 'cancel';
    if (lower.match(/\b(hi|hello|hey)\b/))
        slots.intent = 'greeting';
    if (message.includes('?'))
        slots.intent = 'question';
    if (lower.includes('kal') || lower.includes('tomorrow'))
        slots.date = '<tomorrow>';
    if (lower.includes('aaj') || lower.includes('today'))
        slots.date = currentDate;
    return slots;
}
async function extractSlots(message, currentDate, currentTime) {
    const dayName = new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' });
    if (!config_1.config.geminiApiKey) {
        return fallbackExtract(message, currentDate);
    }
    const ai = new generative_ai_1.GoogleGenerativeAI(config_1.config.geminiApiKey);
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
        return JSON.parse(jsonStr);
    }
    catch (error) {
        console.error('Gemini extraction error:', error);
        return fallbackExtract(message, currentDate);
    }
}
//# sourceMappingURL=slotExtractor.js.map