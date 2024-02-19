import { FC, ReactNode, Touch, memo, useMemo, useState } from 'react';

import { SlidableContext, SlidableContextType } from './slidable-panel.context';

import cn from './slidable-panel.module.scss';

export type SlidablePanelProps = {
    open?: boolean;
    onStateChange: (nextState: boolean) => void;

    children?: ReactNode;
};

export const SlidablePanel: FC<SlidablePanelProps> = memo(
    ({ onStateChange, ...props }) => {
        const [slideTouch, setSlideTouch] = useState<Touch | null>(null);

        const [touchShift, setTouchShift] = useState(0);
        const [touchSpeed, setTouchPanelSpeed] = useState(0);

        const api = useMemo<SlidableContextType>(
            () => ({
                touchStart: (t) => setSlideTouch(t),
                touchMove: (t) => {
                    if (!slideTouch) return;

                    const nextShift = t.clientY - slideTouch.clientY;

                    const nextSpeed = nextShift - touchShift;

                    setTouchPanelSpeed((p) => {
                        if (
                            nextSpeed / Math.abs(nextSpeed) !==
                                p / Math.abs(p) ||
                            Math.abs(nextSpeed) > Math.abs(p)
                        )
                            return nextSpeed;

                        return p;
                    });

                    setTouchShift(nextShift);
                },
                touchEnd: () => {
                    setSlideTouch(null);

                    if (
                        touchSpeed < -30 ||
                        Math.abs(touchShift) > window.innerHeight / 2
                    )
                        onStateChange(true);
                    else onStateChange(false);

                    setTouchPanelSpeed(0);
                    setTouchShift(0);
                },
            }),
            [onStateChange, slideTouch, touchShift, touchSpeed],
        );

        const panelTop = useMemo(() => {
            const base = !props.open ? '100% - 80px' : '20vh';

            if (!touchShift) {
                return `calc(${base})`;
            }

            return `calc(${base} + ${touchShift}px)`;
        }, [props.open, touchShift]);

        return (
            <SlidableContext.Provider value={api}>
                <div
                    style={{
                        top: panelTop,
                        transition: !slideTouch ? 'top .5s' : 'unset',
                    }}
                    className={cn.root}
                >
                    {props.children}
                </div>
            </SlidableContext.Provider>
        );
    },
);
