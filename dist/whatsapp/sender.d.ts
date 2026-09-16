import type { Client } from '../db/schema';
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
export declare function callMessagesApi(client: Client, payload: object): Promise<void>;
export declare function sendText(client: Client, to: string, text: string): Promise<void>;
export declare function sendButtons(client: Client, to: string, bodyText: string, buttons: ButtonDef[], header?: string, footer?: string): Promise<void>;
export declare function sendList(client: Client, to: string, bodyText: string, buttonLabel: string, sections: ListSection[], header?: string, footer?: string): Promise<void>;
export declare function sendTemplate(client: Client, to: string, templateName: string, languageCode: string, bodyParams: string[]): Promise<void>;
export declare function markAsRead(client: Client, messageId: string): Promise<void>;
//# sourceMappingURL=sender.d.ts.map