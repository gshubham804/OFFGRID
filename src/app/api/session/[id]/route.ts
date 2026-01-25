import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = getSession(id);

    if (!session) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    // Return public session info (excluding local paths)
    const publicFiles = session.files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType
    }));

    return NextResponse.json({
        id: session.id,
        hostIp: session.hostIp,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        files: publicFiles
    });
}
