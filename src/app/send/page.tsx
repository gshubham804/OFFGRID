'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { FileUp, Loader2, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';
import Link from 'next/link';
import styles from './page.module.css';
import { formatBytes } from '@/utils/format';

interface Session {
    id: string;
    files: any[];
}

function generateShortId(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export default function SenderPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [processingFile, setProcessingFile] = useState<{ index: number, name: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleStart = async () => {
        if (files.length === 0) return;
        setLoading(true);

        try {
            const PeerModule = (await import('peerjs')).default;
            const newId = generateShortId();
            const peer = new PeerModule(newId);

            peer.on('open', async (id) => {
                setSession({ id, files });
                setLoading(false);
                
                const url = `${window.location.origin}/receive/${id}`;
                const qrDataUrl = await QRCode.toDataURL(url, { margin: 2, scale: 10, color: { dark: '#FF7A00', light: '#FFFFFF' } });
                setQrUrl(qrDataUrl);
            });

            peer.on('connection', (conn) => {
                conn.on('open', () => {
                    // Send metadata first
                    conn.send({
                        type: 'META',
                        files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
                    });
                });

                conn.on('data', (data: any) => {
                    if (data.type === 'ACCEPT') {
                        // Send each file natively as Blobs
                        for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            setProcessingFile({ index: i + 1, name: file.name });
                            
                            conn.send({
                                type: 'FILE',
                                file: file,
                                name: file.name,
                                index: i + 1,
                                total: files.length
                            });
                        }

                        setTimeout(() => {
                            setProcessingFile(null); // Clear processing once queued
                        }, 500);
                    }
                });
            });

            peer.on('error', (err) => {
                console.error(err);
                alert('Peer connection error');
                setLoading(false);
            });

        } catch (err) {
            console.error(err);
            alert('Error creating session');
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Header />
            <main className={styles.main}>
                {!session && (
                    <div className={styles.step}>
                        <div className={styles.headerRow}>
                            <Link href="/"><ArrowLeft className={styles.backIcon} /></Link>
                            <h2>Send Files</h2>
                        </div>

                        <Card className={styles.uploadCard} onClick={() => fileInputRef.current?.click()}>
                            <div className={styles.uploadPlaceholder}>
                                <div className={styles.iconCircle}>
                                    <FileUp size={32} color="var(--primary-orange)" />
                                </div>
                                <h3>Select files to send</h3>
                                <p>Works on any device with a browser</p>
                            </div>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                hidden
                            />
                        </Card>

                        {files.length > 0 && (
                            <div className={styles.fileList}>
                                <p className={styles.fileCount}>{files.length} files selected ({formatBytes(files.reduce((a, b) => a + b.size, 0))})</p>
                                <Button fullWidth onClick={handleStart} disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Start Server'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {session && (
                    <div className={styles.step}>
                        <h2>{processingFile ? 'Sending Files...' : 'Ready to Receive'}</h2>

                        {!processingFile && <p className={styles.instruction}>Scan this on the other device</p>}

                        <div className={styles.qrContainer}>
                            {qrUrl && <img src={qrUrl} alt="QR Code" className={styles.qrCode} />}
                            <div className={styles.sessionId}>{session.id}</div>
                        </div>

                        {processingFile ? (
                            <div className={styles.processingBox}>
                                <p>Sending file {processingFile.index} of {session.files.length}</p>
                                <h3>{processingFile.name}</h3>
                                <div className={styles.spinner}><Loader2 className="animate-spin" color="#FF7A00" /></div>
                            </div>
                        ) : (
                            <div className={styles.infoBox}>
                                <p>Ensure both devices are on the same Wi-Fi.</p>
                                <p className={styles.url}>Or visit on any device</p>
                            </div>
                        )}

                        <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
                            Stop Transfer
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
