import { useRef } from 'react';

interface UseLongPressOptions {
    /**
     * Duration in milliseconds for long press detection
     * @default 500
     */
    duration?: number;
    /**
     * Maximum movement in pixels before cancelling the long press
     * @default 10
     */
    moveThreshold?: number;
}

/**
 * Custom hook for detecting long press events on mobile devices
 * @param callback - Function to call when long press is detected
 * @param options - Configuration options
 * @returns Object with touch event handlers to spread onto elements
 */
export const useLongPress = (callback: () => void, options: UseLongPressOptions = {}) => {
    const { duration = 500, moveThreshold = 10 } = options;

    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        if (touch) {
            touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
            longPressTimerRef.current = setTimeout(() => {
                callback();
            }, duration);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (longPressTimerRef.current && touchStartPosRef.current) {
            const touch = e.touches[0];
            if (touch) {
                const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
                const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
                // Cancel long press if finger moves beyond threshold
                if (deltaX > moveThreshold || deltaY > moveThreshold) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
            }
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        touchStartPosRef.current = null;
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
    };
};
