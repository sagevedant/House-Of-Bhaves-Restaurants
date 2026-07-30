import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
export declare function handleEntry(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
//# sourceMappingURL=entry.d.ts.map