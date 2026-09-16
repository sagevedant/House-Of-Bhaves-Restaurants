import type { WhatsAppMessageEvent } from '../whatsapp/parser';
import type { Client, Conversation, StepData } from '../db/schema';
export declare function handleFallback(event: WhatsAppMessageEvent, conversation: Conversation, client: Client, stepData: StepData): Promise<void>;
//# sourceMappingURL=fallback.d.ts.map