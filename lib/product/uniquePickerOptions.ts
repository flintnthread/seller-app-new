/** Deduplicate picker labels and sort A–Z for display (does not change API data). */
export function uniquePickerOptions(options: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of options) {
        const label = raw?.trim();
        if (!label || seen.has(label)) continue;
        seen.add(label);
        result.push(label);
    }
    return result.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
