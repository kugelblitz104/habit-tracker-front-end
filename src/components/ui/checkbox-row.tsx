import { useRef, useEffect, useContext } from "react";
import { Status } from "@/types/types";
import { ScrollSyncContext } from "./scroll-sync-context";


export type TrackerCheckboxProps = {
    status: Status;
}

const TrackerCheckbox = ({
    status = Status.NOT_COMPLETED,
}: TrackerCheckboxProps) => {
    return (
        <button className="
        text-blue-500 hover:text-blue-700 
        focus:outline-none focus:ring-2 focus:ring-blue-500">
        {
            status === "completed" ? "✔️" :
            status === "skipped" ? "➖" :
            status === "not_completed" ? "❌" :
            "?"
        }
        </button>
    )
}

export type ButtonRowProps = {
    num: number;
}

export const CheckboxRow = (
    {num}: ButtonRowProps
) => {
    const buttons = [...Array(num).keys()];
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollSync = useContext(ScrollSyncContext);

    // Update scroll position when context changes
    useEffect(() => {
        if (scrollRef.current && scrollSync) {
            if (scrollRef.current.scrollLeft !== scrollSync.scrollLeft) {
                scrollRef.current.scrollLeft = scrollSync.scrollLeft;
            }
        }
    }, [scrollSync?.scrollLeft]);

    // When this row is scrolled, update context
    const onScroll = () => {
        if (scrollRef.current && scrollSync) {
            scrollSync.setScrollLeft(scrollRef.current.scrollLeft);
        }
    };

    return (
        <div
            ref={scrollRef}
            className="flex-2 flex justify-between items-center mx-4 my-1 overflow-x-auto"
            style={{ minWidth: 0 }}
            onScroll={onScroll}
        >
            {buttons.map((button) => (
                <TrackerCheckbox status={Status.NOT_COMPLETED} key={button} />
            ))}
        </div>
    );
};