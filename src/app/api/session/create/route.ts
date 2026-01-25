import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { getLocalIp } from '@/lib/network';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import os from 'os';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        const hostIp = getLocalIp();
        // Create a specific dir for offgrid
        const tempDir = join(os.tmpdir(), 'offgrid-sessions');
        await mkdir(tempDir, { recursive: true });

        const storedFiles = [];

        for (const file of files) {
            // Convert file to buffer and write
            const buffer = Buffer.from(await file.arrayBuffer());
            const uniqueName = `${Date.now()}-${file.name}`;
            const filePath = join(tempDir, uniqueName);

            await writeFile(filePath, buffer);

            storedFiles.push({
                name: file.name,
                size: file.size,
                mimeType: file.type || 'application/octet-stream',
                path: filePath
            });
        }

        const session = createSession(hostIp, storedFiles);
        return NextResponse.json(session);

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
