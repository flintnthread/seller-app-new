import { Platform } from "react-native";
import type { ScrollView } from "react-native";

import { scrollViewsToTop } from "./scrollToTop";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScrollTarget = any;

export function parseVariantValidationError(error: string): { index: number; fieldKey: string } | null {
    const match = error.match(/Variant\s+#(\d+):\s*(.+)/i);
    if (!match) return null;

    const index = Math.max(0, parseInt(match[1], 10) - 1);
    const detail = match[2].toLowerCase();

    let fieldKey = "card";
    if (detail.includes("color")) fieldKey = "color";
    else if (detail.includes("size")) fieldKey = "size";
    else if (detail.includes("stock")) fieldKey = "stock";
    else if (detail.includes("mrp")) fieldKey = "mrp";
    else if (detail.includes("selling")) fieldKey = "sellingPrice";
    else if (detail.includes("image")) fieldKey = "images";

    return { index, fieldKey };
}

export function scrollToFieldTarget(
    target: unknown,
    container?: ScrollView | null,
    offsetY = 16,
) {
    const scrollTarget = target as ScrollTarget;
    if (!scrollTarget) {
        scrollViewsToTop(container);
        return;
    }

    if (Platform.OS === "web" && typeof scrollTarget.scrollIntoView === "function") {
        try {
            scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });
            focusFirstInput(scrollTarget);
            return;
        } catch {
            // fall through to measureLayout
        }
    }

    if (container && typeof scrollTarget.measureLayout === "function") {
        try {
            scrollTarget.measureLayout(
                container as never,
                (_x, y) => {
                    container.scrollTo({ y: Math.max(0, y - offsetY), animated: true });
                    focusFirstInput(scrollTarget);
                },
                () => scrollViewsToTop(container),
            );
            return;
        } catch {
            scrollViewsToTop(container);
            return;
        }
    }

    scrollViewsToTop(container);
}

function focusFirstInput(target: ScrollTarget) {
    if (Platform.OS !== "web" || !target) return;

    requestAnimationFrame(() => {
        const node = target as HTMLElement;
        const input = node.querySelector?.("input, textarea") as HTMLElement | null;
        if (input && typeof input.focus === "function") {
            try {
                input.focus({ preventScroll: true });
            } catch {
                input.focus();
            }
        }
    });
}
