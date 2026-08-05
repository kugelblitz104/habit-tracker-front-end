import type { CountdownCategoryRead } from '@/api';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { InlineConfirmAction } from '@/components/ui/inline-confirm-action';
import { QueryState } from '@/components/ui/query-state';
import { compactFieldClass, compactFieldStyle } from '@/components/ui/forms/form-field-styles';
import { useCountdownCategories } from '@/features/countdowns/api/get-countdown-categories';
import { useUpdateCountdownCategory } from '@/features/countdowns/api/update-countdown-category';
import { useDeleteCountdownCategory } from '@/features/countdowns/api/delete-countdown-category';
import {
    shouldSendColor,
    shouldSendRename,
    swatchColor
} from '@/features/countdowns/utils/category-edits';
import { apiErrorMessage } from '@/lib/api-error-message';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type ManageCategoriesModalProps = {
    isOpen: boolean;
    onClose: () => void;
    profileId: number;
};

type CategoryRowProps = {
    category: CountdownCategoryRead;
    isConfirmingDelete: boolean;
    deletePending: boolean;
    onStartDelete: () => void;
    onCancelDelete: () => void;
    onDelete: () => void;
    onColorChange: (color: string) => void;
    onRename: (nextName: string) => void;
};

const CategoryRow = ({
    category,
    isConfirmingDelete,
    deletePending,
    onStartDelete,
    onCancelDelete,
    onDelete,
    onColorChange,
    onRename
}: CategoryRowProps) => {
    const [name, setName] = useState(category.name);
    // `<input type="color">` fires React's onChange for every pointer move while
    // the picker is open, so the value is held locally and sent once on blur,
    // the same way the name field beside it commits.
    const [color, setColor] = useState(swatchColor(category.color));

    useEffect(() => {
        setName(category.name);
    }, [category.name]);

    useEffect(() => {
        setColor(swatchColor(category.color));
    }, [category.color]);

    const commitRename = () => {
        if (!shouldSendRename(category.name, name)) return;
        onRename(name.trim());
    };

    const commitColor = () => {
        if (!shouldSendColor(category.color, color)) return;
        onColorChange(color);
    };

    return (
        <li
            className='flex items-center gap-2 rounded-row border p-2.5'
            style={{
                backgroundColor: 'var(--surface-input-bg)',
                borderColor: 'var(--surface-input-border)'
            }}
        >
            {/* Mid-confirm the row collapses to the prompt alone, so the swatch
                and name field cannot be edited on a group being deleted. The
                prompt carries the name, which the hidden field was showing. */}
            {!isConfirmingDelete && (
                <>
                    <input
                        type='color'
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        onBlur={commitColor}
                        aria-label={`Color for ${category.name}`}
                        title='Group color'
                        className='h-8 w-9 shrink-0 cursor-pointer rounded-button border bg-transparent p-0.5'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    />
                    <input
                        type='text'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        aria-label={`Name for group "${category.name}"`}
                        className={`${compactFieldClass} min-w-0 flex-1`}
                        style={compactFieldStyle}
                    />
                </>
            )}
            <InlineConfirmAction
                isConfirming={isConfirmingDelete}
                onConfirm={onDelete}
                onCancel={onCancelDelete}
                pending={deletePending}
                confirmPrompt={`Delete "${category.name}"?`}
            >
                <button
                    type='button'
                    onClick={onStartDelete}
                    aria-label={`Delete group "${category.name}"`}
                    title='Countdowns in this group move to Other; none are deleted'
                    className='rounded-[8px] p-1.5 text-text-faint transition-colors hover:text-danger'
                >
                    <Trash2 size={14} />
                </button>
            </InlineConfirmAction>
        </li>
    );
};

/**
 * Lists every countdown category for the profile, including ones with no
 * countdowns left in them, the only surface where those are visible and
 * deletable. Each row recolors and renames independently (PATCH on blur), and
 * deletes through a per-row inline confirm.
 */
export const ManageCategoriesModal = ({
    isOpen,
    onClose,
    profileId
}: ManageCategoriesModalProps) => {
    const categoriesQuery = useCountdownCategories({ profileId });
    const update = useUpdateCountdownCategory();
    const del = useDeleteCountdownCategory();
    const [confirmingId, setConfirmingId] = useState<number | null>(null);

    const categories = categoriesQuery.data?.categories ?? [];

    const handleColorChange = (category: CountdownCategoryRead, color: string) => {
        update.mutate(
            { categoryId: category.id, data: { color } },
            { onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update color')) }
        );
    };

    const handleRename = (category: CountdownCategoryRead, nextName: string) => {
        update.mutate(
            { categoryId: category.id, data: { name: nextName } },
            {
                onError: (error) =>
                    toast.error(apiErrorMessage(error, 'A group with that name already exists'))
            }
        );
    };

    const handleDelete = (category: CountdownCategoryRead) => {
        del.mutate(category.id, {
            onSuccess: () => {
                toast.success(`"${category.name}" deleted, its countdowns moved to Other`);
                setConfirmingId(null);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to delete group'));
                setConfirmingId(null);
            }
        });
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title='Manage groups'>
            <p className='font-mono text-[11px] text-text-faint'>
                Deleting a group keeps its countdowns; they move to Other.
            </p>
            <QueryState
                isError={categoriesQuery.isError}
                isLoading={categoriesQuery.isLoading}
                errorMessage='Failed to load groups.'
                loadingMessage='Loading…'
                size='sm'
            />
            {!categoriesQuery.isError && !categoriesQuery.isLoading && categories.length === 0 && (
                <p className='font-mono text-[12px] text-text-muted'>No groups yet.</p>
            )}
            {categories.length > 0 && (
                <ul className='flex flex-col gap-2'>
                    {categories.map((category) => (
                        <CategoryRow
                            key={category.id}
                            category={category}
                            isConfirmingDelete={confirmingId === category.id}
                            deletePending={del.isPending && confirmingId === category.id}
                            onStartDelete={() => setConfirmingId(category.id)}
                            onCancelDelete={() => setConfirmingId(null)}
                            onDelete={() => handleDelete(category)}
                            onColorChange={(color) => handleColorChange(category, color)}
                            onRename={(nextName) => handleRename(category, nextName)}
                        />
                    ))}
                </ul>
            )}
            <div className='mt-4 flex justify-end'>
                <button
                    type='button'
                    onClick={onClose}
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary'
                >
                    Close
                </button>
            </div>
        </BaseModal>
    );
};
