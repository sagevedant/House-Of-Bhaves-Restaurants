export type WhatsAppEvent = {
    type: 'text';
    text: string;
    messageId: string;
    from: string;
    timestamp: string;
    customerName?: string;
} | {
    type: 'button_reply';
    buttonId: string;
    buttonText: string;
    messageId: string;
    from: string;
    timestamp: string;
    customerName?: string;
} | {
    type: 'list_reply';
    listId: string;
    rowId: string;
    listTitle: string;
    listDescription?: string;
    messageId: string;
    from: string;
    timestamp: string;
    customerName?: string;
} | {
    type: 'image';
    imageId: string;
    caption?: string;
    messageId: string;
    from: string;
    timestamp: string;
    customerName?: string;
} | {
    type: 'status_update';
    messageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    recipientId: string;
    timestamp: string;
} | {
    type: 'unknown';
    raw: any;
    messageId?: string;
    from?: string;
    timestamp?: string;
};
export type WhatsAppMessageEvent = Exclude<WhatsAppEvent, {
    type: 'status_update' | 'unknown';
}>;
export interface ParsedWebhook {
    phoneNumberId: string;
    events: WhatsAppEvent[];
}
export declare function parseWebhookPayload(body: any): ParsedWebhook[];
//# sourceMappingURL=parser.d.ts.map