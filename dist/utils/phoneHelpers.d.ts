/**
 * Sanitize a phone number into Meta-compliant format.
 * Strips spaces, dashes, parentheses, and '+' prefix.
 * Ensures Indian numbers start with '91'.
 */
export declare function sanitizePhone(raw: string): string;
/**
 * Format phone for display: +91 96995 33441
 */
export declare function formatPhoneDisplay(phone: string): string;
//# sourceMappingURL=phoneHelpers.d.ts.map