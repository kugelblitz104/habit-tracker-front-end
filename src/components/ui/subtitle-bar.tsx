export type Subtitle = {
    text?: string;
    color?: string;
    bold?: boolean;
    icon?: React.ReactNode;
};

type SubtitleBarProps = {
    subtitles: Subtitle[];
};

export const SubtitleBar = ({ subtitles }: SubtitleBarProps) => {
    return (
        <div className='flex flex-wrap bg-slate-800 p-4 gap-3 text-sm items-center'>
            {subtitles.map((subtitle, index) => (
                <span
                    key={index}
                    className={`${subtitle.bold ? 'font-semibold' : ''} flex items-center`}
                    style={{ color: subtitle.color }}
                >
                    {subtitle.icon}
                    {subtitle.text}
                </span>
            ))}
        </div>
    );
};
