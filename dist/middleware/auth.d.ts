import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../types/express';
declare const AUTH_COOKIE_NAME = "auth_token";
export declare const loginLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare function hashPassword(plainText: string): Promise<string>;
export declare function comparePassword(plainText: string, hash: string): Promise<boolean>;
export declare function generateToken(user: AuthUser): string;
export declare function verifyToken(token: string): AuthUser | null;
/**
 * Ensures the request is authenticated via JWT in httpOnly cookie,
 * Bearer header, or deprecated HTTP Basic Auth fallback.
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Backward compatibility alias for requireAuth
 */
export declare const requireAdminAuth: typeof requireAuth;
/**
 * Role-Based Access Control Middleware
 * Restricts access to users with specified role(s).
 */
export declare function requireRole(allowedRoles: ('agency_admin' | 'client_owner')[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Multi-Tenant Access Control Middleware
 * - agency_admin can access any restaurant/tenant.
 * - client_owner can ONLY access the restaurant/tenant associated with their clientId.
 */
export declare function requireTenantAccess(slugParam?: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export { AUTH_COOKIE_NAME };
//# sourceMappingURL=auth.d.ts.map