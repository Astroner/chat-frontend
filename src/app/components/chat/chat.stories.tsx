import { Meta, StoryObj } from '@storybook/react';

import { Chat } from './chat.component';

const meta: Meta<typeof Chat> = {
    title: 'Chat',
    component: Chat,
    decorators: [
        (Story) => (
            <div style={{ width: '100vw', height: '100vh' }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof Chat>;

export const Default: Story = {
    args: {
        messages: [
            {
                text: 'message',
                origin: 'CLIENT',
            },
        ],
    },
};
