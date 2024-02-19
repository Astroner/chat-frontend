import { FC, memo } from 'react';

import { Input, InputProps } from '../input/input.component';
import { useForm } from '@schematic-forms/react';

export type FormInputProps = Omit<InputProps, 'value' | 'onChange'> & {
    field: string;
};

export const FormInput: FC<FormInputProps> = memo(({ field, ...props }) => {
    const [value, setValue] = useForm(field, '');

    return <Input {...props} value={value} onChange={setValue} />;
});
