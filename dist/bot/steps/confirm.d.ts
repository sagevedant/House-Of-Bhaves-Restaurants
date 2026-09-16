import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Client, Conversation, StepData } from '../../db/schema';
export declare function handleConfirm(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function handleFinalize(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
export declare function handlePostFinalize(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<void>;
//# sourceMappingURL=confirm.d.ts.map