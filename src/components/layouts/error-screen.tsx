import { TitleBar } from '../ui/title-bar';

type ErrorScreenProps = {
    message?: string;
};

export const ErrorScreen = ({ message }: ErrorScreenProps) => {
    return (
        <>
            <TitleBar />
            <div className='flex items-center justify-center min-h-screen'>
                <div className='text-center'>
                    <p className='mt-4 text-red-600'>
                        {message || 'An error occurred'}
                    </p>
                </div>
            </div>
        </>
    );
};
