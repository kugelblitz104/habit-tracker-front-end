export const decodeToken = (token: string): any => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3 || !parts[1]) {
            return null;
        }

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(
                    (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                )
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
    }
};

export const isTokenExpired = (token: string): boolean => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
        return true;
    }

    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
};

export const getUserIdFromToken = (token: string): number | null => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.sub) {
        return null;
    }

    const userId = parseInt(decoded.sub, 10);
    return isNaN(userId) ? null : userId;
};
