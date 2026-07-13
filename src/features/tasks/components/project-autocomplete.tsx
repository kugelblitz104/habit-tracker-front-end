import type { ProjectRead } from '@/api';
import { MENU_ITEM_CLASS, POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';

/**
 * Dropdown of projects matching an in-progress `@` token in the task capture
 * bar. Purely presentational — the caret/active-token detection, filtering,
 * and keyboard wiring live in TaskCaptureBar, which owns the input value and
 * projects list. Selectable by mouse (click) or keyboard (the parent drives
 * `highlightedIndex` via arrow keys and calls `onSelect` on Enter).
 */

type ProjectAutocompleteProps = {
    items: ProjectRead[];
    highlightedIndex: number;
    onHover: (index: number) => void;
    onSelect: (project: ProjectRead) => void;
};

export const ProjectAutocomplete = ({
    items,
    highlightedIndex,
    onHover,
    onSelect
}: ProjectAutocompleteProps) => {
    if (items.length === 0) return null;

    return (
        <div
            role='listbox'
            aria-label='Matching projects'
            className={`absolute left-0 top-full mt-1 w-56 max-h-60 overflow-auto ${POPOVER_PANEL_CLASS}`}
            style={popoverPanelStyle}
        >
            {items.map((project, index) => (
                <button
                    key={project.id}
                    type='button'
                    role='option'
                    aria-selected={index === highlightedIndex}
                    // Prevent the mousedown from blurring the input (which would close
                    // this dropdown before the click's onSelect gets a chance to fire).
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => onHover(index)}
                    onClick={() => onSelect(project)}
                    className={`${MENU_ITEM_CLASS} ${index === highlightedIndex ? 'bg-white/5' : ''}`}
                >
                    <span
                        className='h-2 w-2 shrink-0 rounded-full'
                        style={{ backgroundColor: project.color }}
                        aria-hidden='true'
                    />
                    <span className='truncate'>{project.name}</span>
                </button>
            ))}
        </div>
    );
};
