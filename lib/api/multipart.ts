import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./config";
import { sanitizeAuthErrorMessage } from "./apiErrors";
import { ApiError } from "./client";
import { ensureAccessToken, ensureSellerId } from "./sellerSession";
import { tryRefreshSession } from "./sessionRefresh";

export type UploadFilePart = {
    uri: string;
    name: string;
    type: string;
};

export function guessMimeType(uri: string, fileName?: string): string {
    const source = (fileName ?? uri).toLowerCase();
    if (source.endsWith(".pdf")) return "application/pdf";
    if (source.endsWith(".png")) return "image/png";
    if (source.endsWith(".webp")) return "image/webp";
    if (source.startsWith("data:image/png")) return "image/png";
    if (source.startsWith("data:application/pdf")) return "application/pdf";
    return "image/jpeg";
}

export function guessFileName(uri: string, fallback = "upload.jpg"): string {
    if (uri.startsWith("data:")) {
        const mime = guessMimeType(uri);
        if (mime === "application/pdf") return "upload.pdf";
        if (mime === "image/png") return "upload.png";
        return "upload.jpg";
    }
    const segment = uri.split("/").pop()?.split("?")[0];
    if (segment && segment.includes(".")) return segment;
    return fallback;
}

/** Build a React Native / web compatible file part from a local or remote URI. */
export async function buildUploadPart(
    uri: string,
    options?: { name?: string; type?: string }
): Promise<UploadFilePart & { blob?: Blob }> {
    const name = options?.name ?? guessFileName(uri);
    const type = options?.type ?? guessMimeType(uri, name);

    if (
        Platform.OS === "web" &&
        (uri.startsWith("data:") || uri.startsWith("http") || uri.startsWith("blob:") || uri.startsWith("file:"))
    ) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return { uri, name, type: blob.type || type, blob };
    }

    return { uri, name, type };
}

export function appendFileToFormData(formData: FormData, fieldName: string, part: UploadFilePart & { blob?: Blob }) {
    if (Platform.OS === "web" && part.blob) {
        formData.append(fieldName, part.blob, part.name);
        return;
    }
    formData.append(fieldName, {
        uri: part.uri,
        name: part.name,
        type: part.type,
    } as unknown as Blob);
}

export async function apiUpload<T>(
    path: string,
    formData: FormData,
    query?: Record<string, string>
): Promise<T> {
    const sellerId = ensureSellerId();
    const accessToken = ensureAccessToken();
    if (!sellerId || !accessToken) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }

    const baseUrl = resolveApiBaseUrl();
    const qs =
        query && Object.keys(query).length > 0
            ? "?" + new URLSearchParams(query).toString()
            : "";
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}${qs}`;

    const uploadOnce = async (token: string) =>
        fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                "X-Seller-Id": String(sellerId),
            },
            body: formData,
        });

    let res: Response;
    try {
        res = await uploadOnce(accessToken);
        if (res.status === 401) {
            const refreshed = await tryRefreshSession(true);
            const retryToken = ensureAccessToken();
            if (refreshed && retryToken) {
                res = await uploadOnce(retryToken);
            }
        }
    } catch {
        throw new ApiError(`Cannot reach API at ${baseUrl}. Ensure the backend is running.`);
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }

    if (!res.ok) {
        const message =
            body && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
                ? (body as { message: string }).message
                : `Upload failed (${res.status})`;
        throw new ApiError(sanitizeAuthErrorMessage(message, res.status), res.status);
    }

    return body as T;
}
