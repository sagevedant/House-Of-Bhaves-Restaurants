
/// <reference types="node" />

export interface AuthUser {
  id: number;
  email: string;
  role: 'agency_admin' | 'client_owner';
  clientId?: number | null;
}

declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      user?: AuthUser;
    }
  }
}

export { };

