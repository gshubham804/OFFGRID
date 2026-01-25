'use client';

import { useState, useRef, useEffect } from 'react';
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
    hostIp: string;
    files: any[];
}

export default function SenderPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [processingFile, setProcessingFile] = useState<{ index: number, name: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Polling for progress
    useEffect(() => {
        if (!session) return;

        let interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/session/${session.id}/status`);
                if (res.ok) {
                    const status = await res.json();
                    if (status.transferStarted) {
                        const fileIdx = session.files.findIndex((f: any) => f.id === status.currentFileId);
                        if (fileIdx !== -1) {
                            const currentFile = session.files[fileIdx];
                            setProcessingFile({ index: fileIdx + 1, name: currentFile.name });
                        }
                    }
                }
            } catch (e) {
                // ignore polling errors
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [session]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleStart = async () => {
        if (files.length === 0) return;

        setLoading(true);
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            const res = await fetch('/api/session/create', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to create session');

            const data = await res.json();
            setSession(data);

            // Generate QR
            // URL: http://<HOST_IP>:3000/receive/<SESSION_ID>
            const url = `http://${data.hostIp}:3000/receive/${data.id}`;
            const qrDataUrl = await QRCode.toDataURL(url, { margin: 2, scale: 10, color: { dark: '#FF7A00', light: '#FFFFFF' } });
            setQrUrl(qrDataUrl);

        } catch (err) {
            console.error(err);
            alert('Error creating session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Header />
            <main className={styles.main}>
                {/* Step 1: File Selection */}
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
                                <p>Works on Local Wi-Fi or Hotspot</p>
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

                {/* Step 2: Session Active (QR) */}
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
                                <p className={styles.url}>http://{session.hostIp}:3000/receive/{session.id}</p>
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
