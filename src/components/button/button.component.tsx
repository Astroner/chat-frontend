import {
    CSSProperties,
    FC,
    HTMLAttributes,
    ReactComponentElement,
    ReactNode,
    memo,
} from 'react';
import { useClass } from '@dogonis/hooks';

import { IconName } from '../icon/icons';

import cn from './button.module.scss';
import { Icon, IconColor } from '../icon/icon.component';

export type ButtonProps = HTMLAttributes<HTMLButtonElement> & {
    disabled?: boolean;

    children?: ReactNode;

    submit?: boolean;

    margin?: string;
    color?: 'purple' | 'orange';
    size?: 'small' | 'big';

    icon?: IconName;
    iconColor?: IconColor;
};

export const Button: FC<ButtonProps> = memo(
    ({
        color,
        size,
        children,
        className,
        margin,
        style: styleProps,
        disabled,
        submit,
        icon,
        iconColor,
        ...rest
    }) => {
        const root = useClass(
            cn.root,
            cn['root--' + (color ?? 'purple')],
            cn[
                'root--' +
                    (size ?? 'big') +
                    (icon && !children ? '' : '--padding')
            ],
            className,
        );

        const style = {
            ...styleProps,
            margin: margin,
        };

        return (
            <button
                {...rest}
                className={root}
                disabled={disabled}
                type={submit ? 'submit' : 'button'}
                style={style}
            >
                {icon && (
                    <Icon
                        className={cn.icon}
                        name={icon}
                        size={size}
                        color={
                            iconColor ??
                            (color === 'orange' ? 'black' : 'light-purple')
                        }
                    />
                )}
                {children}
            </button>
        );
    },
);
