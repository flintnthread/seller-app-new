/** Deduplicate picker labels while preserving first-seen order. */
export function uniquePickerOptions(options: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of options) {
        const label = raw?.trim();
        if (!label || seen.has(label)) continue;
        seen.add(label);
        result.push(label);
    }
    return result;
}
