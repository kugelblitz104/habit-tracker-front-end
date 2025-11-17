export const getFrequencyString = (frequency: number, range: number) => {
    if (frequency === range) return 'daily';
    else if (frequency === 1 && range === 7) return 'weekly';
    else if (frequency === 1 && range === 30) return 'monthly';
    else if (frequency === 1) return `once every ${range}`;
    else return `${frequency} times every ${range} days`;
    // if (frequency === 1 && range === 365) return 'yearly'
};
