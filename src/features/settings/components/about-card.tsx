import { CURRENT_VERSION } from '@/features/release-notes/release-index';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { SettingsCard } from './settings-card';

/**
 * ABOUT card: the app's version, and the only link anywhere to /release-notes,
 * which is otherwise unlisted.
 *
 * Importing from the release index costs no payload: it reads the filenames in
 * `releases/`, not the releases themselves.
 */
export const AboutCard = () => (
    <SettingsCard label='About' labelGapClass='mb-[6px]'>
        <Link
            to='/release-notes'
            className='inline-flex items-center gap-1 text-body text-text-secondary transition-colors hover:text-text-primary'
        >
            Release notes
            <ChevronRight size={14} aria-hidden='true' />
        </Link>
        {CURRENT_VERSION && (
            <p className='mt-1 font-mono text-label text-text-faint'>v{CURRENT_VERSION}</p>
        )}
    </SettingsCard>
);
