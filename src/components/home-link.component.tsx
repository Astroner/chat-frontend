import { FC, memo } from "react";
import { ButtonLink, ButtonLinkProps } from "./button-link/button-link.component";


export type HomeLinkProps = Omit<ButtonLinkProps, 'href' | 'color' | 'size' | 'icon'>;

export const HomeLink: FC<HomeLinkProps> = memo(props => {

    return (
        <ButtonLink {...props} href="/" color='orange' icon="arrow-back" size="small">Home</ButtonLink>
    )
})