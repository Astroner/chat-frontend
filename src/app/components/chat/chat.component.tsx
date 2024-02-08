import { FC, memo } from "react";

import { Messages, Message } from "../messages/messages.component";
import { ChatInput } from "../chat-input/chat-input.component";

import cn from "./chat.module.scss";

export type ChatProps = {
    messages: Message[];
    onSubmit: (text: string) => void;
}

export const Chat: FC<ChatProps> = memo(props => {

    return (
        <div className={cn.root}>
            <div className={cn['messages-container']}>
                <Messages messages={props.messages} />
            </div>
            <ChatInput className={cn.input} onSubmit={props.onSubmit} />
        </div>
    )
})