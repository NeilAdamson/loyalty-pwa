export async function downloadPosterPng(element: HTMLElement, filename: string): Promise<void> {
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(element, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
    });
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
