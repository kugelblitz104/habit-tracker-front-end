import { settingsGhostBorder, settingsGhostButtonClass } from './settings-card';

/**
 * PLACEHOLDER: no Azure DevOps integration exists yet. This static row
 * mirrors the design frame verbatim (blue tint, contoso/Payments, disabled
 * Manage) until a real ADO connection ships.
 */
export const AzureDevOpsPlaceholderRow = () => (
    <div
        className='flex items-center gap-3 rounded-[10px] border px-3.5 py-3'
        style={{
            backgroundColor: 'rgba(74,144,217,.06)',
            borderColor: 'rgba(74,144,217,.2)'
        }}
    >
        <span
            className='h-[9px] w-[9px] flex-none rounded-[2px]'
            style={{ backgroundColor: 'var(--color-azure)' }}
            aria-hidden='true'
        />
        <div className='min-w-0 flex-1'>
            <div className='truncate text-[14px] text-text-secondary'>contoso / Payments</div>
            <div className='mt-0.5 font-mono text-[11px] text-azure-text'>
                Connected · publishing work items
            </div>
        </div>
        <button
            type='button'
            disabled
            title='Azure DevOps management is not available yet'
            className={settingsGhostButtonClass}
            style={{ borderColor: settingsGhostBorder }}
        >
            Manage
        </button>
    </div>
);
