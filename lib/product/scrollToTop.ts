import { Platform } from "react-native";
import type { ScrollView } from "react-native";

export function scrollViewsToTop(scrollRef?: ScrollView | null) {
    const run = () => {
        scrollRef?.scrollTo({ y: 0, animated: false });

        if (Platform.OS === "web" && typeof window !== "undefined") {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(run);
    });
}
