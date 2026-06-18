"use client";

// Drag-and-drop reorderable grid wrapper for dashboard widgets.
// Uses HTML5 Drag and Drop API — zero dependencies, works everywhere.
// Persists the order in a callback.

import { useCallback, useRef, type ReactNode, type DragEvent } from "react";
import { GripVertical } from "lucide-react";

export interface ReorderableItem {
  id: string;
  content: ReactNode;
}

export function ReorderableGrid({
  items,
  onReorder,
  className = "",
  disabled = false,
}: {
  items: ReorderableItem[];
  onReorder: (ids: string[]) => void;
  className?: string;
  disabled?: boolean;
}) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = useCallback(
    (index: number) => (e: DragEvent) => {
      if (disabled) return;
      dragItem.current = index;
      e.dataTransfer.effectAllowed = "move";
      // Make the drag image semi-transparent
      const target = e.currentTarget as HTMLElement;
      target.style.opacity = "0.5";
    },
    [disabled],
  );

  const handleDragEnd = useCallback(
    (e: DragEvent) => {
      const target = e.currentTarget as HTMLElement;
      target.style.opacity = "1";
      dragItem.current = null;
      dragOverItem.current = null;
    },
    [],
  );

  const handleDragOver = useCallback(
    (index: number) => (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      dragOverItem.current = index;
    },
    [disabled],
  );

  const handleDrop = useCallback(
    () => (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      const dragIdx = dragItem.current;
      const dropIdx = dragOverItem.current;
      if (dragIdx === null || dropIdx === null || dragIdx === dropIdx) return;

      const newItems = [...items];
      const [removed] = newItems.splice(dragIdx, 1);
      newItems.splice(dropIdx, 0, removed);
      onReorder(newItems.map((i) => i.id));
      dragItem.current = null;
      dragOverItem.current = null;
    },
    [disabled, items, onReorder],
  );

  if (disabled) {
    return (
      <div className={className}>
        {items.map((item) => (
          <div key={item.id}>{item.content}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, i) => (
        <div
          key={item.id}
          draggable={!disabled}
          onDragStart={handleDragStart(i)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver(i)}
          onDrop={handleDrop()}
          className="group relative"
        >
          {/* Drag handle — appears on hover */}
          <div
            className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4 text-faint" />
          </div>
          {item.content}
        </div>
      ))}
    </div>
  );
}
