import { Alert, Platform } from "react-native";

/** Cross-platform confirm (web uses window.confirm — Alert buttons are unreliable on RN web). */
export function confirmAction(title: string, message: string): Promise<boolean> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "OK", onPress: () => resolve(true) },
        ]);
    });
}

export function confirmDestructive(title: string, message: string): Promise<boolean> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Delete", style: "destructive", onPress: () => resolve(true) },
        ]);
    });
}

export function showMessage(title: string, message: string): void {
    if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`${title}\n\n${message}`);
        return;
    }
    Alert.alert(title, message);
}
