import { type ComponentPropsWithoutRef, type CSSProperties } from 'react';

import {
    buttonClass,
    buttonStyle,
    type ButtonSize,
    type ButtonVariant
} from '@/components/ui/buttons/button-styles';

type ButtonProps = {
    size?: ButtonSize;
    variant?: ButtonVariant;
    /**
     * Grows the touch target past the visual box. Only for controls with no
     * near neighbour - see the `hit-target` utility's note in app.css.
     */
    expandHitArea?: boolean;
} & ComponentPropsWithoutRef<'button'>;

/**
 * The app's button. Owns the size floor, so a call site cannot render an
 * undersized control by writing its own padding.
 *
 * `className` is appended last so callers can add layout utilities
 * (`flex-1`, `shrink-0`, `w-full`) without competing with the floor.
 */
export const Button = ({
    size = 'md',
    variant = 'ghost',
    expandHitArea = false,
    className = '',
    style,
    type = 'button',
    ...rest
}: ButtonProps) => (
    <button
        type={type}
        className={`${buttonClass({ size, variant, expandHitArea })} ${className}`.trim()}
        style={{ ...buttonStyle(variant), ...style }}
        {...rest}
    />
);
