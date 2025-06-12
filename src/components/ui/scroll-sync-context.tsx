import { createContext, useState } from "react";

// --- Context for shared scroll position ---
export const ScrollSyncContext = createContext<{
    scrollLeft: number;
    setScrollLeft: (val: number) => void;
} | null>(null);

export const ScrollSyncProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [scrollLeft, setScrollLeft] = useState(0);
    return (
        <ScrollSyncContext.Provider value={{ scrollLeft, setScrollLeft }}>
            {children}
        </ScrollSyncContext.Provider>
    );
};