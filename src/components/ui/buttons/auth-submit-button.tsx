import { Button } from '@/components/ui/buttons/button';

type AuthSubmitButtonProps = {
    isSubmitting: boolean;
    /** Label shown while the request is in flight (e.g. "Signing in..."). */
    submittingLabel: string;
    /** Idle label (e.g. "Sign in"). */
    label: string;
};

/**
 * Full-width gradient submit button + spinner shared by the login and
 * registration forms.
 */
export const AuthSubmitButton = ({
    isSubmitting,
    submittingLabel,
    label
}: AuthSubmitButtonProps) => (
    <Button disabled={isSubmitting} type='submit' variant='primary' size='lg' className='w-full'>
        {isSubmitting && (
            <span
                aria-hidden='true'
                className='h-3.5 w-3.5 animate-spin rounded-full border-b-2'
                style={{ borderColor: 'var(--button-primary-text)' }}
            ></span>
        )}
        {isSubmitting ? submittingLabel : label}
    </Button>
);
