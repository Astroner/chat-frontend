import { Console } from "./console.class";

type Devtools = {
    console: Console;
}

let devtools: Devtools;

export const getDevtools = (): Devtools => {
    return devtools!;
}

export const initDevtools = () => {
    if(typeof window === 'undefined') return;

    const console = new Console();

    console.init();

    devtools = {
        console
    };

    return devtools
}