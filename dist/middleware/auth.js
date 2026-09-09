"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminAuth = requireAdminAuth;
const crypto_1 = require("crypto");
const config_1 = require("../config");
/**
 * FIX (critical): /agency, /onboard, /restaurant/:slug, /api/agency/*,
 * /api/restaurant/:slug/export previously had ZERO authentication. Any
 * tenant's full customer list (names + phone numbers) and the ability to
 * create arbitrary new tenants was reachable by anyone who guessed a URL.
 *
 * This middleware fails CLOSED: if ADMIN_BASIC_AUTH_USER/PASS are not
 * configured, every protected route returns 503 rather than falling open.
 * Uses HTTP Basic Auth with constant-time comparison to avoid timing attacks.
 *
 * For a production agency product this should be swapped for real
 * per-tenant session auth, but this closes the immediate data-exposure hole.
 */
function timingSafeEqual(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        // still run a comparison of equal length to avoid leaking length via timing
        (0, crypto_1.timingSafeEqual)(bufA, bufA);
        return false;
    }
    return (0, crypto_1.timingSafeEqual)(bufA, bufB);
}
function requireAdminAuth(req, res, next) {
    const { adminBasicAuthUser, adminBasicAuthPass } = config_1.config;
    if (!adminBasicAuthUser || !adminBasicAuthPass) {
        console.error('❌ [AUTH] Admin route blocked: ADMIN_BASIC_AUTH_USER/PASS not configured.');
        res.status(503).send('Admin access is not configured on this server.');
        return;
    }
    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme !== 'Basic' || !encoded) {
        res.set('WWW-Authenticate', 'Basic realm="HOB Admin"');
        res.status(401).send('Authentication required.');
        return;
    }
    let decoded;
    try {
        decoded = Buffer.from(encoded, 'base64').toString('utf8');
    }
    catch {
        res.status(401).send('Malformed credentials.');
        return;
    }
    const sepIdx = decoded.indexOf(':');
    if (sepIdx === -1) {
        res.status(401).send('Malformed credentials.');
        return;
    }
    const user = decoded.slice(0, sepIdx);
    const pass = decoded.slice(sepIdx + 1);
    const userOk = timingSafeEqual(user, adminBasicAuthUser);
    const passOk = timingSafeEqual(pass, adminBasicAuthPass);
    if (!userOk || !passOk) {
        res.set('WWW-Authenticate', 'Basic realm="HOB Admin"');
        res.status(401).send('Invalid credentials.');
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map