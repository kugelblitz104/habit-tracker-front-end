export type LabelProps = {
    mainText: string;
    subText?: string;
    textColor?: string;
};

export const Label = ({
    mainText,
    subText,
    textColor = '#FFFFFF'
}: LabelProps) => {
    return (
        <label className='mx-4'>
            <span className='font-semibold' style={{ color: textColor }}>
                {mainText}
            </span>
            {subText && (
                <span className='ml-2 text-sm text-gray-500'>{subText}</span>
            )}
        </label>
    );
};
