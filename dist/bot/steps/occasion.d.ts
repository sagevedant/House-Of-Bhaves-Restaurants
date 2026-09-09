import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
export declare function handleOccasion(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function sendDatePrompt(restaurant: Restaurant, phone: string): Promise<void>;
//# sourceMappingURL=occasion.d.ts.map