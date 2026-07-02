function isCrossOriginUrl(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.href);
        return parsed.origin !== window.location.origin;
    } catch {
        return true;
    }
}

function shouldIncludePosterNode(node: Node): boolean {
    if (!(node instanceof HTMLElement)) {
        return true;
    }

    if (node instanceof HTMLImageElement) {
        const src = node.currentSrc || node.src;
        if (!src) {
            return false;
        }
        if (!node.complete || node.naturalWidth === 0) {
            return false;
        }
        if (isCrossOriginUrl(src)) {
            return false;
        }
    }

    return true;
}

export async function downloadPosterPng(element: HTMLElement, filename: string): Promise<void> {
    const { toPng } = await import('html-to-image');
    const options = {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        filter: shouldIncludePosterNode,
    };

    let dataUrl: string;
    try {
        dataUrl = await toPng(element, options);
    } catch {
        // Last resort: skip all images (keeps QR SVG + text).
        dataUrl = await toPng(element, {
            ...options,
            filter: (node: Node) => !(node instanceof HTMLImageElement),
        });
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

export function printSignupPoster(): void {
    document.body.classList.add('print-signup-qr-poster');
    window.print();
    window.setTimeout(() => {
        document.body.classList.remove('print-signup-qr-poster');
    }, 500);
}

export { isCrossOriginUrl, shouldIncludePosterNode };
