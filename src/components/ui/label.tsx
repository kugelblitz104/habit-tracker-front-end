export type LabelProps = {
    mainText: string;
    subText?: string;
}

export const Label = ({ mainText, subText }: LabelProps) => {
    return (
        <label className="mx-4">
            <span className="font-semibold">
                {mainText}
            </span>
            {subText && (
            <span className="ml-2 text-sm text-gray-600">
                {subText}
            </span>
            )}
        </label>
    );
};