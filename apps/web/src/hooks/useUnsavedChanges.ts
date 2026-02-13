import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

interface UseUnsavedChangesOptions {
    isDirty: boolean;
    message?: string;
}

/**
 * Hook to track unsaved changes and block navigation
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Custom message for the confirmation dialog
 */
export function useUnsavedChanges({ isDirty, message = 'You have unsaved changes. Are you sure you want to leave?' }: UseUnsavedChangesOptions) {
    // Block React Router navigation
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
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

    // Block browser navigation (back/forward, refresh, close tab)
    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, message]);
}
