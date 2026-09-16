import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Client, Conversation, StepData } from '../../db/schema';
export declare function handleGuests(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function sendOccasionPrompt(client: Client, phone: string): Promise<void>;
//# sourceMappingURL=guests.d.ts.map