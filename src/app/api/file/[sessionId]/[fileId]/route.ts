import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';

// Helper to convert Node stream to Web stream
function nodeStreamToIterator(stream: Readable) {
    return async function* () {
        for await (const chunk of stream) {
            yield chunk;
        }
    }();
}

function iteratorToStream(iterator: AsyncGenerator<any>) {
    return new ReadableStream({
        async pull(controller) {
            const { value, done } = await iterator.next();
            if (done) {
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
    });
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string; fileId: string }> }
) {
    const { sessionId, fileId } = await params;
    const session = getSession(sessionId);

    if (!session) {
        return NextResponse.json({ error: 'Session expired' }, { status: 404 });
    }

    const file = session.files.find(f => f.id === fileId);
    if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Update Session Status
    // We import this dynamically or ensure no circular dep issues, but here it's fine since it's the same lib
    const { updateSessionStatus } = require('@/lib/session');
    updateSessionStatus(sessionId, {
        transferStarted: true,
        currentFileId: fileId
    });

    try {
        const stats = statSync(file.path);
        const stream = createReadStream(file.path);

        // Modern Next.js way to stream files is returning a Response with a ReadableStream
        // We can use the iterable directly to create a Web ReadableStream
        const data: ReadableStream = iteratorToStream(nodeStreamToIterator(stream));

        return new Response(data, {
            headers: {
                'Content-Type': file.mimeType,
                'Content-Length': stats.size.toString(),
                'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
            },
        });

    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'File read failed' }, { status: 500 });
    }
}
