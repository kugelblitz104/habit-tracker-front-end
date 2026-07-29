/** Lowercase and collapse non-alphanumeric runs to single dashes ("My Project!" -> "my-project"). */
export const slugify = (value: string, fallback: string): string => {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || fallback;
};

/** Trigger a browser download of a Blob via a temporary object URL + anchor click. */
export const downloadBlob = (blob: Blob, filename: string): void => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};

/** Wrap `content` in a Blob of the given MIME `type` and trigger a browser download. */
export const downloadText = (content: string, filename: string, type: string): void => {
    downloadBlob(new Blob([content], { type }), filename);
};
