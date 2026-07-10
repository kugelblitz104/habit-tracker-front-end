import type { ProfileRead, ProfileUpdate } from '@/api';
import { useUpdateProfile } from '@/features/profiles/api/update-profiles';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'react-toastify';

type PomodoroKey =
    | 'pomodoro_work_minutes'
    | 'pomodoro_break_minutes'
    | 'pomodoro_long_break_minutes'
    | 'pomodoro_cycles';

type PomodoroRow = {
    key: PomodoroKey;
    title: string;
    description: string;
    defaultValue: number;
    min: number;
    max: number;
    unit: string;
};

const ROWS: PomodoroRow[] = [
    {
        key: 'pomodoro_work_minutes',
        title: 'Focus length',
        description: 'Minutes per pomodoro work session',
        defaultValue: 25,
        min: 1,
        max: 180,
        unit: 'min'
    },
    {
        key: 'pomodoro_break_minutes',
        title: 'Short break',
        description: 'Minutes of break between sessions',
        defaultValue: 5,
        min: 1,
        max: 60,
        unit: 'min'
    },
    {
        key: 'pomodoro_long_break_minutes',
        title: 'Long break',
        description: 'Minutes of the longer break',
        defaultValue: 15,
        min: 1,
        max: 120,
        unit: 'min'
    },
    {
        key: 'pomodoro_cycles',
        title: 'Sessions per long break',
        description: 'Focus sessions before a long break',
        defaultValue: 4,
        min: 1,
        max: 12,
        unit: ''
    }
];

type StepperProps = {
    value: number;
    unit: string;
    min: number;
    max: number;
    disabled?: boolean;
    onStep: (next: number) => void;
};

const Stepper = ({ value, unit, min, max, disabled, onStep }: StepperProps) => {
    const buttonClass =
        'inline-flex h-7 w-7 items-center justify-center rounded-[7px] border text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40';
    const buttonStyle = { borderColor: 'rgba(255,255,255,.12)' } as const;
    return (
        <div className='flex items-center gap-2'>
            <button
                type='button'
                aria-label='Decrease'
                disabled={disabled || value <= min}
                onClick={() => onStep(value - 1)}
                className={buttonClass}
                style={buttonStyle}
            >
                <Minus size={13} />
            </button>
            <span className='w-14 text-center font-mono text-[13px] tabular-nums text-text-primary'>
                {value}
                {unit ? <span className='ml-1 text-text-faint'>{unit}</span> : null}
            </span>
            <button
                type='button'
                aria-label='Increase'
                disabled={disabled || value >= max}
                onClick={() => onStep(value + 1)}
                className={buttonClass}
                style={buttonStyle}
            >
                <Plus size={13} />
            </button>
        </div>
    );
};

/**
 * Per-profile pomodoro defaults (focus / break / long break lengths + sessions
 * per long break), rendered inside the Profile preferences card. Each step
 * persists immediately via useUpdateProfile; the timer screen reads these.
 */
export const PomodoroSettingsGroup = ({ profile }: { profile: ProfileRead }) => {
    const updateProfile = useUpdateProfile({
        mutationConfig: {
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to update profile'));
            }
        }
    });

    const handleStep = (row: PomodoroRow, next: number) => {
        const clamped = Math.min(row.max, Math.max(row.min, next));
        updateProfile.mutate({
            profileId: profile.id,
            data: { [row.key]: clamped } as ProfileUpdate
        });
    };

    return (
        <div className='border-t pt-3.5' style={{ borderColor: 'rgba(255,255,255,.06)' }}>
            <div className='mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-faint'>
                Pomodoro timer
            </div>
            {ROWS.map((row) => (
                <div key={row.key} className='flex items-center justify-between gap-4 py-3'>
                    <div>
                        <div className='text-[14.5px] font-medium' style={{ color: '#f0e7db' }}>
                            {row.title}
                        </div>
                        <div className='mt-0.5 text-[12px] text-text-muted'>{row.description}</div>
                    </div>
                    <Stepper
                        value={profile[row.key] ?? row.defaultValue}
                        unit={row.unit}
                        min={row.min}
                        max={row.max}
                        disabled={updateProfile.isPending}
                        onStep={(next) => handleStep(row, next)}
                    />
                </div>
            ))}
        </div>
    );
};
