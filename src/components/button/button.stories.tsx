import { Meta, StoryObj } from '@storybook/react';

import { Button } from './button.component';
import { IconsNames } from '../icon/icons';

const meta: Meta<typeof Button> = {
    title: 'Components/Button',
    component: Button,
    argTypes: {
        color: {
            options: ['purple', 'orange'],
            control: { type: 'radio' },
        },
        size: {
            options: ['small', 'big'],
            control: { type: 'radio' },
        },
        icon: {
            type: {
                name: 'enum',
                value: IconsNames,
            },
        },
        iconColor: {
            type: {
                name: 'enum',
                value: ['orange', 'light-purple', 'dark-purple', 'black'],
            },
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
        color: 'purple',
        size: 'big',
        icon: undefined,
        iconColor: undefined,
    },
};
