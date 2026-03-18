'use client';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AlertDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly confirmText?: string;
  readonly cancelText?: string;
  readonly onConfirm?: () => void;
  readonly showCancel?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  showCancel = false,
}: AlertDialogProps) {
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="text-center px-6 pt-8 pb-0 gap-0">
        {/* 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-indigo-600">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
        </div>

        {/* 제목 */}
        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h3>

        {/* 설명 */}
        {description && (
          <p className="text-sm text-gray-500 leading-relaxed mb-6">{description}</p>
        )}
        {!description && <div className="mb-6" />}

        {/* 버튼 */}
        <div className="-mx-6 border-t border-gray-200 p-4 flex gap-3">
          {showCancel && (
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11"
              onClick={() => onOpenChange(false)}
            >
              {cancelText}
            </Button>
          )}
          <Button
            className="flex-1 rounded-xl h-11"
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
