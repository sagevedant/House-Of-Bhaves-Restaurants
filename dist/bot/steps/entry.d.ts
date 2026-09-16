import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Client, Conversation, StepData } from '../../db/schema';
export declare function handleEntry(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<{
    nextStep: string;
    stepData: StepData;
} | null>;
//# sourceMappingURL=entry.d.ts.map