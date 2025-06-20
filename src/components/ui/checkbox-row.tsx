import { useRef, useEffect, useContext } from "react";
import { Status } from "@/types/types";


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

    return (
        <div
            className="flex-2 flex justify-between items-center mx-4 my-1"
            style={{ minWidth: 0 }}
        >
            {buttons.map((button) => (
                <TrackerCheckbox status={Status.NOT_COMPLETED} key={button} />
            ))}
        </div>
    );
};