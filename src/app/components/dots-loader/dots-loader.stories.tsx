import { Meta, StoryObj } from '@storybook/react';

import { DotsLoader } from './dots-loader.component';

const meta: Meta<typeof DotsLoader> = {
    title: 'Components/Dots Loader',
    component: DotsLoader,
};

export default meta;

type Story = StoryObj<typeof DotsLoader>;

export const Default: Story = {
    args: {
        style: {
            width: 300,
            height: 300,
        },
    },
};
