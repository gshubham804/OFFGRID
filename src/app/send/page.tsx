'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { FileUp, FolderUp, Loader2, ArrowLeft, X, CheckCircle } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
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
    const [receiverConnected, setReceiverConnected] = useState(false);
    const [transferComplete, setTransferComplete] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
        }
        // clear value to allow selecting same files again if needed
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
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
                setReceiverConnected(true);

                conn.on('open', () => {
                    // Send metadata first
                    conn.send({
                        type: 'META',
                        files: files.map(f => ({ name: f.webkitRelativePath || f.name, size: f.size, type: f.type }))
                    });
                });

                let currentIdx = 0;

                const sendNextFile = () => {
                    if (currentIdx >= files.length) {
                        setProcessingFile(null);
                        setTransferComplete(true);
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 2500);
                        return;
                    }
                    
                    const file = files[currentIdx];
                    const displayName = file.webkitRelativePath || file.name;
                    setProcessingFile({ index: currentIdx + 1, name: displayName });
                    
                    conn.send({
                        type: 'FILE',
                        file: file,
                        name: displayName,
                        index: currentIdx + 1,
                        total: files.length
                    });
                };

                conn.on('data', (data: any) => {
                    if (data.type === 'ACCEPT') {
                        currentIdx = 0;
                        sendNextFile();
                    } else if (data.type === 'ACK') {
                        currentIdx++;
                        sendNextFile();
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
                            <h2>Send Items</h2>
                        </div>

                        <div className={styles.uploadRow}>
                            <Card className={styles.uploadCard} onClick={() => fileInputRef.current?.click()}>
                                <FileUp size={28} color="var(--primary-orange)" />
                                <h3>Add Files</h3>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    hidden
                                />
                            </Card>
                            
                            <Card className={styles.uploadCard} onClick={() => folderInputRef.current?.click()}>
                                <FolderUp size={28} color="var(--primary-orange)" />
                                <h3>Add Folder</h3>
                                <input
                                    type="file"
                                    multiple
                                    {...{ webkitdirectory: "true", directory: "true" }}
                                    ref={folderInputRef}
                                    onChange={handleFileChange}
                                    hidden
                                />
                            </Card>
                        </div>

                        {files.length > 0 && (
                            <div className={styles.fileList}>
                                <p className={styles.fileCount}>{files.length} items selected ({formatBytes(files.reduce((a, b) => a + b.size, 0))})</p>
                                
                                <div className={styles.selectedFilesList}>
                                    {files.map((file, idx) => {
                                        const displayName = file.webkitRelativePath || file.name;
                                        return (
                                            <div key={idx} className={styles.selectedFileItem}>
                                                <span className={styles.selectedFileName} title={displayName}>{displayName}</span>
                                                <button className={styles.removeBtn} onClick={() => removeFile(idx)}><X size={16} /></button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Button fullWidth onClick={handleStart} disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Start Server'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {session && (
                    <div className={styles.step}>
                        {transferComplete ? (
                                <div className={styles.successBox} style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                    <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
                                    <h2>Transfer Complete!</h2>
                                    <p style={{ color: 'var(--text-muted)' }}>Returning to home screen...</p>
                                </div>
                        ) : (
                           <>
                               <h2>{processingFile ? 'Sending Items...' : (receiverConnected ? 'Device Connected!' : 'Ready to Receive')}</h2>
        
                               {!processingFile && (
                                   <p className={styles.instruction}>
                                       {receiverConnected ? 'Waiting for receiver to accept the files...' : 'Scan this on the other device'}
                                   </p>
                               )}

                               {!receiverConnected && (
                                   <div className={styles.qrContainer}>
                                       {qrUrl && <img src={qrUrl} alt="QR Code" className={styles.qrCode} />}
                                       <div className={styles.sessionId}>{session.id}</div>
                                   </div>
                               )}
        
                               {processingFile ? (
                                   <div className={styles.processingBox}>
                                       <div style={{ marginBottom: '1rem', width: '100%' }}>
                                           <ProgressBar 
                                               progress={(processingFile.index / session.files.length) * 100} 
                                               label={`Sent ${processingFile.index} of ${session.files.length}`} 
                                           />
                                       </div>
                                       <h3 style={{ fontSize: '0.95rem', margin: 0, wordBreak: 'break-all' }}>{processingFile.name}</h3>
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
                           </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
