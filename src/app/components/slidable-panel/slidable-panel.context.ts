import { Touch, createContext } from "react";

export type SlidableContextType = {
    touchStart: (t: Touch) => void,
    touchMove: (t: Touch) => void,
    touchEnd: () => void,
}

export const SlidableContext = createContext<SlidableContextType>({
    touchStart: function (t: Touch): void {
        throw new Error("Function not implemented.");
    },
    touchMove: function (t: Touch): void {
        throw new Error("Function not implemented.");
    },
    touchEnd: function (): void {
        throw new Error("Function not implemented.");
    }
})

