"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGuests = handleGuests;
exports.sendOccasionPrompt = sendOccasionPrompt;
const sender_1 = require("../../whatsapp/sender");
async function handleGuests(event, conversation, client, stepData) {
    const phone = event.from;
    stepData.guests = 1; // Auto-default patient count to 1 for clinic
    await sendOccasionPrompt(client, phone);
    return { nextStep: 'occasion', stepData };
}
async function sendOccasionPrompt(client, phone) {
    await (0, sender_1.sendList)(client, phone, '🩺 Select your treatment or consultation type:', 'Select Treatment', [{
            title: '✨ Dental Treatments & OPD',
            rows: [
                { id: 'occ_casual', title: 'Consultation & Checkup 🩺', description: 'General Dental Consultation & Checkup' },
                { id: 'occ_corporate', title: 'Aligners & Braces 🦷', description: 'Clear Aligners & Invisible Orthodontics' },
                { id: 'occ_party', title: 'Root Canal & Implants 💉', description: 'Painless RCT & Dental Implants' },
                { id: 'occ_birthday', title: 'Teeth Whitening & Scaling ✨', description: 'Laser Whitening & Dental Polishing' },
            ]
        }]);
}
//# sourceMappingURL=guests.js.map