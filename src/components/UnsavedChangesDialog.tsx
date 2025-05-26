"use client";

import { useEffect } from 'react';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onSubmit: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesDialog({
  isOpen,
  onSubmit,
  onDiscard,
  onCancel
}: UnsavedChangesDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3>Unsaved Changes</h3>
        <p>You have unsaved mapping changes. What would you like to do?</p>
        
        <div className="dialog-actions">
          <button
            onClick={onSubmit}
            className="submit-button"
          >
            Submit Changes
          </button>
          <button
            onClick={onDiscard}
            className="discard-button"
          >
            Discard Changes
          </button>
          <button
            onClick={onCancel}
            className="cancel-button"
          >
            Stay on Page
          </button>
        </div>
      </div>

      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .dialog-content {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .dialog-content h3 {
          margin: 0 0 1rem 0;
          color: #202124;
          font-size: 1.3rem;
        }

        .dialog-content p {
          margin: 0 0 1.5rem 0;
          color: #5f6368;
          line-height: 1.5;
        }

        .dialog-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .submit-button {
          background-color: #34a853;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-button:hover {
          background-color: #2d8f47;
        }

        .discard-button {
          background-color: #ea4335;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .discard-button:hover {
          background-color: #d73527;
        }

        .cancel-button {
          background-color: #f1f3f4;
          color: #202124;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .cancel-button:hover {
          background-color: #e8eaed;
        }

        @media (min-width: 480px) {
          .dialog-actions {
            flex-direction: row;
            justify-content: flex-end;
          }

          .cancel-button {
            order: 1;
          }

          .discard-button {
            order: 2;
          }

          .submit-button {
            order: 3;
          }
        }
      `}</style>
    </div>
  );
}