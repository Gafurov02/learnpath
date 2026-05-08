'use client';

import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect, useState } from 'react';

type Props = {
    value: number;
};

export function AnimatedXP({
                               value,
                           }: Props) {
    const count = useMotionValue(0);
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        const controls = animate(count, value, {
            duration: 1.2,
        });

        return controls.stop;
    }, [count, value]);

    useEffect(() => {
        return count.on('change', (latest) => {
            setDisplay(Math.round(latest));
        });
    }, [count]);

    return (
        <motion.span>
            {display.toLocaleString()}
        </motion.span>
    );
}