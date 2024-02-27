import { FC, memo } from 'react';
import {
    ButtonLink,
    ButtonLinkProps,
} from './button-link/button-link.component';

export type HomeLinkProps = Omit<
    ButtonLinkProps,
    'href' | 'size' | 'icon'
>;

export const HomeLink: FC<HomeLinkProps> = memo(({ color, ...props }) => {
    return (
        <ButtonLink
            {...props}
            href="/"
            color={color ?? "orange"}
            icon="arrow-back"
            size="small"
        >
            Home
        </ButtonLink>
    );
});
