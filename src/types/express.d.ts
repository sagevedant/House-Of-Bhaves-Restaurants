
/// <reference types="node" />

declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export { };
