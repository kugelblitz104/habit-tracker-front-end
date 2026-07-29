import { selectOptionStyle } from '@/components/ui/forms/form-field-styles';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * `<option>` themed with `selectOptionStyle` (explicit dark background + light
 * text — some platforms otherwise render the option popup with the system
 * white background regardless of the select's color-scheme). Hand-written
 * ~22 times across the task/countdown/time-entry forms; this is a drop-in
 * replacement for `<option style={selectOptionStyle}>`.
 */
export const SelectOption = (props: ComponentPropsWithoutRef<'option'>) => (
    <option style={selectOptionStyle} {...props} />
);
