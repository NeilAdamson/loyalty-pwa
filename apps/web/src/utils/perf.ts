const perfEnabled = import.meta.env.DEV;

type PendingRouteTransition = {
    target: string;
    source: string;
    startedAt: number;
};

let pendingRouteTransition: PendingRouteTransition | null = null;

function now(): number {
    if (typeof performance === 'undefined') {
        return Date.now();
    }

    return performance.now();
}

function timestamp(): string {
    return `${now().toFixed(1)}ms`;
}

export function perfLog(scope: string, message: string, data?: unknown) {
    if (!perfEnabled) return;

    const prefix = `[perf ${timestamp()}] [${scope}] ${message}`;
    if (typeof data === 'undefined') {
        console.log(prefix);
        return;
    }

    console.log(prefix, data);
}

export function startPerf(scope: string, label: string, data?: unknown) {
    const startedAt = now();
    perfLog(scope, `${label} started`, data);

    return (result?: unknown) => {
        const durationMs = now() - startedAt;
        perfLog(scope, `${label} finished in ${durationMs.toFixed(1)}ms`, result);
    };
}

export function beginRouteTransition(target: string, source: string) {
    pendingRouteTransition = {
        target,
        source,
        startedAt: now()
    };

    perfLog('route', 'transition started', { source, target });
}

export function completeRouteTransition(pathname: string, data?: unknown) {
    if (!pendingRouteTransition) {
        perfLog('route', 'route visible', { pathname, ...asObject(data) });
        return;
    }

    if (pendingRouteTransition.target !== pathname) {
        perfLog('route', 'route visible without matching transition', {
            pathname,
            pendingTarget: pendingRouteTransition.target,
            ...asObject(data)
        });
        return;
    }

    const durationMs = now() - pendingRouteTransition.startedAt;
    perfLog('route', `transition finished in ${durationMs.toFixed(1)}ms`, {
        source: pendingRouteTransition.source,
        target: pendingRouteTransition.target,
        ...asObject(data)
    });
    pendingRouteTransition = null;
}

function asObject(data?: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {};
    }

    return data as Record<string, unknown>;
}
