import { Button } from '@/components/ui/buttons/button';
import { X } from 'lucide-react';
import { memo } from 'react';
import { DAY_QUALITY_GROUPS } from '../utils/day-quality';

type DayQualityPickerProps = {
    /** The stored word, or null for a day with no quality yet. */
    value: string | null;
    onChange: (value: string | null) => void;
    /** No profile to write to. Persistent, so it is painted as unavailable. */
    disabled?: boolean;
    /**
     * A day's entry is still loading. Blocks interaction WITHOUT repainting:
     * it lasts a few hundred milliseconds, and dimming thirteen chips for
     * that long reads as a flash every time the day changes.
     */
    busy?: boolean;
};

/** Hoisted: an unselected chip's style never varies, so it is not rebuilt. */
const UNSELECTED_CHIP: React.CSSProperties = {
    borderColor: 'var(--surface-input-border)',
    color: 'var(--color-text-muted)'
};

/**
 * The day-quality control: thirteen words, all on screen, one tap each.
 *
 * Deliberately not stars, a slider or a 1-10 scale. These are semantic words,
 * not a rating: a day can be productive and tiring at once, and putting them
 * on one axis would rank feelings that do not rank. The three tonal clusters
 * (positive / neutral / negative) carry colour so the shape of the vocabulary
 * is legible at a glance, and each cluster is labelled so the colour reads as
 * a tone rather than a score.
 *
 * Every word is visible at once rather than behind a dropdown, because 85% of
 * this journal's history is `good` and the common case has to be one tap.
 *
 * Native radios inside a fieldset, so the group semantics and arrow-key
 * navigation are the browser's rather than hand-rolled. The input is
 * `sr-only`; the chip beside it is what is painted.
 *
 * Nothing here may change size on selection. The chip's selected state is a
 * border, a wash and a text colour, all of which sit inside the same box, and
 * the header's right-hand slot reserves the taller of its two contents so
 * choosing a first word does not push the grid down.
 *
 * Memoised, and `onChange` must be referentially stable: the parent re-renders
 * on every keystroke in the body editor, and without this all thirteen chips
 * re-render with it.
 */
export const DayQualityPicker = memo(function DayQualityPicker({
    value,
    onChange,
    disabled,
    busy
}: DayQualityPickerProps) {
    return (
        <fieldset
            disabled={disabled || busy}
            // Only the persistent reason dims. See `busy` above.
            className={`min-w-0 ${disabled ? 'opacity-50' : ''}`}
        >
            {/* The legend has to be the fieldset's first child to name the group,
            so the visible heading is a separate element and this one is only
            for assistive tech. */}
            <legend className='sr-only'>Day quality</legend>
            <div className='mb-2.5 flex min-h-[28px] items-center justify-between gap-3 pointer-coarse:min-h-[44px]'>
                <span
                    aria-hidden='true'
                    className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted'
                >
                    Day quality
                </span>
                {value === null ? (
                    // "No quality yet" is a real state, and has to look different
                    // from a chosen word rather than just being the absence of a
                    // highlight.
                    <span className='font-mono text-[11px] text-text-faint'>Not set</span>
                ) : (
                    <Button
                        size='sm'
                        variant='subtle'
                        onClick={() => onChange(null)}
                        aria-label='Clear the day quality'
                        className='font-mono text-[11px] uppercase tracking-[0.1em]'
                    >
                        <X size={12} />
                        Clear
                    </Button>
                )}
            </div>

            <div className='flex flex-col gap-2.5'>
                {DAY_QUALITY_GROUPS.map((group) => (
                    // Below `sm` the group label sits on its own line above its
                    // chips: inline, it left a narrow column that wrapped the
                    // thirteen words into a ragged block beside it.
                    <div key={group.key} className='flex flex-col gap-1 sm:flex-row sm:items-start'>
                        <span
                            aria-hidden='true'
                            className='shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] sm:w-[58px] sm:pt-2.5'
                            style={{ color: group.color, opacity: 0.75 }}
                        >
                            {group.label}
                        </span>
                        <div className='flex min-w-0 flex-wrap gap-1.5'>
                            {group.qualities.map((quality) => {
                                const selected = value === quality;
                                return (
                                    <label key={quality}>
                                        <input
                                            type='radio'
                                            name='day-quality'
                                            value={quality}
                                            checked={selected}
                                            onChange={() => onChange(quality)}
                                            className='peer sr-only'
                                        />
                                        <span
                                            className='inline-flex min-h-[32px] cursor-pointer items-center rounded-chip border px-3 font-display text-[13px] transition-colors pointer-coarse:min-h-[44px] peer-focus-visible:ring-1 peer-focus-visible:ring-now-accent peer-disabled:cursor-not-allowed'
                                            style={
                                                selected
                                                    ? {
                                                          borderColor: group.color,
                                                          backgroundColor: `color-mix(in srgb, ${group.color} 20%, transparent)`,
                                                          color: group.color
                                                      }
                                                    : UNSELECTED_CHIP
                                            }
                                        >
                                            {quality}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </fieldset>
    );
});
