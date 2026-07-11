import type { HabitRead } from '@/api';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { Label } from '@/components/ui/label';
import { getFrequencyString } from '@/lib/date-utils';
import { GripVertical } from 'lucide-react';
import { useState } from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@headlessui/react';

type ItemProps = {
    habit: HabitRead;
    style?: React.CSSProperties;
    ref?: (node: HTMLElement | null) => void;
    attributes?: any;
    listeners?: any;
    opacity?: number;
};

const Item = ({ habit, style, ref, attributes, listeners, opacity }: ItemProps) => {
    return (
        <li
            className='mb-2 flex items-center justify-between gap-4 rounded-row border p-2.5'
            style={{
                ...style,
                opacity,
                touchAction: 'none',
                backgroundColor: 'var(--surface-input-bg)',
                borderColor: 'var(--surface-input-border)'
            }}
            ref={ref}
            {...attributes}
            {...listeners}
        >
            <Label
                mainText={habit.name}
                subText={getFrequencyString(habit.frequency, habit.range)}
                textColor={habit.color}
                className='mx-2'
            />
            <GripVertical size={16} className='cursor-move text-text-muted' />
        </li>
    );
};

const SortableItem = ({ habit, isDragging }: { habit: HabitRead; isDragging: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: habit.id
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <Item
            habit={habit}
            ref={setNodeRef}
            style={style}
            attributes={attributes}
            listeners={listeners}
            opacity={isDragging ? 0.5 : 1}
        />
    );
};

type SortHabitModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleSortHabits: (habits: HabitRead[]) => void;
    habits: HabitRead[];
};

export const SortHabitModal = ({
    isOpen,
    onClose,
    handleSortHabits,
    habits
}: SortHabitModalProps) => {
    const [habitsState, setHabitsState] = useState<HabitRead[]>(
        habits
            .filter((habit) => !habit.archived)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    );
    const [activeId, setActiveId] = useState<number | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5
            }
        })
    );

    const handleDragStart = (event: { active: any }) => {
        const { active } = event;
        setActiveId(active.id);
    };

    const handleDragEnd = (event: { active: any; over: any }) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setHabitsState((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = [...items];
                const [movedItem] = newItems.splice(oldIndex, 1);
                if (movedItem) {
                    newItems.splice(newIndex, 0, movedItem);
                }
                return newItems;
            });
        }

        setActiveId(null);
    };

    if (habitsState.length === 0) {
        return (
            <BaseModal isOpen={isOpen} onClose={onClose} title='Sort Habits'>
                <p className='font-mono text-[12px] text-text-muted'>No habits to sort.</p>
            </BaseModal>
        );
    }

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title='Sort Habits'>
            <DndContext
                collisionDetection={closestCenter}
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={habitsState.map((h) => h.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <ul>
                        {habitsState.map((habit) => (
                            <SortableItem
                                key={habit.id}
                                habit={habit}
                                isDragging={activeId === habit.id}
                            />
                        ))}
                    </ul>
                </SortableContext>
                <DragOverlay>
                    {activeId && (
                        <Item
                            habit={habitsState.find((habit) => habit.id === activeId)!}
                            opacity={1}
                        />
                    )}
                </DragOverlay>
            </DndContext>
            <div className='mt-4 flex w-full justify-end gap-2'>
                <Button
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary'
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-90'
                    style={{
                        backgroundColor: 'var(--color-habit-accent)',
                        color: 'var(--bg)'
                    }}
                    onClick={() => {
                        handleSortHabits(habitsState);
                        onClose();
                    }}
                >
                    Save Order
                </Button>
            </div>
        </BaseModal>
    );
};
