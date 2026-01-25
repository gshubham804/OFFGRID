import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = getSession(id);

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Return transfer status
    return NextResponse.json({
        transferStarted: session.transferStarted,
        currentFileId: session.currentFileId
    });
}
