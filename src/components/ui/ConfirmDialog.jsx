import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';
  const iconColor = variant === 'danger' ? 'text-red-500' : 'text-amber-500';
  const iconBg   = variant === 'danger' ? 'bg-red-50'   : 'bg-amber-50';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
          {variant === 'danger' ? (
            <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          ) : (
            <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
          )}
        </div>
        <p className="text-ez-muted text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 w-full pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">{cancelText}</Button>
          <Button variant={confirmVariant} onClick={onConfirm} className="flex-1">{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
