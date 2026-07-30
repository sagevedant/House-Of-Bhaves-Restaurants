import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
export declare function handleDateTimeDate(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function sendTimePrompt(restaurant: Restaurant, phone: string, date: string): Promise<void>;
export declare function handleDateTimeTime(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function sendConfirmPrompt(restaurant: Restaurant, phone: string, stepData: StepData, conversation: Conversation): Promise<void>;
//# sourceMappingURL=datetime.d.ts.map