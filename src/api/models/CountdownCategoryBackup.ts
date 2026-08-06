/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A countdown group's name and colour.
 *
 * The `id` is not carried: countdowns resolve their category by name on
 * restore, matched against `CountdownBackup.category`.
 */
export type CountdownCategoryBackup = {
    name: string;
    color?: (string | null);
};

