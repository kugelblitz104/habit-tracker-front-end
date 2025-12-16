import { parseLocalDate } from '@/lib/date-utils';
import type { Streak } from '@/types/types';
import {
    Bar,
    BarChart,
    LabelList,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type LabelProps,
    type TooltipContentProps
} from 'recharts';

type StreakChartProps = {
    streaks: Streak[];
    color?: string;
};

const BarLabel = ({ x, y, width, height, value }: LabelProps) => {
    if (
        x === undefined ||
        y === undefined ||
        width === undefined ||
        height === undefined ||
        value === undefined
    ) {
        return null;
    }

    return (
        <g>
            <rect
                x={Number(x) + Number(width) / 2 - 15}
                y={Number(y) + Number(height) / 2 - 10}
                width={30}
                height={20}
                rx={10}
                fill='#1d293d'
                stroke='#4B5563'
                strokeWidth={1}
            />
            <text
                x={Number(x) + Number(width) / 2}
                y={Number(y) + Number(height) / 2 + 4}
                fill='#FFFFFF'
                fontSize={12}
                textAnchor='middle'
            >
                {value}
            </text>
        </g>
    );
};

const CustomTooltip = ({ active, payload }: TooltipContentProps<string, number | string>) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div
                className='
                bg-slate-800 
                border border-gray-600 
                text-white 
                p-2 rounded-md 
                flex flex-col 
                gap-1'
            >
                <p className='text-xl font-bold'>Days: {data.count}</p>
                <p>Start: {data.startDate}</p>
                <p>End: {data.endDate}</p>
            </div>
        );
    }
    return null;
};

export const StreakChart = ({ streaks, color }: StreakChartProps) => {
    const colorFill = color || '#FFFFFF';
    const data = streaks
        .map((streak) => ({
            key: parseLocalDate(streak.startDate).toLocaleDateString(),
            count: streak.length,
            startDate: parseLocalDate(streak.startDate).toLocaleDateString(),
            endDate: parseLocalDate(streak.endDate).toLocaleDateString()
        }))
        .reverse();

    if (data.length === 0) {
        return (
            <div className='m-4 bg-slate-800 p-4 rounded-lg text-center text-gray-400'>
                No streaks to display.
            </div>
        );
    }

    return (
        <>
            <div className='mx-4 bg-slate-800 p-4 rounded-lg'>
                <ResponsiveContainer width='100%' height={data.length * 40 + 10}>
                    <BarChart data={data} layout='vertical'>
                        <XAxis
                            type='number'
                            dataKey='count'
                            hide
                            domain={[0, Math.max(...data.map((d) => d.count))]}
                        />
                        <YAxis type='category' dataKey='key' hide />
                        <Tooltip content={CustomTooltip} cursor={false} />
                        <Bar
                            dataKey='count'
                            fill={colorFill}
                            isAnimationActive={true}
                            radius={8}
                            maxBarSize={30}
                        >
                            <LabelList dataKey='count' content={BarLabel} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};
