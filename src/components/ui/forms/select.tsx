import { type ComponentPropsWithRef } from 'react';

import { fieldClass, fieldStyle, type FieldTier } from '@/components/ui/forms/field-tiers';

type SelectProps = { tier?: FieldTier } & ComponentPropsWithRef<'select'>;

/**
 * Select owning the target-size floor. `className` is appended last.
 *
 * Always pins `colorScheme: 'dark'` so the native popup matches the app's dark
 * surface regardless of tier. `<option>` children still need `selectOptionStyle`
 * from `form-field-styles.ts` at the call site: some platforms render the
 * option popup with an opaque system background regardless of the select's
 * color-scheme, which makes light option text invisible without it.
 */
export const Select = ({ tier = 'task', className = '', style, ...rest }: SelectProps) => (
    <select
        className={`${fieldClass(tier)} ${className}`.trim()}
        style={{ ...fieldStyle(tier), colorScheme: 'dark', ...style }}
        {...rest}
    />
);
