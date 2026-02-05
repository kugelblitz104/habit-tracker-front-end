import { useMediaQuery } from 'react-responsive';

export type LayoutSize = 'xl' | 'lg' | 'md' | 'sm';

export const useResponsiveLayout = (): LayoutSize => {
    const isXl = useMediaQuery({ minWidth: 1280 });
    const isLg = useMediaQuery({ minWidth: 1024 });
    const isMd = useMediaQuery({ minWidth: 768 });

    if (isXl) return 'xl';
    if (isLg) return 'lg';
    if (isMd) return 'md';
    return 'sm';
};

// Calendar board: full weeks (7 days per column)
const WEEKS_BY_SIZE: Record<LayoutSize, number> = {
    xl: 8,
    lg: 7,
    md: 6,
    sm: 5
};

// Dashboard: days to show in mini-calendar (variable per screen size)
const DASHBOARD_DAYS_BY_SIZE: Record<LayoutSize, number> = {
    xl: 14,
    lg: 11,
    md: 8,
    sm: 4
};

export const getWeeksForSize = (size: LayoutSize): number => WEEKS_BY_SIZE[size];

export const getCalendarDaysForSize = (size: LayoutSize): number => WEEKS_BY_SIZE[size] * 7;

export const getDashboardDaysForSize = (size: LayoutSize): number => DASHBOARD_DAYS_BY_SIZE[size];

export const isSmallLayout = (size: LayoutSize): boolean => size === 'sm';
