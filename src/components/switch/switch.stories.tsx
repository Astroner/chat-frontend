import { Meta, StoryObj } from '@storybook/react';

import { Switch } from './switch.component';

const meta: Meta<typeof Switch> = {
    title: 'Components/Switch',
    component: Switch,
    argTypes: {
        size: {
            type: {
                name: 'enum',
                value: ['small', 'big'],
            },
        },
    },
};

export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {
        value: true,
        size: 'big',
        disabled: false,
    },
};
