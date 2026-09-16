import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Client, Conversation, StepData } from '../../db/schema';
export declare function handleOccasion(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function sendDatePrompt(client: Client, phone: string): Promise<void>;
//# sourceMappingURL=occasion.d.ts.map