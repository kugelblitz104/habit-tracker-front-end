export type Meta = {
    page: number;
    total: number;
    total_pages: number;
};

export enum Status {
    NOT_COMPLETED = 'not_completed',
    COMPLETED = 'completed',
    SKIPPED = 'skipped'
}

export enum LoadingStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    ERROR = 'error'
}

export type Frequency = {
    name: string;
    frequency: number;
    range: number;
};
