import { v4 as uuidv4 } from 'uuid';

export interface FileMeta {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    path: string; // Absolute path to stored file on server
}

export interface Session {
    id: string; // Short code e.g. A93K
    hostIp: string;
    files: FileMeta[];
    createdAt: number;
    expiresAt: number;
    // status tracking
    transferStarted: boolean;
    currentFileId?: string;
}

// Use globalThis to persist sessions across HMR in development
const globalForSessions = globalThis as unknown as { sessions: Map<string, Session> };
const sessions = globalForSessions.sessions || new Map<string, Session>();
if (process.env.NODE_ENV !== 'production') globalForSessions.sessions = sessions;

// Generate a short 4-char ID (uppercase alphanumeric)
function generateShortId(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function createSession(hostIp: string, files: Omit<FileMeta, 'id'>[]): Session {
    const id = generateShortId();
    const session: Session = {
        id,
        hostIp,
        files: files.map(f => ({ ...f, id: uuidv4() })),
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 30, // 30 mins expiry
        transferStarted: false,
    };
    sessions.set(id, session);
    return session;
}

export function updateSessionStatus(id: string, updates: Partial<Session>) {
    const session = sessions.get(id);
    if (session) {
        Object.assign(session, updates);
    }
}

export function getSession(id: string): Session | undefined {
    const session = sessions.get(id);
    // Check expiry
    if (session && Date.now() > session.expiresAt) {
        sessions.delete(id);
        return undefined;
    }
    return session;
}

export function deleteSession(id: string) {
    sessions.delete(id);
}
