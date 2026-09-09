"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.escapeCsvField = escapeCsvField;

/**
 * FIX (critical): customer names come from WhatsApp profile display names —
 * fully attacker-controlled free text — and were previously interpolated
 * directly into HTML template literals in the /restaurant/:slug dashboard
 * (stored XSS) with zero escaping.
 */
function escapeHtml(input) {
    if (input === null || input === undefined)
        return '';
    return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * FIX (critical): CSV export previously interpolated raw fields into quoted
 * CSV strings with no escaping of embedded quotes, and no protection
 * against CSV formula injection (a name/field starting with =, +, -, or @
 * executes as a formula when opened in Excel/Sheets — a classic vector for
 * exfiltrating data or running macros against whoever opens the export).
 */
function escapeCsvField(input) {
    let s = input === null || input === undefined ? '' : String(input);
    // Neutralize formula injection by prefixing a single quote if the field
    // starts with a formula-triggering character.
    if (/^[=+\-@\t\r]/.test(s)) {
        s = "'" + s;
    }
    // Escape embedded double quotes per CSV spec, then wrap in quotes.
    s = s.replace(/"/g, '""');
    return `"${s}"`;
}
//# sourceMappingURL=escape.js.map
