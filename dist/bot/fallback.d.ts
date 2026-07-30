import type { WhatsAppMessageEvent } from '../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../db/schema';
export declare function handleFallback(event: WhatsAppMessageEvent, conversation: Conversation, restaurant: Restaurant, stepData: StepData): Promise<void>;
//# sourceMappingURL=fallback.d.ts.map