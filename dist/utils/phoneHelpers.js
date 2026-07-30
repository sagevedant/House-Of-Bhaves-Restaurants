"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePhone = sanitizePhone;
exports.formatPhoneDisplay = formatPhoneDisplay;
/**
 * Sanitize a phone number into Meta-compliant format.
 * Strips spaces, dashes, parentheses, and '+' prefix.
 * Ensures Indian numbers start with '91'.
 */
function sanitizePhone(raw) {
    let cleaned = raw.replace(/[\s\-\(\)\+]/g, '');
    // If starts with 0, remove it
    if (cleaned.startsWith('0'))
        cleaned = cleaned.slice(1);
    // If 10 digits (Indian mobile), prepend 91
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
        cleaned = '91' + cleaned;
    }
    return cleaned;
}
/**
 * Format phone for display: +91 96995 33441
 */
function formatPhoneDisplay(phone) {
    const clean = sanitizePhone(phone);
    if (clean.length === 12 && clean.startsWith('91')) {
        return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
    }
    return `+${clean}`;
}
//# sourceMappingURL=phoneHelpers.js.map