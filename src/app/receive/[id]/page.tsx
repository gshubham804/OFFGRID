'use client';

import { useEffect, useState, use } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { File as FileIcon, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatBytes } from '@/utils/format';
import styles from './page.module.css';

interface FileMeta {
    id: string;
    name: string;
    size: number;
}

interface SessionData {
    id: string;
    files: FileMeta[];
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [session, setSession] = useState<SessionData | null>(null);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [currentFileName, setCurrentFileName] = useState('');
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState('');
    const [eta, setEta] = useState('');

    useEffect(() => {
        fetch(`/api/session/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Session not found or expired');
                return res.json();
            })
            .then(setSession)
            .catch(err => setError(err.message));
    }, [id]);

    const downloadFile = (file: FileMeta): Promise<void> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `/api/file/${session!.id}/${file.id}`);
            xhr.responseType = 'blob';

            const startTime = Date.now();

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    // Calculate Speed (Bytes/sec)
                    const now = Date.now();
                    const elapsed = (now - startTime) / 1000; // seconds
                    const totalSpeed = event.loaded / elapsed; // bytes per second average

                    setSpeed(`${formatBytes(totalSpeed)}/s`);

                    // Calculate ETA
                    const remaining = event.total - event.loaded;
                    const secondsLeft = remaining / totalSpeed;
                    setEta(secondsLeft < 60 ? `${Math.round(secondsLeft)}s` : `${Math.round(secondsLeft / 60)}m`);

                    // Update overall progress (simple version: per file progress mapped to total)
                    // Ideally we'd track total bytes of all files, but one-by-one is safer for memory.
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const blob = xhr.response;
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    resolve();
                } else {
                    reject(new Error('Download failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send();
        });
    };

    const handleDownload = async () => {
        if (!session) return;
        setDownloading(true);

        const totalFiles = session.files.length;
        let completed = 0;

        for (let i = 0; i < totalFiles; i++) {
            const file = session.files[i];
            setCurrentFileIndex(i + 1);
            setCurrentFileName(file.name);

            try {
                await downloadFile(file);
                completed++;
                setProgress((completed / totalFiles) * 100);
            } catch (e) {
                console.error(e);
            }
        }
        setDownloading(false);
        setSpeed('');
        setEta('');
        setCurrentFileName('');
    };

    if (error) {
        return (
            <div className={styles.container}>
                <Header />
                <main className={styles.main}>
                    <div className={styles.error}>
                        <AlertTriangle size={48} />
                        <h2>Connection Failed</h2>
                        <p>{error}</p>
                        <Button onClick={() => window.location.href = '/receive'}>Try Again</Button>
                    </div>
                </main>
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.container}>
                <Header />
                <main className={styles.main}>
                    <p className={styles.loading}>Connecting...</p>
                </main>
            </div>
        );
    }

    const isComplete = progress === 100;

    return (
        <div className={styles.container}>
            <Header />
            <main className={styles.main}>
                <div className={styles.status}>
                    {isComplete ? (
                        <div className={styles.success}>
                            <CheckCircle size={48} color="var(--success)" />
                            <h2>Received!</h2>
                        </div>
                    ) : (
                        <h2>{downloading ? `Receiving ${currentFileIndex}/${session.files.length}` : 'Files Ready'}</h2>
                    )}
                    {downloading && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{currentFileName}</p>}
                </div>

                <Card className={styles.fileList}>
                    {session.files.map(file => (
                        <div key={file.id} className={styles.fileItem} style={{ opacity: downloading && file.name !== currentFileName && !isComplete ? 0.5 : 1 }}>
                            <div className={styles.fileIcon}>
                                <FileIcon size={20} />
                            </div>
                            <div className={styles.fileInfo}>
                                <div className={styles.fileName}>{file.name}</div>
                                <div className={styles.fileSize}>{formatBytes(file.size)}</div>
                            </div>
                            {file.name === currentFileName && downloading && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-orange)', fontWeight: 'bold' }}>Processing...</div>
                            )}
                        </div>
                    ))}
                </Card>

                <div className={styles.footer}>
                    {downloading || isComplete ? (
                        <div className={styles.progressContainer}>
                            <ProgressBar progress={progress} label={isComplete ? "Complete" : `Total Progress ${Math.round(progress)}%`} />
                            {!isComplete && (
                                <div className={styles.meta}>
                                    <span>{speed}</span>
                                    <span>ETA: {eta}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Button fullWidth onClick={handleDownload}>
                            <Download size={20} />
                            Accept & Download
                        </Button>
                    )}
                </div>
            </main>
        </div>
    );
}
