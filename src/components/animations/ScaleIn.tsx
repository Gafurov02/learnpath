'use client';

import { motion } from 'framer-motion';

export function ScaleIn({
                            children,
                            delay = 0,
                        }: {
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                scale: 0.94,
            }}
            animate={{
                opacity: 1,
                scale: 1,
            }}
            transition={{
                duration: 0.35,
                delay,
                type: 'spring',
                stiffness: 140,
            }}
        >
            {children}
        </motion.div>
    );
}