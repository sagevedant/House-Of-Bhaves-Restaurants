"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAnswer = findAnswer;
const FAQ_DATABASE = [
    { keywords: ['valet', 'parking', 'park', 'gaadi'], answer: '🚗 Yes! We offer complimentary valet parking for all guests. Self-parking is also available in the basement.' },
    { keywords: ['menu', 'khana', 'food', 'dishes'], answer: '📋 Our menu features a curated mix of North Indian, Continental & Asian cuisines. Chef\'s specials change daily! Ask your server for today\'s recommendations.' },
    { keywords: ['location', 'address', 'kahan', 'where', 'directions'], answer: '📍 Spice Factory Rooftop & Lounge\nBaner Road, Pune 411045\nLandmark: Next to Phoenix Mall\n\nGoogle Maps: Just search "Spice Factory Pune"!' },
    { keywords: ['dress', 'code', 'kapde', 'wear'], answer: '👔 Smart casual. No slippers or shorts please. We want you to feel as good as the food tastes!' },
    { keywords: ['wifi', 'internet', 'net'], answer: '📶 Free WiFi available! Ask your host for the password when you arrive.' },
    { keywords: ['kids', 'children', 'bacche', 'baby', 'child'], answer: '👶 Absolutely! We have a dedicated kids\' play area and a special kids\' menu. Your little ones will love it!' },
    { keywords: ['hookah', 'sheesha', 'smoke'], answer: '💨 Hookah is available on our rooftop section with a dedicated lounge area.' },
    { keywords: ['pet', 'dog', 'kutte', 'animal'], answer: '🐕 We are pet-friendly! We recommend our outdoor/garden seating for guests with pets. Water bowls provided!' },
    { keywords: ['birthday', 'bday', 'cake', 'decoration'], answer: '🎂 For birthday celebrations, we offer complimentary cake, table decoration, and a special birthday song from our team! Just let us know when booking.' },
    { keywords: ['timing', 'hours', 'time', 'open', 'close', 'band'], answer: '🕐 Our hours:\n🌞 Lunch: 12:00 PM – 3:30 PM\n🌙 Dinner: 7:00 PM – 11:00 PM\n📅 Closed on Mondays' },
    { keywords: ['cost', 'price', 'expensive', 'budget', 'kitna', 'mehnga'], answer: '💰 Average cost for two is approximately ₹1,200-₹1,800 (without alcohol). We have options for every budget!' },
    { keywords: ['alcohol', 'bar', 'drink', 'beer', 'wine', 'cocktail', 'daaru'], answer: '🍷 Yes! We have a fully stocked bar with craft cocktails, imported wines, premium spirits, and local brews. Happy Hours: 5-7 PM!' },
    { keywords: ['private', 'area', 'section', 'separate'], answer: '🏠 Yes, we have private dining areas available for corporate events and special celebrations. Minimum 8 guests for private sections.' },
    { keywords: ['music', 'dj', 'live', 'band'], answer: '🎵 Live music on Friday & Saturday evenings! DJ nights every Saturday from 9 PM.' },
];
function findAnswer(question) {
    const lower = question.toLowerCase();
    for (const entry of FAQ_DATABASE) {
        if (entry.keywords.some(kw => lower.includes(kw))) {
            return entry.answer;
        }
    }
    return null;
}
//# sourceMappingURL=knowledge.js.map