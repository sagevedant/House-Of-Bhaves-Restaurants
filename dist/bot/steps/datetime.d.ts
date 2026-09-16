import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Client, Conversation, StepData } from '../../db/schema';
export declare function handleDateTimeDate(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function sendTimePrompt(client: Client, phone: string, date: string): Promise<void>;
export declare function handleDateTimeTime(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function sendConfirmPrompt(client: Client, phone: string, stepData: StepData, conversation: Conversation): Promise<void>;
//# sourceMappingURL=datetime.d.ts.map