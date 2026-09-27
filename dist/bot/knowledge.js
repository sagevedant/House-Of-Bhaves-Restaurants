"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAnswer = findAnswer;
const FAQ_DATABASE = [
    {
        keywords: ['reschedule', 'cancel', 'postpone', 'change date', 'change time', 'badalna'],
        answer: '🗓️ *Rescheduling & Cancellation Policy:*\nYou can reschedule or cancel your appointment free of charge at least 2 hours before your scheduled slot. Just message us here with your booking code to pick a new time.'
    },
    {
        keywords: ['insurance', 'tpa', 'cashless', 'mediclaim', 'payment', 'upi', 'card', 'gpay', 'paytm'],
        answer: '💳 *Insurance & Payment Methods:*\nWe accept all major UPI apps (GPay/PhonePe/Paytm), credit/debit cards, and cash. We also provide itemized medical bills and diagnostic receipts for insurance reimbursement & select cashless TPA claims.'
    },
    {
        keywords: ['parking', 'park', 'valet', 'car', 'bike', 'gaadi'],
        answer: '🚗 *Parking Availability:*\nDedicated patient parking is available at the clinic premises and adjacent visitor parking bays.'
    },
    {
        keywords: ['wait', 'waiting', 'delay', 'time lag', 'kitna time'],
        answer: '⏱️ *Typical Wait Times:*\nPatients with prior bookings are prioritized with an average wait time of 5–10 minutes. In case of an ongoing minor procedure, our receptionist will update you upon arrival.'
    },
    {
        keywords: ['first visit', 'bring', 'documents', 'reports', 'prescription', 'pehle'],
        answer: '📋 *What to Bring to Your First Visit:*\n1. Any past medical/dental prescriptions or X-rays\n2. Current medication list\n3. Valid Photo ID\n4. Your WhatsApp booking code'
    },
    {
        keywords: ['emergency', 'walk-in', 'walk in', 'urgent', 'pain', 'dard', 'emergency care'],
        answer: '🚨 *Emergency & Walk-In Policy:*\nWalk-in emergencies (severe acute pain, trauma, bleeding) are attended to immediately by our duty doctor. For non-urgent visits, we recommend booking a slot to avoid wait times.'
    },
    {
        keywords: ['kids', 'children', 'child', 'pediatric', 'bacche', 'toddler'],
        answer: '👶 *Pediatric & Child Care:*\nYes! We have pediatric-trained specialists and a gentle, child-friendly environment designed to make visits comfortable and stress-free for young patients.'
    },
    {
        keywords: ['timing', 'hours', 'time', 'open', 'close', 'opd', 'band', 'sunday'],
        answer: '🕐 *OPD Hours:*\n🌞 Morning OPD: 10:00 AM – 2:00 PM\n🌙 Evening OPD: 5:00 PM – 9:00 PM\n📅 Open Monday through Saturday (Sunday by prior appointment)'
    },
    {
        keywords: ['consultation fee', 'cost', 'price', 'charges', 'fees', 'kitna', 'rate'],
        answer: '🩺 *Consultation Charges:*\nStandard specialist consultation starts from ₹300–₹500. Detailed treatment plans and transparent cost estimates will be provided after your initial checkup.'
    },
    {
        keywords: ['location', 'address', 'kahan', 'where', 'directions', 'landmark'],
        answer: '📍 *Clinic Location:*\nPlease refer to the clinic address and Google Maps directions link shared in your appointment confirmation message.'
    }
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