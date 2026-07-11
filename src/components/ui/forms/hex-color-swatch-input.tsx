import { themedInputStyle } from '@/components/ui/forms/input-styles';

type HexColorSwatchInputProps = {
    value: string;
    onChange: (value: string) => void;
    /** Accessible name for the native color swatch. */
    swatchLabel: string;
    /** 34px (connections row) or 38px (profiles gradient); default 34. */
    swatchSize?: 34 | 38;
    /** Paired hex text field (connections form); omit for swatch-only usage (profiles gradient). */
    hexLabel?: string;
    /** Validation message rendered after the hex field when `hexLabel` is set. */
    error?: string;
};

/**
 * Native color swatch + optional hex text input pair, shared by the
 * connections form (swatch + hex + validation) and the profiles gradient
 * picker (bare swatches, no hex field). Distinct from the full `ColorPicker`
 * popover, which is too large for these inline rows.
 */
export const HexColorSwatchInput = ({
    value,
    onChange,
    swatchLabel,
    swatchSize = 34,
    hexLabel,
    error
}: HexColorSwatchInputProps) => {
    const swatch = (
        <input
            type='color'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={swatchLabel}
            className='cursor-pointer rounded-[9px] border bg-transparent p-0.5'
            style={{ width: swatchSize, height: swatchSize, borderColor: 'rgba(255,255,255,.1)' }}
        />
    );

    if (!hexLabel) {
        return swatch;
    }

    return (
        <span className='flex items-center gap-1.5'>
            {swatch}
            <input
                type='text'
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={hexLabel}
                className='w-24 rounded-[9px] border px-2.5 py-2 font-mono text-[12px] text-text-secondary outline-none focus-visible:ring-1 focus-visible:ring-now-accent'
                style={themedInputStyle}
            />
            {error && <span className='text-[11px] text-danger'>{error}</span>}
        </span>
    );
};
