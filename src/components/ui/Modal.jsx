import { forwardRef, useEffect, useCallback } from "react";
import { sanitizeInput } from "../../utils/security";

/**
 * Modal Component
 * Accessible modal dialog with keyboard navigation and focus trap
 * @param {Object} props - Component props
 */
export const Modal = forwardRef(({
  isOpen = false,
  onClose,
  title = "",
  children,
  size = "md",
  closeOnOverlay = true,
  showCloseButton = true,
  className = "",
  ...props
}, ref) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const modal = document.getElementById("modal-content");
    if (modal) {
      modal.focus();
    }
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (closeOnOverlay && e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [closeOnOverlay, onClose]
  );

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]",
  };

  const sanitizedTitle = sanitizeInput(title);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      {...props}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[color:var(--retro-bg-dark)]/80 backdrop-blur-sm animate-fadeIn"
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        id="modal-content"
        className={`
          relative z-10 w-full ${sizes[size] || sizes.md}
          bg-[color:var(--retro-bg-primary)]
          rounded-lg shadow-retro-lg border border-[color:var(--retro-border)]
          animate-slideUp
          ${className}
        `}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-[color:var(--retro-border)] px-6 py-4">
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-[color:var(--retro-text-primary)]"
              >
                {sanitizedTitle}
              </h2>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className="rounded-full p-2 text-[color:var(--retro-text-secondary)] hover:bg-[color:var(--retro-bg-tertiary)] hover:text-[color:var(--retro-text-primary)] transition-colors"
                aria-label="Close modal"
              >
                <i className="ri-close-line text-xl" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
});

Modal.displayName = "Modal";

export default Modal;
