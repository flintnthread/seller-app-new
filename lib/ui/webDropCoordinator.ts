type Listener = () => void;

let activeKey: string | null = null;
const listeners = new Set<Listener>();

export function subscribeWebDrop(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getWebDropActiveKey(): string | null {
    return activeKey;
}

export function setWebDropActiveKey(key: string | null): void {
    if (activeKey === key) return;
    activeKey = key;
    listeners.forEach((listener) => listener());
}
