import { Link } from 'react-router';

export type LabelProps = {
    mainText: string;
    subText?: string;
    textColor?: string;
    mainTextLink?: string;
};

export const Label = ({
    mainText,
    subText,
    textColor = '#FFFFFF',
    mainTextLink = ''
}: LabelProps) => {
    return (
        <label className='mx-4'>
            <Link to={mainTextLink}>
                <span className='font-semibold' style={{ color: textColor }}>
                    {mainText}
                </span>
                {subText && (
                    <span className='ml-2 text-sm text-gray-600'>
                        {subText}
                    </span>
                )}
            </Link>
        </label>
    );
};
