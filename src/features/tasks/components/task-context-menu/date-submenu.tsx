import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { formatShortDate } from '../../utils/task-format';
import {
    DATE_QUICK_SETS,
    Divider,
    SubHeader,
    dateInputClass,
    dateInputStyle,
    itemClass
} from './shared';

const quickDate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return toLocalDateString(d);
};

type DateSubmenuProps = {
    /** Submenu title — 'Due' or 'Scheduled'. */
    label: string;
    currentDate: string | null | undefined;
    /** Quick-pick or manual date pick — same handler either way (each pick is a
     *  standalone PATCH; only the value differs). */
    onPick: (date: string) => void;
    /** Omitted when there's no current date to clear. */
    onClear?: () => void;
    clearLabel: string;
    dateAriaLabel: string;
    onBack: () => void;
};

/**
 * Shared Due / Scheduled submenu: quick-pick buttons (today/tomorrow/next
 * week), a manual date input, and (when a date is set) a clear row.
 */
export const DateSubmenu = ({
    label,
    currentDate,
    onPick,
    onClear,
    clearLabel,
    dateAriaLabel,
    onBack
}: DateSubmenuProps) => (
    <>
        <SubHeader label={label} onBack={onBack} />
        <Divider />
        {DATE_QUICK_SETS.map(({ label: quickLabel, offset }) => {
            const date = quickDate(offset);
            return (
                <button
                    key={quickLabel}
                    type='button'
                    onClick={() => onPick(date)}
                    className={`${itemClass} text-text-secondary`}
                >
                    {quickLabel}
                    <span className='ml-auto font-mono text-[10.5px] text-text-faint'>
                        {formatShortDate(parseLocalDate(date))}
                    </span>
                </button>
            );
        })}
        <div className='px-2 py-1.5'>
            <input
                type='date'
                defaultValue={currentDate ?? ''}
                onChange={(e) => e.target.value && onPick(e.target.value)}
                aria-label={dateAriaLabel}
                className={dateInputClass}
                style={dateInputStyle}
            />
        </div>
        {currentDate && onClear && (
            <>
                <Divider />
                <button type='button' onClick={onClear} className={`${itemClass} text-text-muted`}>
                    {clearLabel}
                </button>
            </>
        )}
    </>
);
