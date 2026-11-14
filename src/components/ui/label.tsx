export type LabelProps = {
    mainText: string;
    subText?: string;
    textColor?: string;
    className?: string;
};

/** Lifts a stored entity colour toward white so it reads as text on the dark surfaces. */
export const legibleOnDark = (color: string): string => `color-mix(in oklab, ${color} 55%, white)`;

export const Label = ({ mainText, subText, textColor = '#FFFFFF', className }: LabelProps) => {
    return (
        <label className={`mx-2 truncate ${className}`}>
            <span className='font-semibold' style={{ color: legibleOnDark(textColor) }}>
                {mainText}
            </span>
            {subText && <span className='ml-2 text-sm text-gray-500'>{subText}</span>}
        </label>
    );
};
