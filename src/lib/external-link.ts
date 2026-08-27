/**
 * A task's link to an external work item, and how it renders.
 *
 * A link needs no integration: `PATCH /tasks/{id}` writes the API's
 * `source` / `external_ref` / `external_url` triple directly, and `source` is
 * null when the URL points at something with no Azure DevOps or GitHub
 * connection behind it (a Jira ticket, a wiki page). That null case is why the
 * palette below has three entries rather than two.
 *
 * Lives in `lib/` because the chip is rendered from two different features -
 * the task card's meta row and the task detail's link section.
 */
import type { CSSProperties } from 'react';

/** Chip palettes, keyed by the provider a link came from. */
export const EXTERNAL_LINK_STYLE = {
    azure_devops: {
        color: 'var(--color-azure-text)',
        backgroundColor: 'var(--azure-bg)',
        border: '1px solid var(--azure-border)'
    },
    github: {
        color: 'var(--color-github-text)',
        backgroundColor: 'var(--github-bg)',
        border: '1px solid var(--github-border)'
    },
    neutral: {
        color: 'var(--color-text-secondary)',
        backgroundColor: 'var(--link-bg)',
        border: '1px solid var(--link-border)'
    }
} satisfies Record<string, CSSProperties>;

/**
 * Infer the provider from a pasted work-item/issue URL, so a hand-made link
 * gets the right chip colour. Null when it doesn't look like either host, which
 * is the value the API stores for a link with no provider.
 */
export const sourceFromUrl = (url: string): string | null => {
    if (/dev\.azure\.com|\.visualstudio\.com/i.test(url)) return 'azure_devops';
    if (/github\.com/i.test(url)) return 'github';
    return null;
};

/**
 * Chip style for a link from `source`. Anything that isn't a known provider -
 * null included - gets the neutral palette, so a link to a third-party tracker
 * is never painted in a provider's colours.
 */
export const externalLinkChipStyle = (source: string | null | undefined): CSSProperties => {
    if (source === 'github') return EXTERNAL_LINK_STYLE.github;
    if (source === 'azure_devops') return EXTERNAL_LINK_STYLE.azure_devops;
    return EXTERNAL_LINK_STYLE.neutral;
};

/**
 * Whether a URL can be stored as a link. Mirrors the API's
 * `normalize_external_url`, so a bad paste is caught in the form rather than
 * coming back as a 422 toast.
 */
export const isLinkableUrl = (url: string): boolean => /^https?:\/\//i.test(url.trim());

/**
 * The `source` half of an edit to an existing link, as a patch fragment to
 * spread into the request. An empty object means leave `source` out of the
 * PATCH rather than send null.
 *
 * A stored source that does not match its own URL was written by Publish (from
 * the connection's provider) or by a backup import, so it knows something this
 * regex does not - an on-prem Azure DevOps item at `https://tfs.corp/...`
 * carries `azure_devops` that `sourceFromUrl` cannot re-derive. Those are left
 * alone. Anything else was inferred in the first place, so it is re-inferred.
 */
export const linkSourcePatch = (
    prev: { source: string | null | undefined; url: string | null | undefined },
    nextUrl: string
): { source?: string | null } => {
    if (sourceFromUrl(prev.url ?? '') !== (prev.source ?? null)) return {};
    return { source: sourceFromUrl(nextUrl) };
};
