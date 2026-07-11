/**
 * Re-export shim: the context menu was split into `task-context-menu/`
 * (root + status/priority/project/date submenus) to keep each file small.
 * Kept at this path so existing imports (`./task-context-menu`) still work.
 */
export { TaskContextMenu, type MenuPoint } from './task-context-menu/index';
