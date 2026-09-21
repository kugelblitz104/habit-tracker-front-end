import { Button } from '@/components/ui/buttons/button';
import { buttonClass, buttonStyle } from '@/components/ui/buttons/button-styles';
import { Link } from 'react-router';

export type SummaryTally = { verb: string; count: number };

type ReconciliationSummaryProps = {
    tally: SummaryTally[];
    onRestart: () => void;
};

/**
 * Where "the system shrank" lands. Without it the ritual just stops, and the
 * work you did is invisible - the rows are gone, which is the whole point but
 * reads as nothing having happened.
 */
export const ReconciliationSummary = ({ tally, onRestart }: ReconciliationSummaryProps) => {
    const acted = tally.filter((entry) => entry.count > 0);
    const total = acted.reduce((sum, entry) => sum + entry.count, 0);

    return (
        <div className='flex flex-col gap-6'>
            <h1 className='font-display text-[20px] text-text-primary'>Done</h1>

            {total === 0 ? (
                <p className='max-w-prose font-display text-[13.5px] text-text-muted'>
                    Nothing changed. Everything you looked at is marked as reviewed, so it will stay
                    out of the way until its window comes round again.
                </p>
            ) : (
                <>
                    <p className='max-w-prose font-display text-[13.5px] text-text-muted'>
                        {total} {total === 1 ? 'decision' : 'decisions'} made.
                    </p>
                    <ul className='flex flex-col gap-2'>
                        {acted.map((entry) => (
                            <li key={entry.verb} className='flex items-baseline gap-3'>
                                <span className='w-8 shrink-0 text-right font-mono text-[15px] text-text-primary'>
                                    {entry.count}
                                </span>
                                <span className='font-display text-[13.5px] text-text-muted'>
                                    {entry.verb}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className='flex flex-wrap gap-2'>
                <Button size='md' variant='subtle' onClick={onRestart}>
                    Start again
                </Button>
                {/* A Link carrying the button's classes, not a Link inside a
                    Button: nesting an anchor in a button is invalid HTML and
                    this component takes no `asChild`. */}
                <Link
                    to='/'
                    className={buttonClass({ variant: 'primary', size: 'md' })}
                    style={buttonStyle('primary')}
                >
                    Back to today
                </Link>
            </div>
        </div>
    );
};
