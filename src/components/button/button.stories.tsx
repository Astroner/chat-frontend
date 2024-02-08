import { Meta, StoryObj } from '@storybook/react';

import { Button } from './button.component';

const meta: Meta<typeof Button> = {
    title: 'Button',
    component: Button,
    argTypes: {
        variant: {
            options: ['purple', 'orange'],
            control: { type: 'radio' },
        },
    },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: 'Text',
        disabled: false,
        submit: false,
        variant: 'purple',
    },
};
