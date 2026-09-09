import type { Restaurant } from '../db/schema';
export interface ButtonDef {
    id: string;
    title: string;
}
export interface ListRow {
    id: string;
    title: string;
    description?: string;
}
export interface ListSection {
    title: string;
    rows: ListRow[];
}
export declare function callMessagesApi(restaurant: Restaurant, payload: object): Promise<void>;
export declare function sendText(restaurant: Restaurant, to: string, text: string): Promise<void>;
export declare function sendButtons(restaurant: Restaurant, to: string, bodyText: string, buttons: ButtonDef[], header?: string, footer?: string): Promise<void>;
export declare function sendList(restaurant: Restaurant, to: string, bodyText: string, buttonLabel: string, sections: ListSection[], header?: string, footer?: string): Promise<void>;
export declare function sendTemplate(restaurant: Restaurant, to: string, templateName: string, languageCode: string, bodyParams: string[]): Promise<void>;
export declare function markAsRead(restaurant: Restaurant, messageId: string): Promise<void>;
//# sourceMappingURL=sender.d.ts.map