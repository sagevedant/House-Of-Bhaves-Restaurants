export interface ExtractedSlots {
    name?: string;
    guests?: number;
    occasion?: 'casual' | 'birthday' | 'anniversary' | 'corporate' | 'party';
    date?: string;
    time?: string;
    intent?: 'book' | 'modify' | 'cancel' | 'question' | 'greeting';
    question?: string;
    language?: 'en' | 'hi' | 'hinglish';
}
export declare function fallbackExtract(message: string, currentDate: string): ExtractedSlots;
export declare function extractSlots(message: string, currentDate: string, currentTime: string): Promise<ExtractedSlots>;
//# sourceMappingURL=slotExtractor.d.ts.map