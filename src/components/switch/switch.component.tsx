import { CSSProperties, FC, memo } from "react";

import cn from "./switch.module.scss";
import { useClass } from "@dogonis/hooks";

export type SwitchProps = {
    value?: boolean;
    onChange?: (next: boolean) => void;

    disabled?: boolean;
    size?: 'small' | 'big';
    
    className?: string;
    style?: CSSProperties;
}

export const Switch: FC<SwitchProps> = memo(({ size = 'big', ...props }) => {

    const root = useClass(
        cn.root,
        props.value ? cn['root--on'] : cn['root--off'],
        cn['root--' + size],
        props.className
    )

    const dot = useClass(
        cn.dot,
        props.value ? cn['dot--on'] : cn['dot--off'],
        cn['dot--' + size]
    )

    const toggle = () => {
        if(props.disabled) return;
        props.onChange && props.onChange(!props.value);
    }

    return (
        <div
            className={root}
            style={props.style}
            
            tabIndex={0}
            role="checkbox"
            aria-checked={props.value ? "true" : "false"}

            aria-disabled={props.disabled ? "true" : "false"}
            onClick={toggle}
        >
            <div className={dot} />
        </div>
    )
})