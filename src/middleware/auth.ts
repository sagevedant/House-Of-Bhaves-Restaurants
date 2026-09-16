import { timingSafeEqual as cryptoTimingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { db } from '../db/connection';
import { clients, restaurants } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { AuthUser } from '../types/express';

const AUTH_COOKIE_NAME = 'auth_token';

// ----------------------------------------------------
// Rate Limiter for Login Endpoint (Prevent Brute Force)
// ----------------------------------------------------
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
  handler: (req: Request, res: Response) => {
    const isApiRequest = req.path.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isApiRequest) {
      res.status(429).json({ error: 'Too many login attempts from this IP, please try again after 15 minutes.' });
    } else {
      res.status(429).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Too Many Attempts | House of Bhaves</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body { background: #0D0C0B; color: #F3EFE6; font-family: 'Instrument Sans', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #171614; border: 1px solid #2D2923; padding: 40px; border-radius: 16px; text-align: center; max-width: 420px; }
            h2 { color: #EF4444; margin-bottom: 12px; font-size: 22px; }
            p { color: #A8A29E; font-size: 14px; line-height: 1.6; }
            a { display: inline-block; margin-top: 20px; color: #F59E0B; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚠️ Too Many Login Attempts</h2>
            <p>You have exceeded the maximum allowed login attempts. Please wait 15 minutes before trying again.</p>
            <a href="/login">← Return to Login</a>
          </div>
        </body>
        </html>
      `);
    }
  }
});

// ----------------------------------------------------
// Cryptographic & Token Utilities
// ----------------------------------------------------

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId ?? null,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (!decoded || !decoded.id || !decoded.email || !decoded.role) {
      return null;
    }
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      clientId: decoded.clientId ?? null,
    };
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    cryptoTimingSafeEqual(bufA, bufA);
    return false;
  }
  return cryptoTimingSafeEqual(bufA, bufB);
}

/**
 * Check for deprecated HTTP Basic Auth header.
 * Logs a warning if used, allowing a grace period before complete removal.
 */
function checkBasicAuthFallback(req: Request): AuthUser | null {
  const { adminBasicAuthUser, adminBasicAuthPass } = config;
  if (!adminBasicAuthUser || !adminBasicAuthPass) return null;

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return null;

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sepIdx = decoded.indexOf(':');
    if (sepIdx === -1) return null;

    const user = decoded.slice(0, sepIdx);
    const pass = decoded.slice(sepIdx + 1);

    if (timingSafeEqual(user, adminBasicAuthUser) && timingSafeEqual(pass, adminBasicAuthPass)) {
      console.warn(
        `⚠️ [DEPRECATION WARNING] HTTP Basic Auth used on ${req.method} ${req.originalUrl || req.url}. ` +
        `This fallback is deprecated and will be removed in the next release. Migrate to /login session/JWT cookies.`
      );
      return {
        id: 0,
        email: 'legacy-basic-admin@houseofbhaves.com',
        role: 'agency_admin',
        clientId: null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------

/**
 * Ensures the request is authenticated via JWT in httpOnly cookie,
 * Bearer header, or deprecated HTTP Basic Auth fallback.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // 1. Check httpOnly cookie
  let token = req.cookies?.[AUTH_COOKIE_NAME];

  // 2. Check Authorization Bearer header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // 3. Check deprecated HTTP Basic Auth fallback
  const basicUser = checkBasicAuthFallback(req);
  if (basicUser) {
    req.user = basicUser;
    return next();
  }

  // 4. Handle Unauthenticated Requests
  const isApiRequest = req.path.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
  if (isApiRequest) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Redirect browser GET requests to /login
  const returnUrl = encodeURIComponent(req.originalUrl || req.url);
  res.redirect(`/login?redirect=${returnUrl}`);
}

/**
 * Backward compatibility alias for requireAuth
 */
export const requireAdminAuth = requireAuth;

/**
 * Role-Based Access Control Middleware
 * Restricts access to users with specified role(s).
 */
export function requireRole(allowedRoles: ('agency_admin' | 'client_owner')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return requireAuth(req, res, () => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
          const isApi = req.path.startsWith('/api/') || req.xhr;
          if (isApi) {
            res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
          } else {
            res.status(403).send('Forbidden: Insufficient privileges.');
          }
          return;
        }
        next();
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      const isApiRequest = req.path.startsWith('/api/') || req.xhr;
      if (isApiRequest) {
        res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
      } else {
        res.status(403).send('Forbidden: Insufficient privileges.');
      }
      return;
    }

    next();
  };
}

/**
 * Multi-Tenant Access Control Middleware
 * - agency_admin can access any restaurant/tenant.
 * - client_owner can ONLY access the restaurant/tenant associated with their clientId.
 */
export function requireTenantAccess(slugParam = 'slug') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return requireAuth(req, res, () => {
        requireTenantAccess(slugParam)(req, res, next);
      });
    }

    // Agency admin has unrestricted access to all tenants
    if (req.user.role === 'agency_admin') {
      return next();
    }

    // Client owners must have an assigned clientId
    if (!req.user.clientId) {
      const isApi = req.path.startsWith('/api/') || req.xhr;
      if (isApi) {
        res.status(403).json({ error: 'Forbidden: No client tenant assigned to this account.' });
      } else {
        res.status(403).send('Forbidden: No client tenant assigned to this account.');
      }
      return;
    }

    const rawSlug = req.params[slugParam];
    const targetSlug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug || '');

    if (!targetSlug) {
      return next();
    }

    try {
      // Find client with this slug
      const client = await db.select().from(clients).where(eq(clients.slug, targetSlug)).get();
      if (client) {
        if (client.id === req.user.clientId) {
          return next();
        } else {
          const isApi = req.path.startsWith('/api/') || req.xhr;
          if (isApi) {
            res.status(403).json({ error: 'Forbidden: You do not have access to this tenant.' });
          } else {
            res.status(403).send('Forbidden: You do not have permission to view this restaurant.');
          }
          return;
        }
      }

      // Check legacy restaurants table
      const rest = await db.select().from(restaurants).where(eq(restaurants.slug, targetSlug)).get();
      if (rest) {
        // If the legacy restaurant ID matches clientId or client slug matches
        if (rest.id === req.user.clientId) {
          return next();
        }
      }

      // If tenant not found or mismatched
      const isApi = req.path.startsWith('/api/') || req.xhr;
      if (isApi) {
        res.status(403).json({ error: 'Forbidden: You do not have permission to view this restaurant.' });
      } else {
        res.status(403).send('Forbidden: You do not have permission to view this restaurant.');
      }
    } catch (err) {
      console.error('Tenant access check error:', err);
      res.status(500).send('Internal Server Error during authorization');
    }
  };
}

export { AUTH_COOKIE_NAME };
