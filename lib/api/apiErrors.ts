/** Neutral copy — never prompt forced re-login from API/auth failures. */
export const AUTH_ACTION_FAILED =
    "Unable to complete this action right now. Please try again.";

export function isAuthErrorStatus(status?: number): boolean {
    return status === 401 || status === 403;
}

export function sanitizeAuthErrorMessage(message: string, status?: number): string {
    const lower = message.toLowerCase();
    if (
        isAuthErrorStatus(status) ||
        lower.includes("session expired") ||
        lower.includes("log in again") ||
        lower.includes("login again") ||
        lower.includes("not logged in") ||
        lower.includes("invalid or expired session") ||
        lower.includes("seller session header")
    ) {
        return AUTH_ACTION_FAILED;
    }
    return message;
}

export function authErrorFromStatus(status?: number, fallback = AUTH_ACTION_FAILED): string {
    return isAuthErrorStatus(status) ? AUTH_ACTION_FAILED : fallback;
}
