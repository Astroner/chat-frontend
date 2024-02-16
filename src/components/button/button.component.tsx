import { CSSProperties, FC, ReactNode, memo } from 'react';
import { useClass } from '@dogonis/hooks';

import cn from './button.module.scss';

export type ButtonProps = {
    disabled?: boolean;

    onClick?: VoidFunction;

    children?: ReactNode;

    submit?: boolean;

    className?: string;
    style?: CSSProperties;
    margin?: string;
    variant?: 'purple' | 'orange';
    size?: 'small' | 'big'
};

export const Button: FC<ButtonProps> = memo((props) => {
    const root = useClass(
        cn.root,
        cn['root--' + (props.variant ?? 'purple')],
        cn['root--' + (props.size ?? 'big')],
        props.className,
    );

    const style = {
        ...props.style,
        margin: props.margin,
    };

    return (
        <button
            className={root}
            onClick={props.onClick}
            disabled={props.disabled}
            type={props.submit ? 'submit' : 'button'}
            style={style}
        >
            {props.children}
        </button>
    );
});
