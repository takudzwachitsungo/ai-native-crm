import { useState } from "react";
import { Icons } from "./icons";
import { Modal } from "./Modal";
import { Loader2 } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
  additionalActions?: Array<{
    id?: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
}

export function BulkActionsBar({ 
  selectedCount, 
  onDelete, 
  onDeselectAll,
  isLoading = false,
  additionalActions = [] 
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  if (selectedCount === 0) return null;

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-primary/10 border-y border-primary/20 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground" aria-live="polite" aria-atomic="true">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        <button
          onClick={onDeselectAll}
          className="text-sm text-primary hover:underline"
          disabled={isLoading}
        >
          Deselect all
        </button>
      </div>
      <div className="flex items-center gap-2">
        {additionalActions.map((action) => (
          <button
            key={action.id || action.label}
            onClick={action.onClick}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        <button
          onClick={handleDeleteClick}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Icons.Trash size={14} />
          )}
          Delete
        </button>
      </div>
    </div>

    <Modal
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      title="Confirm Delete"
      size="sm"
      footer={
        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      }
    >
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete {selectedCount} item{selectedCount !== 1 ? 's' : ''}? This action cannot be undone.
        </p>
      </div>
    </Modal>
    </>
  );
}
