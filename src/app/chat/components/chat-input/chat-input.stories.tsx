import { Meta, StoryObj } from '@storybook/react';

import { ChatInput } from './chat-input.component';

const meta: Meta<typeof ChatInput> = {
    title: 'Components/Chat Input',
    component: ChatInput,
};

export default meta;

type Story = StoryObj<typeof ChatInput>;

export const Default: Story = {
    args: {
        offline: false,
    },
};
