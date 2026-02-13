import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

interface UseUnsavedChangesOptions {
    isDirty: boolean;
    message?: string;
    saving?: boolean; // If true, don't block navigation (e.g., during save operation)
}

/**
 * Hook to track unsaved changes and block navigation
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Custom message for the confirmation dialog
 * @param saving - If true, temporarily disable blocking (e.g., during save)
 */
export function useUnsavedChanges({ isDirty, message = 'You have unsaved changes. Are you sure you want to leave?', saving = false }: UseUnsavedChangesOptions) {
    // Block React Router navigation (but not if we're currently saving)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            !saving && isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === 'blocked') {
            const shouldLeave = window.confirm(message);
            if (shouldLeave) {
                blocker.proceed();
            } else {
                blocker.reset();
            }
        }
    }, [blocker, message]);

    // Block browser navigation (back/forward, refresh, close tab) - but not if saving
    useEffect(() => {
        if (!isDirty || saving) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, message]);
}
