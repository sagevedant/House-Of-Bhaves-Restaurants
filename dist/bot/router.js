"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIncomingEvent = handleIncomingEvent;
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const sender_1 = require("../whatsapp/sender");
const fallback_1 = require("./fallback");
const entry_1 = require("./steps/entry");
const guests_1 = require("./steps/guests");
const occasion_1 = require("./steps/occasion");
const datetime_1 = require("./steps/datetime");
const confirm_1 = require("./steps/confirm");
const slotExtractor_1 = require("../ai/slotExtractor");
const knowledge_1 = require("./knowledge");
const dateHelpers_1 = require("../utils/dateHelpers");
async function handleIncomingEvent(phoneNumberId, event) {
    if (event.type === 'status_update') {
        console.log('ℹ️ Router: Status update event ignored');
        return;
    }
    const msgEvent = event;
    // Look up active restaurant (prioritize Big Bang Community BBC for live demo)
    let restaurantResult = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.slug, 'big-bang-community')).limit(1);
    if (!restaurantResult || restaurantResult.length === 0) {
        restaurantResult = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.whatsappPhoneNumberId, phoneNumberId)).limit(1);
    }
    let restaurant = restaurantResult[0];
    if (!restaurant) {
        console.warn(`⚠️ Router: Falling back to first restaurant in database...`);
        const all = await connection_1.db.select().from(schema_1.restaurants).limit(1);
        restaurant = all[0];
        if (!restaurant) {
            console.error('❌ Router: No restaurants in database!');
            return;
        }
    }
    await (0, sender_1.markAsRead)(restaurant, msgEvent.messageId);
    const phone = msgEvent.from;
    if (!phone) {
        console.warn('⚠️ Router: Missing sender phone number in event');
        return;
    }
    const convResult = await connection_1.db.select().from(schema_1.conversations).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.phone, phone), (0, drizzle_orm_1.eq)(schema_1.conversations.restaurantId, restaurant.id))).limit(1);
    let conversation;
    if (!convResult || convResult.length === 0) {
        console.log(`✨ Router: Creating NEW conversation for phone '${phone}' at restaurant '${restaurant.name}'`);
        const [newConv] = await connection_1.db.insert(schema_1.conversations).values({
            phone,
            restaurantId: restaurant.id,
            currentStep: 'entry',
            stepData: '{}',
            customerName: msgEvent.customerName || null,
        }).returning();
        conversation = newConv;
        await (0, entry_1.handleEntry)(msgEvent, conversation, restaurant, {});
        return;
    }
    else {
        conversation = convResult[0];
    }
    let stepData = JSON.parse(conversation.stepData || '{}');
    let currentStep = (conversation.currentStep || 'entry');
    if (msgEvent.type === 'text' && currentStep !== 'entry' && currentStep !== 'finalized') {
        const extracted = await (0, slotExtractor_1.extractSlots)(msgEvent.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        if (extracted.intent === 'question' && extracted.question) {
            await connection_1.db.update(schema_1.conversations).set({ interruptedStep: currentStep }).where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversation.id));
            const answer = (0, knowledge_1.findAnswer)(extracted.question);
            if (answer) {
                await (0, sender_1.sendText)(restaurant, phone, answer);
            }
            else {
                await (0, sender_1.sendText)(restaurant, phone, 'Great question! For specific queries, please call us at ' + (restaurant.managerPhone || '+123456789') + '.');
            }
            await (0, sender_1.sendText)(restaurant, phone, 'Now let\'s get back to your booking! 😊');
            const syntheticEvent = { ...msgEvent, type: 'text', text: '' };
            await routeStep(currentStep, syntheticEvent, conversation, restaurant, stepData);
            return;
        }
    }
    let result = await routeStep(currentStep, msgEvent, conversation, restaurant, stepData);
    if (result) {
        const { nextStep, stepData: newStepData } = result;
        await connection_1.db.update(schema_1.conversations).set({
            currentStep: nextStep,
            stepData: JSON.stringify(newStepData),
            customerName: newStepData.customerName || conversation.customerName,
            updatedAt: new Date().toISOString()
        }).where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversation.id));
        if (nextStep === 'finalized' && currentStep !== 'finalized') {
            const finalResult = await (0, confirm_1.handleFinalize)(msgEvent, conversation, restaurant, newStepData);
            if (finalResult) {
                await connection_1.db.update(schema_1.conversations).set({
                    currentStep: finalResult.nextStep,
                    stepData: JSON.stringify(finalResult.stepData)
                }).where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversation.id));
            }
        }
    }
    else {
        await (0, fallback_1.handleFallback)(msgEvent, conversation, restaurant, stepData);
    }
}
async function routeStep(currentStep, msgEvent, conversation, restaurant, stepData) {
    try {
        switch (currentStep) {
            case 'entry':
                return await (0, entry_1.handleEntry)(msgEvent, conversation, restaurant, stepData);
            case 'guests':
                return await (0, guests_1.handleGuests)(msgEvent, conversation, restaurant, stepData);
            case 'occasion':
                return await (0, occasion_1.handleOccasion)(msgEvent, conversation, restaurant, stepData);
            case 'datetime_date':
                return await (0, datetime_1.handleDateTimeDate)(msgEvent, conversation, restaurant, stepData);
            case 'datetime_time':
                return await (0, datetime_1.handleDateTimeTime)(msgEvent, conversation, restaurant, stepData);
            case 'confirm':
                return await (0, confirm_1.handleConfirm)(msgEvent, conversation, restaurant, stepData);
            case 'finalized':
                return await (0, entry_1.handleEntry)(msgEvent, conversation, restaurant, stepData);
            default:
                return null;
        }
    }
    catch (error) {
        console.error('Routing error:', error);
        await (0, sender_1.sendText)(restaurant, msgEvent.from, 'Oops! Something went wrong on our end. Please try again.');
        return null;
    }
}
//# sourceMappingURL=router.js.map