import { CSSProperties, FC, memo, useEffect, useRef, useState } from 'react';

export type DotsLoaderProps = {
    className?: string;
    style?: CSSProperties;
};

const DOT_TTL = 200;

export const DotsLoader: FC<DotsLoaderProps> = memo((props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [size, setSize] = useState<{ w: number; h: number } | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!canvasRef.current || !container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        setSize({ w: width, h: height });

        const ctx = canvasRef.current.getContext('2d');

        if (!ctx) return;

        const dots = new Set<{ x: number; y: number; createdAt: number }>();

        let animationID = 0;
        let tick = 0;
        const draw = () => {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, width, height);

            dots.add({
                x: Math.random() * width,
                y: Math.random() * height,
                createdAt: tick,
            });

            dots.forEach((dot) => {
                if (tick - dot.createdAt > DOT_TTL) {
                    dots.delete(dot);
                    return;
                }

                const progress = (tick - dot.createdAt) / DOT_TTL;

                const alpha = -4 * (progress - 0.5) ** 2 + 1;

                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillRect(dot.x, dot.y, 2, 2);
            });

            tick++;
            animationID = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationID);
        };
    }, []);

    return (
        <div ref={containerRef} className={props.className} style={props.style}>
            <canvas
                ref={canvasRef}
                width={size?.w}
                height={size?.h}
                style={size ? { width: size.w, height: size.h } : undefined}
            />
        </div>
    );
});
