'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type ScaleInProps = {
    children: ReactNode;
    delay?: number;
};

export function ScaleIn({
                            children,
                            delay = 0,
                        }: ScaleInProps) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                scale: 0.96,
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