import { describe, expect, it } from 'vitest';
import {
    EXTERNAL_LINK_STYLE,
    externalLinkChipStyle,
    isLinkableUrl,
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
