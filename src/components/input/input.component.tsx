import { FC, memo } from 'react';

import { useClass } from '@dogonis/hooks';

import cn from './input.module.scss';

export type InputProps = {
    value?: string;
    onChange?: (next: string) => void;
    className?: string;
    placeholder?: string;
    password?: boolean;
    disabled?: boolean;
};

export const Input: FC<InputProps> = memo((props) => {
    const rootClass = useClass(cn.root, props.className);

    return (
        <input
            placeholder={props.placeholder}
            value={props.value}
            onChange={(e) => props.onChange && props.onChange(e.target.value)}
            disabled={props.disabled}
            className={rootClass}
            type={props.password ? 'password' : 'text'}
        />
    );
});
