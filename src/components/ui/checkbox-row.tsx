import { useRef, useEffect, useContext, useState } from "react";
import { Status } from "@/types/types";


export type TrackerCheckboxProps = {
    status: Status;
    onClick?: () => void;
}

const TrackerCheckbox = ({
    status = Status.NOT_COMPLETED,
    onClick,
}: TrackerCheckboxProps) => {
    return (
        <button className="
        text-blue-500 hover:text-blue-700 
        focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={onClick}
        >
        {
            status === "completed" ? "✔️" :
            status === "skipped" ? "⏭️" :
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
    const [status, setStatus] = useState<Status[]>(Array(num).fill(Status.NOT_COMPLETED));

    const handleCheckboxClick = (index: number) => {
        setStatus((prevStatus) => {
            const newStatus = [...prevStatus];
            switch (newStatus[index]) {
                case Status.NOT_COMPLETED:
                    newStatus[index] = Status.SKIPPED;
                    break;
                case Status.SKIPPED:
                    newStatus[index] = Status.COMPLETED;
                    break;
                default:
                    newStatus[index] = Status.NOT_COMPLETED;
                    break;
            }
            return newStatus;
        });
    }

    return (
        <div
            className="flex justify-between items-center mx-4 my-1"
        >
            {buttons.map((button) => (
                <TrackerCheckbox status={status[button]} key={button} onClick={() => handleCheckboxClick(button)} />
            ))}
        </div>
    );
};