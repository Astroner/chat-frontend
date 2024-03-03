import { FC, memo, useCallback } from 'react';

import { Button } from '@/src/components/button/button.component';

import cn from './requests.module.scss';

export type RequestProps = {
    id: string;
    from: string;
    onAccept: (id: string, from: string) => void;
    onDecline: (id: string) => void;
};

export const Request: FC<RequestProps> = memo(
    ({ onAccept, onDecline, ...props }) => {
        const accept = useCallback(() => {
            onAccept(props.id, props.from);
        }, [onAccept, props.from, props.id]);

        const decline = useCallback(() => {
            onDecline(props.id);
        }, [onDecline, props.id]);

        return (
            <div className={cn.invite}>
                <h3>{props.from}</h3>
                <div className={cn.buttons}>
                    <Button
                        icon="send"
                        size="small"
                        color="orange"
                        onClick={accept}
                    />
                    <Button icon="close" size="small" onClick={decline} />
                </div>
            </div>
        );
    },
);
