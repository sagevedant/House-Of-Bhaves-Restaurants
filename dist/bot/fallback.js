"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFallback = handleFallback;
const sender_1 = require("../whatsapp/sender");
async function handleFallback(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (conversation.currentStep === 'finalized') {
        await (0, sender_1.sendButtons)(restaurant, phone, '🤔 I didn\'t quite catch that!\n\nYou already have an active reservation. What would you like to do?', [
            { id: 'new_booking', title: 'Book Another Table' },
            { id: 'modify_booking', title: 'Modify Booking' },
            { id: 'cancel_booking', title: 'Cancel Booking' },
        ], '🍽️ Spice Factory');
    }
    else {
        await (0, sender_1.sendText)(restaurant, phone, '🤔 I didn\'t quite catch that!\n\nPlease tap one of the buttons above, or type *"reserve"* to start a new booking.');
    }
}
//# sourceMappingURL=fallback.js.map