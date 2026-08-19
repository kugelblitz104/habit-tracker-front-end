import { expect, gotoAppRoute, test } from '../fixtures/test';
import type { Page } from '@playwright/test';

/**
 * # Target-size lock
 *
 * Measures every interactive target's rendered box and fails anything under
 * 24x24 CSS px (WCAG 2.2 SC 2.5.8, Level AA) on the desktop pointer, and under
 * 44x44 on a coarse pointer (SC 2.5.5 / Apple HIG).
 *
 * This measures the driver directly rather than proxying it through class
 * names, which is why it replaced an earlier grep-for-raw-`<button>` idea. It
 * also reaches the surfaces the manual audit did not: detail routes, editors
 * and the public pages.
 *
 * SC 2.5.8 measures the target - the area that responds to a pointer - not
 * the visible mark, so a control whose hit area is enlarged via a centred
 * `::after` (the `hit-target` utility) conforms even though its own box is
 * small. The effective size below is the union of the element's own box and
 * its `::after` box, which is what makes that technique register here.
 *
 * ## Allowlist
 *
 * `ALLOWED` entries are accessible names exempted with a stated reason. The
 * ONLY acceptable reasons are the SC 2.5.8 exceptions: spacing, inline,
 * essential, user agent control. "It looks fine" is not one. Adding an entry
 * without a reason in the comment is a review failure.
 *
 * ## The `data-target-exempt` escape hatch
 *
 * A name allowlist can't tell two controls with the same accessible name
 * apart, and some names (a project chip's link text) come from fixture data
 * rather than the app, so a name-keyed exemption there would be unmaintainable
 * and too broad. An element carrying `data-target-exempt="<reason>"` is
 * excluded from the undersized list regardless of name, but only when
 * `<reason>` is one of the four SC 2.5.8 exceptions: `spacing`, `inline`,
 * `equivalent`, `essential`. This declares the exception at the point of
 * truth - the component that renders the target is the one asserting which
 * exception applies and why. Any other value (a typo, or the attribute
 * present with no value) does NOT exempt the element; it still fails, and
 * the failure message says the reason was invalid, because an unrecognised
 * reason is a mistake, not an exemption.
 */

const AA_MIN = 24;
const TOUCH_MIN = 44;

/** The only reasons `data-target-exempt` accepts, per WCAG 2.2 SC 2.5.8. */
const LEGAL_EXEMPT_REASONS = ['spacing', 'inline', 'equivalent', 'essential'] as const;
type ExemptReason = (typeof LEGAL_EXEMPT_REASONS)[number];

const isLegalExemptReason = (value: string | null): value is ExemptReason =>
    value !== null && (LEGAL_EXEMPT_REASONS as readonly string[]).includes(value);

/** Accessible name -> reason for exemption. SC 2.5.8 exceptions only. */
const ALLOWED: Record<string, string> = {
    // Inline exception: sits inside a sentence in the Settings data card.
    'Release notes': 'inline'
};

type Target = {
    tag: string;
    name: string;
    /** Raw `data-target-exempt` attribute value, or null if absent. */
    exempt: string | null;
    w: number;
    h: number;
    ew: number;
    eh: number;
};

const MEASURE = `() => {
    const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch]';
    const out = [];
    for (const el of Array.from(document.querySelectorAll(sel))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;

        // A positioned, rendered ::after (e.g. the hit-target utility's centred
        // 44x44 box) enlarges the effective target per SC 2.5.8 even though the
        // element's own box stays small. When no such pseudo-element exists,
        // getComputedStyle(el, '::after').width/height is the string "auto", and
        // parseFloat("auto") is NaN - treat that as 0 so it never widens anything
        // by accident.
        const after = getComputedStyle(el, '::after');
        const afterActive = after.content !== 'none' && after.position === 'absolute';
        const afterW = afterActive ? parseFloat(after.width) || 0 : 0;
        const afterH = afterActive ? parseFloat(after.height) || 0 : 0;

        out.push({
            tag: el.tagName.toLowerCase(),
            name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60),
            exempt: el.getAttribute('data-target-exempt'),
            w: Math.round(r.width * 10) / 10,
            h: Math.round(r.height * 10) / 10,
            ew: Math.round(Math.max(r.width, afterW) * 10) / 10,
            eh: Math.round(Math.max(r.height, afterH) * 10) / 10
        });
    }
    return out;
}`;

const undersized = async (page: Page, min: number): Promise<Target[]> => {
    const rows = (await page.evaluate(`(${MEASURE})()`)) as Target[];
    return rows.filter(
        (t) =>
            (t.ew < min || t.eh < min) &&
            ALLOWED[t.name] === undefined &&
            !isLegalExemptReason(t.exempt)
    );
};

const ROUTES: readonly (readonly [string, string])[] = [
    ['today', '/'],
    ['tasks', '/tasks'],
    ['countdown', '/countdown'],
    ['habits', '/habits'],
    ['projects', '/projects'],
    ['timer', '/timer'],
    ['insights', '/insights'],
    ['settings', '/settings']
];

test('@narrow @touch every interactive target meets the size floor', async ({
    authedPage: page
}) => {
    test.setTimeout(300_000);
    // `hasTouch` is what flips the app's pointer-coarse branch on, so the
    // threshold has to follow the project rather than the viewport.
    const isTouch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    const min = isTouch ? TOUCH_MIN : AA_MIN;

    const failures: string[] = [];
    for (const [label, url] of ROUTES) {
        await gotoAppRoute(page, url);
        await page.waitForTimeout(900);
        for (const t of await undersized(page, min)) {
            // An element with the attribute present but an unrecognised value is a
            // mistake, not an exemption - name it in the failure rather than fail silently.
            const invalidReason =
                t.exempt !== null ? ` (invalid data-target-exempt reason: "${t.exempt}")` : '';
            failures.push(
                `${label}: ${t.tag} "${t.name}" ${t.w}x${t.h} (effective ${t.ew}x${t.eh}, min ${min})${invalidReason}`
            );
        }
    }

    expect(failures, `Undersized targets:\n${failures.join('\n')}`).toEqual([]);
});
