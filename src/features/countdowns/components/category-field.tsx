import { Button } from '@/components/ui/buttons/button';
import { ColorPicker } from '@/components/ui/forms/color-picker';
import {
    formFieldClass,
    formFieldStyle,
    formLabelClass
} from '@/components/ui/forms/form-field-styles';
import { SelectOption } from '@/components/ui/forms/select-option';
import { useCountdownCategories } from '@/features/countdowns/api/get-countdown-categories';
import { useCreateCountdownCategory } from '@/features/countdowns/api/create-countdown-category';
// Shared palette with quick-created projects, so a new group is never colourless.
import { randomProjectColor } from '@/features/projects/utils/project-colors';
import { apiErrorMessage } from '@/lib/api-error-message';
import { Check, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';

type CategoryFieldProps = {
    /** Profile whose categories populate the dropdown (self-fetched). */
    profileId: number;
    value: number | null;
    onChange: (value: number | null) => void;
    id?: string;
    /** Open straight into inline-create mode with this name pre-filled (used by
     *  quick-add when an `@name` token matched no existing group). */
    initialCreatingName?: string;
};

/** Sentinel option value that swaps the select for the inline create input. */
const CREATE_CATEGORY_OPTION = '__create-category__';

/**
 * Countdown group dropdown that fetches the profile's categories itself. A
 * trailing "＋ New group…" option swaps the select for a name input plus a colour
 * swatch (confirm/cancel), the swatch pre-filled from the palette so a group is
 * never colourless. Picking from the list rather than typing is what stops a
 * typo forking a duplicate group. The created group is selected on success and
 * its colour stays editable in Manage groups.
 */
export const CategoryField = ({
    profileId,
    value,
    onChange,
    id,
    initialCreatingName
}: CategoryFieldProps) => {
    const generatedId = useId();
    const fieldId = id ?? `countdown-category-${generatedId}`;
    const categoriesQuery = useCountdownCategories({ profileId });
    const createCategory = useCreateCountdownCategory();
    const [isCreating, setIsCreating] = useState(!!initialCreatingName);
    const [newName, setNewName] = useState(initialCreatingName ?? '');
    const [newColor, setNewColor] = useState(randomProjectColor);

    const categories = categoriesQuery.data?.categories ?? [];

    const startCreate = () => {
        // Fresh palette suggestion each time, so cancelling and reopening does
        // not offer the colour that was just declined.
        setNewColor(randomProjectColor());
        setIsCreating(true);
    };

    const cancelCreate = () => {
        setIsCreating(false);
        setNewName('');
    };

    const confirmCreate = () => {
        const name = newName.trim();
        if (!name || createCategory.isPending) return;
        createCategory.mutate(
            { profile_id: profileId, name, color: newColor },
            {
                onSuccess: (data) => {
                    onChange(data.id);
                    cancelCreate();
                },
                onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create group.'))
            }
        );
    };

    const handleCreateKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Swallow Enter/Escape so the host form doesn't submit and the host
        // pane/editor doesn't close.
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            confirmCreate();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancelCreate();
        }
    };

    return (
        <div>
            <label className={formLabelClass} htmlFor={isCreating ? `${fieldId}-new` : fieldId}>
                Group
            </label>
            {isCreating ? (
                <div className='flex items-center gap-1.5'>
                    <input
                        id={`${fieldId}-new`}
                        type='text'
                        autoFocus
                        value={newName}
                        disabled={createCategory.isPending}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleCreateKeyDown}
                        placeholder='New group name…'
                        aria-label='New group name'
                        className={`${formFieldClass} placeholder:text-text-faint disabled:opacity-50`}
                        style={formFieldStyle}
                    />
                    <ColorPicker
                        mode='inline'
                        color={newColor}
                        onColorChange={setNewColor}
                        swatchLabel='New group colour'
                        disabled={createCategory.isPending}
                        title='Group colour'
                    />
                    <Button
                        variant='icon'
                        size='sm'
                        onClick={confirmCreate}
                        disabled={!newName.trim() || createCategory.isPending}
                        aria-label='Create group'
                        title='Create group'
                        className='shrink-0'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <Check size={14} />
                    </Button>
                    <Button
                        variant='subtle'
                        size='sm'
                        onClick={cancelCreate}
                        disabled={createCategory.isPending}
                        aria-label='Cancel new group'
                        title='Cancel'
                        className='shrink-0 border min-w-[28px] pointer-coarse:min-w-[44px]'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <X size={14} />
                    </Button>
                </div>
            ) : (
                <select
                    id={fieldId}
                    value={value ?? ''}
                    onChange={(e) => {
                        if (e.target.value === CREATE_CATEGORY_OPTION) {
                            startCreate();
                            return;
                        }
                        onChange(e.target.value === '' ? null : Number(e.target.value));
                    }}
                    className={formFieldClass}
                    style={{ ...formFieldStyle, colorScheme: 'dark' }}
                >
                    <SelectOption value=''>No group</SelectOption>
                    {categories.map((category) => (
                        <SelectOption key={category.id} value={category.id}>
                            {category.name}
                        </SelectOption>
                    ))}
                    <SelectOption value={CREATE_CATEGORY_OPTION}>＋ New group…</SelectOption>
                </select>
            )}
        </div>
    );
};
