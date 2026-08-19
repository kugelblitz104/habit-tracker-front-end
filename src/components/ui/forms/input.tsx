import { type ComponentPropsWithRef } from 'react';

import { fieldClass, fieldStyle, type FieldTier } from '@/components/ui/forms/field-tiers';

type InputProps = { tier?: FieldTier } & ComponentPropsWithRef<'input'>;

/** Text input owning the target-size floor. `className` is appended last. */
export const Input = ({ tier = 'task', className = '', style, ...rest }: InputProps) => (
    <input
        className={`${fieldClass(tier)} ${className}`.trim()}
        style={{ ...fieldStyle(tier), ...style }}
        {...rest}
    />
);
