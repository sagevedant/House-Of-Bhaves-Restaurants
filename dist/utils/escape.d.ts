/**
 * FIX (critical): customer names come from WhatsApp profile display names —
 * fully attacker-controlled free text — and were previously interpolated
 * directly into HTML template literals in the /restaurant/:slug dashboard
 * (stored XSS) with zero escaping.
 */
export declare function escapeHtml(input: unknown): string;
/**
 * FIX (critical): CSV export previously interpolated raw fields into quoted
 * CSV strings with no escaping of embedded quotes, and no protection
 * against CSV formula injection (a name/field starting with =, +, -, or @
 * executes as a formula when opened in Excel/Sheets — a classic vector for
 * exfiltrating data or running macros against whoever opens the export).
 */
export declare function escapeCsvField(input: unknown): string;
//# sourceMappingURL=escape.d.ts.map