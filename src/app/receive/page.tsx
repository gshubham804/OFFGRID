'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function ReceivePage() {
    const [id, setId] = useState('');
    const router = useRouter();

    const handleConnect = () => {
        if (id.length >= 4) {
            router.push(`/receive/${id.toUpperCase()}`);
        }
    };

    return (
        <div className={styles.container}>
            <Header />
            <main className={styles.main}>
                <div className={styles.headerRow}>
                    <Link href="/"><ArrowLeft className={styles.backIcon} /></Link>
                    <h2>Receive Files</h2>
                </div>

                <Card className={styles.inputCard}>
                    <h3>Enter Transfer ID</h3>
                    <p>Enter the 4-digit code from the sender.</p>

                    <input
                        type="text"
                        value={id}
                        onChange={(e) => setId(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="e.g. A9K4"
                        className={styles.input}
                    />

                    <Button
                        fullWidth
                        onClick={handleConnect}
                        disabled={id.length < 4}
                    >
                        Connect <ArrowRight size={18} />
                    </Button>
                </Card>
            </main>
        </div>
    );
}
