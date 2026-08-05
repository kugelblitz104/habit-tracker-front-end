/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A countdown group's name and colour.
 *
 * The `id` is not carried: countdowns resolve their category by name on
 * restore, since `Countdown.category` mirrors it exactly.
 */
export type CountdownCategoryBackup = {
    name: string;
    color?: (string | null);
};

