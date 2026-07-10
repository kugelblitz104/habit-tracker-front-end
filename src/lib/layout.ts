// Shared page-width scheme for the primary surfaces (Today / Habits / Projects
// and their detail pages). Using the SAME values everywhere means switching
// between pages via the top nav never shifts the layout width.
//
// Use PAGE_MAX_WIDTH for the normal content column, and PAGE_MAX_WIDTH_PANE
// when a detail pane (task/habit) is open beside the content.
export const PAGE_MAX_WIDTH = 'max-w-[1080px]';
export const PAGE_MAX_WIDTH_PANE = 'max-w-[1440px]';
