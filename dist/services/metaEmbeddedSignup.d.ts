export interface TokenExchangeResult {
    accessToken: string;
    tokenType: string;
    expiresIn?: number;
}
export interface TokenDebugInfo {
    appId: string;
    type: string;
    application: string;
    dataAccessExpiresAt?: number;
    expiresAt: number;
    isValid: boolean;
    scopes: string[];
    granularScopes?: Array<{
        scope: string;
        targetIds?: string[];
    }>;
    userId?: string;
}
export interface WabaPhoneNumber {
    id: string;
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
}
/**
 * Exchange the short-lived OAuth authorization code returned by Meta's FB.login / Embedded Signup flow
 * for a System User / Delegated Access Token.
 */
export declare function exchangeCodeForAccessToken(code: string): Promise<TokenExchangeResult>;
/**
 * Inspect an access token using Meta's debug_token endpoint.
 * This extracts granular scopes (including shared WABA IDs and Business Portfolio IDs).
 */
export declare function debugToken(inputToken: string): Promise<TokenDebugInfo>;
/**
 * Subscribe the Agency App to the client's WABA Webhooks.
 * This enables the agency server to receive messages and status callbacks for the client's phone numbers.
 */
export declare function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<boolean>;
/**
 * Fetch phone numbers associated with a WABA.
 */
export declare function getWabaPhoneNumbers(wabaId: string, accessToken: string): Promise<WabaPhoneNumber[]>;
//# sourceMappingURL=metaEmbeddedSignup.d.ts.map