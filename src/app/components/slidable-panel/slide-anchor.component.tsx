import { FC, ReactNode, memo, useContext } from "react";

import { SlidableContext } from "./slidable-panel.context";


export type SlideAnchorProps = {
    children?: ReactNode;

    className?: string
}

export const SlideAnchor: FC<SlideAnchorProps> = memo(props => {
    const api = useContext(SlidableContext);

    return (
        <div
            className={props.className}
            onTouchStart={(e) => api.touchStart(e.changedTouches.item(0))}
            onTouchMove={e => api.touchMove(e.touches.item(0))}
            onTouchEnd={() => api.touchEnd()}
        >
            {props.children}
        </div>
    )
})