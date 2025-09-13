'use client';

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const InteractiveBarcode = () => {
    const barCount = 40;
    const [heights, setHeights] = useState<number[]>(Array(barCount).fill(50)); // fallback ثابت

    const variants = {
        initial: { backgroundColor: "#1f2937" },
        animate: (i: number) => ({
            backgroundColor: ["#facc15", "#1f2937"],
            transition: {
                delay: i * 0.05,
                duration: 1,
                repeat: Infinity,
                repeatDelay: barCount * 0.05,
            },
        }),
    };

    useEffect(() => {
        const newHeights = Array.from({ length: barCount }, () =>
            Math.floor(Math.random() * 75) + 25
        );
        setHeights(newHeights);
    }, []);

    return (
        <div className="flex h-16 w-full items-end gap-px overflow-hidden">
            {heights.map((h, i) => (
                <motion.div
                    key={i}
                    custom={i}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    style={{ height: `${h}%` }}
                    className="flex-1"
                />
            ))}
        </div>
    );
};
