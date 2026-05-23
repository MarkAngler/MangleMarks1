import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
}: ConfirmationModalProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSubmitting ? undefined : onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4 overflow-hidden z-10"
            id="confirmation-modal-container"
          >
            <div className="flex gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isDanger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {isDanger ? (
                  <AlertTriangle className="h-5 w-5" id="confirmation-danger-icon" />
                ) : (
                  <Info className="h-5 w-5" id="confirmation-info-icon" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-bold text-slate-900" id="confirmation-modal-title">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 leading-normal" id="confirmation-modal-message">
                  {message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="rounded px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 disabled:opacity-50 transition cursor-pointer"
                id="confirmation-cancel-button"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className={`rounded px-4 py-1.5 text-xs font-semibold text-white transition focus:outline-hidden disabled:opacity-50 cursor-pointer flex items-center gap-1.5 ${
                  isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-250'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-250'
                }`}
                id="confirmation-confirm-button"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
