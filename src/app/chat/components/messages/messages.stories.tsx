import { StoryObj, Meta } from '@storybook/react';

import { Messages } from './messages.component';

const meta: Meta = {
    title: 'Components/Messages',
    component: Messages,
    argTypes: {
        messages: {
            type: {
                required: true,
                name: 'array',
                value: {
                    name: 'object',
                    required: true,
                    value: {
                        origin: {
                            required: true,
                            name: 'enum',
                            value: ['CLIENT', 'SERVER'],
                        },
                        message: {
                            required: true,
                            name: 'string',
                        },
                    },
                },
            },
        },
    },
    decorators: [
        (Story) => (
            <div>
                <Story style={{ width: '100vw', height: '100vh' }} />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof Messages>;

export const Primary: Story = {
    args: {
        messages: [
            {
                origin: 'CLIENT',
                text: 'message',
            },
            {
                origin: 'SERVER',
                text: 'message',
            },
            {
                origin: 'SERVER',
                text: 'Very long message containing no useful information at all',
            },
            {
                origin: 'CLIENT',
                text: 'message',
            },
        ],
    },
};

export const Scroll: Story = {
    args: {
        messages: new Array(50).fill(null).map((_, i) => ({
            origin: i % 2 ? 'CLIENT' : 'SERVER',
            text: 'message text',
        })),
    },
};
