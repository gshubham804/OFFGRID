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
    const [conn, setConn] = useState<any>(null);

    useEffect(() => {
        import('peerjs').then(({ default: Peer }) => {
            const peer = new Peer();
            
            peer.on('error', (err) => {
                setError('PeerJS Error: ' + err.message);
            });

            peer.on('open', () => {
                const connection = peer.connect(id);
                
                connection.on('open', () => {
                    setConn(connection);
                });

                connection.on('data', (data: any) => {
                    if (data.type === 'META') {
                        setSession({
                            id,
                            files: data.files.map((f: any, i: number) => ({ ...f, id: i.toString() }))
                        });
                    } else if (data.type === 'FILE') {
                        // Create object URL and trigger download
                        const blob = new Blob([data.file], { type: data.file.type });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = data.name;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        
                        setCurrentFileIndex(data.index);
                        setCurrentFileName(data.name);
                        setProgress((data.index / data.total) * 100);
                        
                        if (data.index === data.total) {
                            setTimeout(() => setDownloading(false), 1000);
                        }
                    }
                });

                connection.on('error', () => setError('Connection failed'));
            });
        });
    }, [id]);

    const handleDownload = () => {
        if (!conn || !session) return;
        setDownloading(true);
        conn.send({ type: 'ACCEPT' }); // Tell sender to start streaming files
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
                    <p className={styles.loading}>Connecting to {id}...</p>
                </main>
            </div>
        );
    }

    const isComplete = progress >= 100;

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
                    {session.files.map((file) => (
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
                            <ProgressBar 
                                progress={progress} 
                                label={isComplete ? "Complete" : `Received ${currentFileIndex} of ${session.files.length} items (${Math.round(progress)}%)`} 
                            />
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
