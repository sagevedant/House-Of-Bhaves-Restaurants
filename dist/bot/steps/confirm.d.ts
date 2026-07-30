import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
export declare function handleConfirm(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function handleFinalize(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function handlePostFinalize(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<void>;
//# sourceMappingURL=confirm.d.ts.map