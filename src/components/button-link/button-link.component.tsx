import { FC, MouseEvent, memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { useClass } from "@dogonis/hooks";

import { Button, ButtonProps } from "../button/button.component";

import cn from "./button-link.module.scss";

export type ButtonLinkProps = ButtonProps & {
    href: string;
}

export const ButtonLink: FC<ButtonLinkProps> = memo(({
    href,
    className,
    style,
    disabled,
    margin,
    ...props
}) => {

    const root = useClass(
        cn.root,
        className
    );

    const linkStyle = useMemo(() => ({
        ...style,
        margin
    }), [margin, style])

    const click = useCallback((e: MouseEvent) => {
        if(disabled) e.preventDefault();
    }, [disabled])

    return (
        <Link onClick={click} className={root} style={linkStyle} href={href}>
            <Button {...props} disabled={disabled} >{props.children}</Button>
        </Link>
    )
})