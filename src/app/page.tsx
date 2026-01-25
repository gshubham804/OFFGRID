import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import styles from './page.module.css';
import { Header } from '@/components/layout/Header';

export default function Home() {
  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.logoPlaceholder}>
            <Image src="/logo.png" alt="OFFGRID Logo" width={80} height={80} priority />
          </div>
          <h1 className={styles.title}>OFFGRID</h1>

          <p className={styles.tagline}>Offline file transfer. No internet.</p>
        </div>

        <div className={styles.actions}>
          <Link href="/send" style={{ width: '100%' }}>
            <Button variant="primary" fullWidth className={styles.actionBtn}>
              <ArrowUpRight size={20} />
              Send
            </Button>
          </Link>

          <Link href="/receive" style={{ width: '100%' }}>
            <Button variant="secondary" fullWidth className={styles.actionBtn}>
              <ArrowDownLeft size={20} />
              Receive
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
