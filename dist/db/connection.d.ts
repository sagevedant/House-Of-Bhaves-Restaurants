import * as schema from './schema';
export declare const sqlite: import("@libsql/client").Client;
export declare const db: import("drizzle-orm/libsql").LibSQLDatabase<typeof schema> & {
    $client: import("@libsql/client").Client;
};
export declare function initializeDatabase(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map