import { useClass } from '@dogonis/hooks';
import { CSSProperties, FC, memo, useEffect, useRef } from 'react';

import cn from './messages.module.scss';

export type MessageOrigin = 'CLIENT' | 'SERVER';

export type Message = {
    origin: MessageOrigin;
    text: string;
};

export type MessagesProps = {
    className?: string;
    style?: CSSProperties;

    messages: Message[];
};

export const Messages: FC<MessagesProps> = memo((props) => {
    const containerRef = useRef<HTMLUListElement>(null);

    const rootClass = useClass(props.className, cn.root);

    useEffect(() => {
        if (!containerRef.current) return;

        containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
        });
    }, []);

    return (
        <div style={props.style} className={rootClass}>
            <div className={cn['blur--top']} />
            <ul ref={containerRef} className={cn.list}>
                {props.messages.map((item, i) => (
                    <li
                        key={i}
                        className={
                            item.origin === 'CLIENT'
                                ? cn['message--client']
                                : cn['message--server']
                        }
                    >
                        {item.text}
                    </li>
                ))}
            </ul>
            <div className={cn['blur--bottom']} />
        </div>
    );
});
