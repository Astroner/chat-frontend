import { Meta, StoryObj } from '@storybook/react';
import { Input } from './input.component';

const meta: Meta = {
    title: 'Components/Input',
    component: Input,
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        value: 'text',
        disabled: false,
    },
};
