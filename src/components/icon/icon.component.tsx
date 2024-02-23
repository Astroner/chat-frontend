import { FC, memo } from 'react';
import { useClass } from '@dogonis/hooks';

import { IconsDict, IconName } from './icons';

import cn from './icon.module.scss';

export type IconColor = 'orange' | 'light-purple' | 'dark-purple' | 'black';

export type IconProps = {
    name: IconName;

    size?: 'small' | 'big';

    color?: IconColor;

    className?: string;
};

export const Icon: FC<IconProps> = memo((props) => {
    const Component = IconsDict[props.name];

    const root = useClass(
        cn.root,
        cn['root--' + (props.color ?? 'orange')],
        cn['root--' + (props.size ?? 'big')],
        props.className,
    );

    return <Component className={root} />;
});
