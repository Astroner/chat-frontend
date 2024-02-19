import { Meta, StoryObj } from "@storybook/react";

import { Icon } from "./icon.component"
import { IconsNames } from "./icons"

const meta: Meta<typeof Icon> = {
    title: "Components/Icon",
    component: Icon,
}

export default meta;

type Story = StoryObj<typeof Icon>;

export const Default: Story = {
    args: {
        color: 'dark-purple',
        name: 'network',
        size: 'big'
    },
    argTypes: {
        name: {
            type: {
                name: 'enum',
                value: IconsNames,
            },
        },
        size: {
            type: {
                name: 'enum',
                value: ['small', 'big']
            }
        },
        color: {
            type: {
                name: 'enum',
                value: ['orange', 'light-purple', 'dark-purple']
            }
        }
    }
}