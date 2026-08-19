import { type ComponentPropsWithRef } from 'react';

import { fieldClass, fieldStyle, type FieldTier } from '@/components/ui/forms/field-tiers';

type TextareaProps = { tier?: FieldTier } & ComponentPropsWithRef<'textarea'>;

/** Textarea owning the target-size floor. `className` is appended last. */
export const Textarea = ({ tier = 'task', className = '', style, ...rest }: TextareaProps) => (
    <textarea
        className={`${fieldClass(tier)} ${className}`.trim()}
        style={{ ...fieldStyle(tier), ...style }}
        {...rest}
    />
);
