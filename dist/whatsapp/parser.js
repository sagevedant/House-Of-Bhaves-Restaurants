"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWebhookPayload = parseWebhookPayload;
const phoneHelpers_1 = require("../utils/phoneHelpers");

/**
 * FIX: sanitizePhone existed but was inconsistently applied downstream
 * (some writes used raw event.from, others didn't). Now normalized exactly
 * once, here, at the point every phone number enters the system — every
 * downstream consumer (router, confirm, CSV export, dashboard) can trust
 * `event.from` / `msg.from` is already in canonical format.
 */
function parseWebhookPayload(body) {
    const results = [];
    if (body.object === 'whatsapp_business_account' && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
            if (Array.isArray(entry.changes)) {
                for (const change of entry.changes) {
                    if (change.field === 'messages' && change.value) {
                        const value = change.value;
                        const phoneNumberId = value.metadata?.phone_number_id;
                        if (!phoneNumberId)
                            continue;
                        const parsedEvents = [];
                        const contacts = value.contacts || [];
                        if (Array.isArray(value.messages)) {
                            for (const msg of value.messages) {
                                const contact = contacts.find((c) => c.wa_id === msg.from);
                                const customerName = contact?.profile?.name;
                                const sanitizedFrom = (0, phoneHelpers_1.sanitizePhone)(msg.from);
                                const base = {
                                    messageId: msg.id,
                                    from: sanitizedFrom,
                                    timestamp: msg.timestamp,
                                    customerName,
                                };
                                if (msg.type === 'text' && msg.text?.body) {
                                    parsedEvents.push({ ...base, type: 'text', text: msg.text.body });
                                }
                                else if (msg.type === 'interactive' && msg.interactive?.type === 'button_reply') {
                                    parsedEvents.push({
                                        ...base,
                                        type: 'button_reply',
                                        buttonId: msg.interactive.button_reply.id,
                                        buttonText: msg.interactive.button_reply.title,
                                    });
                                }
                                else if (msg.type === 'interactive' && msg.interactive?.type === 'list_reply') {
                                    parsedEvents.push({
                                        ...base,
                                        type: 'list_reply',
                                        listId: msg.interactive.list_reply.id,
                                        rowId: msg.interactive.list_reply.id,
                                        listTitle: msg.interactive.list_reply.title,
                                        listDescription: msg.interactive.list_reply.description,
                                    });
                                }
                                else if (msg.type === 'image' && msg.image?.id) {
                                    parsedEvents.push({
                                        ...base,
                                        type: 'image',
                                        imageId: msg.image.id,
                                        caption: msg.image.caption,
                                    });
                                }
                                else {
                                    parsedEvents.push({ ...base, type: 'unknown', raw: msg });
                                }
                            }
                        }
                        if (Array.isArray(value.statuses)) {
                            for (const status of value.statuses) {
                                parsedEvents.push({
                                    type: 'status_update',
                                    messageId: status.id,
                                    status: status.status,
                                    recipientId: (0, phoneHelpers_1.sanitizePhone)(status.recipient_id),
                                    timestamp: status.timestamp,
                                });
                            }
                        }
                        if (parsedEvents.length > 0) {
                            results.push({ phoneNumberId, events: parsedEvents });
                        }
                    }
                }
            }
        }
    }
    return results;
}
//# sourceMappingURL=parser.js.map
