import { describe, expect, it } from 'vitest';
import {
    EXTERNAL_LINK_STYLE,
    externalLinkChipStyle,
    isLinkableUrl,
    linkSourcePatch,
    sourceFromUrl
} from './external-link';

describe('sourceFromUrl', () => {
    it('recognises Azure DevOps cloud and on-prem visualstudio.com hosts', () => {
        expect(sourceFromUrl('https://dev.azure.com/org/proj/_workitems/edit/2841')).toBe(
            'azure_devops'
        );
        expect(sourceFromUrl('https://org.visualstudio.com/proj/_workitems/edit/2841')).toBe(
            'azure_devops'
        );
    });

    it('recognises GitHub', () => {
        expect(sourceFromUrl('https://github.com/octocat/hello/issues/42')).toBe('github');
    });

    // A soft link: the URL points at something with no integration behind it,
    // so there is no provider to name and the API stores source as null.
    it('returns null for any other host', () => {
        expect(sourceFromUrl('https://example.atlassian.net/browse/PROJ-412')).toBeNull();
        expect(sourceFromUrl('http://intranet.local/wiki/9')).toBeNull();
    });
});

describe('externalLinkChipStyle', () => {
    it('uses the GitHub palette for a GitHub link', () => {
        expect(externalLinkChipStyle('github')).toEqual(EXTERNAL_LINK_STYLE.github);
    });

    it('uses the Azure palette for an Azure DevOps link', () => {
        expect(externalLinkChipStyle('azure_devops')).toEqual(EXTERNAL_LINK_STYLE.azure_devops);
    });

    // The bug this fixes: both renderers used a two-branch ternary, so a link
    // with no provider fell through to the Azure branch and a Jira ticket
    // rendered in Azure blue.
    it('uses the neutral palette when there is no provider', () => {
        expect(externalLinkChipStyle(null)).toEqual(EXTERNAL_LINK_STYLE.neutral);
    });

    it('uses the neutral palette for an unrecognised provider', () => {
        expect(externalLinkChipStyle('loop')).toEqual(EXTERNAL_LINK_STYLE.neutral);
    });

    it('never returns the Azure palette for a provider-less link', () => {
        expect(externalLinkChipStyle(null)).not.toEqual(EXTERNAL_LINK_STYLE.azure_devops);
    });
});

describe('isLinkableUrl', () => {
    it('accepts http and https', () => {
        expect(isLinkableUrl('https://example.atlassian.net/browse/PROJ-412')).toBe(true);
        expect(isLinkableUrl('http://intranet.local/wiki/9')).toBe(true);
    });

    // Mirrors the API's normalize_external_url, so a paste that would 422 is
    // caught in the form instead of coming back as a toast.
    it('rejects a scheme-less URL', () => {
        expect(isLinkableUrl('dev.azure.com/org/proj/_workitems/edit/412')).toBe(false);
    });

    it('rejects a javascript: URL', () => {
        expect(isLinkableUrl('javascript:alert(1)')).toBe(false);
    });

    it('ignores surrounding whitespace, as the API trims it', () => {
        expect(isLinkableUrl('  https://example.com/1  ')).toBe(true);
    });

    it('rejects a blank string', () => {
        expect(isLinkableUrl('   ')).toBe(false);
    });
});

describe('linkSourcePatch', () => {
    const GITHUB = 'https://github.com/octocat/hello/issues/42';
    const JIRA = 'https://example.atlassian.net/browse/PROJ-412';
    /** An on-prem Azure DevOps host, which `sourceFromUrl` cannot recognise. */
    const ON_PREM = 'https://tfs.corp/tfs/Proj/_workitems/edit/2841';

    it('re-infers when the stored source is what its own URL implies', () => {
        expect(linkSourcePatch({ source: null, url: JIRA }, GITHUB)).toEqual({ source: 'github' });
    });

    it('demotes to null when an inferred link moves to an unrecognised host', () => {
        expect(linkSourcePatch({ source: 'github', url: GITHUB }, JIRA)).toEqual({ source: null });
    });

    // A published on-prem Azure DevOps link: its source came from the
    // connection's provider, not from the URL, so re-inferring would demote it
    // to null and repaint its chip neutral.
    it('omits source when the stored value disagrees with its own URL', () => {
        expect(linkSourcePatch({ source: 'azure_devops', url: ON_PREM }, ON_PREM)).toEqual({});
    });

    it('preserves a provider name this client does not know', () => {
        expect(linkSourcePatch({ source: 'jira', url: JIRA }, GITHUB)).toEqual({});
    });

    // A no-op write rather than an omission, which is cheaper than a second
    // condition to avoid it.
    it('re-sends the same value when only the reference changed', () => {
        expect(linkSourcePatch({ source: 'github', url: GITHUB }, GITHUB)).toEqual({
            source: 'github'
        });
    });

    it('treats a missing stored URL as implying no source', () => {
        expect(linkSourcePatch({ source: null, url: undefined }, GITHUB)).toEqual({
            source: 'github'
        });
    });
});
