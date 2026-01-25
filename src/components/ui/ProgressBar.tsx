import { motion } from 'framer-motion';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
    progress: number; // 0 to 100
    label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
    return (
        <div className={styles.container}>
            {label && <div className={styles.label}>{label}</div>}
            <div className={styles.track}>
                <motion.div
                    className={styles.fill}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                />
            </div>
        </div>
    );
}
