type QueryStateSize = 'sm' | 'md';

type QueryStateProps = {
    isLoading?: boolean;
    isError?: boolean;
    errorMessage?: string;
    loadingMessage?: string;
    /** 'md' = 12px page-level surfaces; 'sm' = 11px inline sections. */
    size: QueryStateSize;
    /** Extra class prefixed onto the line, e.g. Today's `mb-6`. */
    className?: string;
};

const SIZE_CLASS: Record<QueryStateSize, string> = {
    md: 'font-mono text-[12px]',
    sm: 'font-mono text-[11px]'
};

/**
 * Shared loading/error line for the app's page-level (12px) and inline (11px)
 * query surfaces. `isError` wins over `isLoading` when both are somehow true.
 * Renders nothing when idle. Owns no empty state — callers that have one
 * (Countdown's "no countdowns yet") render it themselves alongside this.
 */
export const QueryState = ({
    isLoading,
    isError,
    errorMessage,
    loadingMessage,
    size,
    className
}: QueryStateProps) => {
    const prefix = className ? `${className} ` : '';
    if (isError) {
        return <p className={`${prefix}${SIZE_CLASS[size]} text-danger`}>{errorMessage}</p>;
    }
    if (isLoading) {
        return <p className={`${prefix}${SIZE_CLASS[size]} text-text-faint`}>{loadingMessage}</p>;
    }
    return null;
};
