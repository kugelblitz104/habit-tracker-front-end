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

// Dashboard: days to show in mini-calendar (variable per screen size)
export const DASHBOARD_DAYS_BY_SIZE: Record<LayoutSize, number> = {
    xl: 14,
    lg: 11,
    md: 8,
    sm: 4
};
