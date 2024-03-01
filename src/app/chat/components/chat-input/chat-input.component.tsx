import { FC, memo, useState } from 'react';

import { Input } from '@/src/components/input/input.component';

import cn from './chat-input.module.scss';
import { Button } from '@/src/components/button/button.component';
import { useClass } from '@dogonis/hooks';

export type ChatInputProps = {
    initialValue?: string;
    onSubmit?: (value: string) => void;

    offline?: boolean;
    className?: string;
};

export const ChatInput: FC<ChatInputProps> = memo((props) => {
    const [value, setValue] = useState(props.initialValue ?? '');

    const root = useClass(cn.root, props.className);

    const submit = () => {
        if (!props.onSubmit || !value) return;

        props.onSubmit(value);
        setValue('');
    };

    return (
        <form className={root} onSubmit={(e) => (e.preventDefault(), submit())}>
            <Input
                placeholder={props.offline ? 'Offline' : 'Message'}
                disabled={props.offline}
                className={cn.input}
                value={value}
                onChange={setValue}
            />
            <Button
                submit
                disabled={props.offline}
                margin="0 0 0 10px"
                color="orange"
                icon="send"
                iconColor="black"
            />
        </form>
    );
});
