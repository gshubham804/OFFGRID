import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';

export function Header() {
    return (
        <header className={styles.header}>
            <Link href="/" className={styles.logoContainer}>
                <Image src="/logo.png" alt="OFFGRID Logo" width={32} height={32} className={styles.icon} />
                <span className={styles.logoText}>OFFGRID</span>
            </Link>
        </header>
    );
}
