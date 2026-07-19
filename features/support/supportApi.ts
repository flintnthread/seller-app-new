import { Platform } from "react-native";

import { AUTH_ACTION_FAILED } from "@/lib/api/apiErrors";
import { ensureApiReachable, resolveApiBaseUrl } from "@/lib/api/config";
import {
  ensureAccessToken,
  ensureSellerId,
  hydrateSellerSession,
} from "@/lib/api/sellerSession";
import { tryRefreshSession } from "@/lib/api/sessionRefresh";

const REQUEST_TIMEOUT_MS = 20000;

const UPLOAD_TIMEOUT_MS = 90000;



function requireSellerId(): number {
  const id = ensureSellerId();
  if (!id) {
    throw new Error(AUTH_ACTION_FAILED);
  }
  return id;
}



function getBaseUrl(): string {
  const base = resolveApiBaseUrl().replace(/\/$/, "");
  return `${base}/api/seller/support`;
}



/** Turn relative /uploads/... paths into full URLs for Image components */
export { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";



function getImageFileMeta(localUri: string) {
  const rawName = localUri.split("/").pop()?.split("?")[0] || "photo.jpg";
  const hasExt = /\.(jpe?g|png|webp|gif)$/i.test(rawName);
  const filename = hasExt ? rawName : `${rawName}.jpg`;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";
  return { filename, mime };
}

function buildImageFormFile(localUri: string) {
  const { filename, mime } = getImageFileMeta(localUri);
  return {
    uri: Platform.OS === "ios" ? localUri.replace("file://", "") : localUri,
    name: filename,
    type: mime,
  };
}

/** React Native Web needs File/Blob; mobile needs { uri, name, type } */
async function appendFileToFormData(
  formData: FormData,
  fieldName: string,
  localUri: string
): Promise<void> {
  const { filename, mime } = getImageFileMeta(localUri);
  if (Platform.OS === "web") {
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append(fieldName, new File([blob], filename, { type: mime }));
  } else {
    formData.append(fieldName, buildImageFormFile(localUri) as any);
  }
}



function buildAuthHeaders(
  sellerId: number,
  accessToken: string,
  options: RequestInit
): Record<string, string> {
  const method = String(options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-Seller-Id": String(sellerId),
  };
  const extra = options.headers as Record<string, string> | undefined;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const isReadOnly = method === "GET" || method === "HEAD";
  if (!isFormData && !isReadOnly && !extra?.["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return { ...headers, ...extra };
}

async function fetchPublicGet(path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  await ensureApiReachable().catch(() => {});
  const base = resolveApiBaseUrl().replace(/\/$/, "");
  const bustUrl = path.includes("?") ? `${base}${path}&_=${Date.now()}` : `${base}${path}?_=${Date.now()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(bustUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithTimeout(

  url: string,

  options: RequestInit = {},

  timeoutMs = REQUEST_TIMEOUT_MS

): Promise<Response> {

  await ensureApiReachable();
  await hydrateSellerSession();
  const sellerId = ensureSellerId();
  const accessToken = ensureAccessToken();
  if (!sellerId || !accessToken) {
    throw new Error(AUTH_ACTION_FAILED);
  }

  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), timeoutMs);



  const bustUrl = url.includes("?") ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;

  const makeInit = (token: string): RequestInit => ({
    ...options,
    signal: controller.signal,
    headers: buildAuthHeaders(sellerId, token, options),
  });

  try {

    let res = await fetch(bustUrl, makeInit(accessToken));
    if (res.status === 401) {
      const refreshed = await tryRefreshSession(true);
      const retryToken = ensureAccessToken();
      if (refreshed && retryToken) {
        res = await fetch(bustUrl, makeInit(retryToken));
      }
    }
    return res;

  } catch (err: any) {

    const base = resolveApiBaseUrl();

    if (err?.name === "AbortError") {
      throw new Error(
        `Cannot reach seller API at ${base}. Check https://flintnthread.online or https://flintnthread.in and VPS nginx seller routes.`
      );
    }

    throw new Error(
      err?.message?.includes("Network request failed")
        ? `Cannot reach ${base}. Same Wi-Fi as PC? Backend running?`
        : err?.message || "Network request failed"
    );

  } finally {

    clearTimeout(timer);

  }

}



async function parseError(res: Response, fallback: string): Promise<string> {

  try {

    const data = await res.json();

    return data.message || data.error || fallback;

  } catch {

    return fallback;

  }

}



export interface TicketResponse {

  id: number;

  ticketNumber: string;

  sellerId: number;

  subject: string;

  category: string;

  priority: string;

  status: string;

  assignedTo: number | null;

  lastResponseBy: string;

  lastResponseAt: string;

  closedAt: string | null;

  createdAt: string;

  updatedAt: string;

  messages: MessageResponse[] | null;

}



export interface MessageResponse {

  id: number;

  ticketId: number;

  senderType: string;

  senderId: number;

  message: string;

  attachment?: string | null;

  createdAt: string;

}



export interface CreateTicketPayload {

  subject: string;

  category: string;

  priority: string;

  description?: string;

  attachment?: string;

}



export function getSellerId(): number {

  return requireSellerId();

}



export { getBaseUrl };

/** Lightweight reachability probe (public endpoint, no auth). */
export async function checkServerConnection(): Promise<{ ok: boolean; url: string; error?: string }> {
  const base = resolveApiBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/public/marketplace-stats`;
  try {
    const res = await fetchPublicGet("/api/public/marketplace-stats", 10000);
    const ct = res.headers.get("content-type") ?? "";
    const raw = await res.text();
    const looksHtml = ct.includes("text/html") || raw.trimStart().startsWith("<");
    if (!res.ok || looksHtml) {
      return { ok: false, url, error: `http_${res.status}` };
    }
    return { ok: true, url };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cannot reach server";
    return { ok: false, url, error: message };
  }
}



/** Ticket + image in one multipart request */

export async function createTicketWithImage(

  payload: CreateTicketPayload,

  imageUri: string

): Promise<TicketResponse> {

  await hydrateSellerSession();
  const sellerId = requireSellerId();

  try {
    const formData = new FormData();
    formData.append("sellerId", String(sellerId));
    formData.append("subject", payload.subject);
    formData.append("category", payload.category);
    formData.append("priority", payload.priority);
    if (payload.description?.trim()) {
      formData.append("description", payload.description.trim());
    }
    await appendFileToFormData(formData, "file", imageUri);

    const res = await fetchWithTimeout(
      `${getBaseUrl()}/tickets/with-file`,
      { method: "POST", body: formData },
      UPLOAD_TIMEOUT_MS
    );

    if (!res.ok) {
      throw new Error(await parseError(res, "Failed to create ticket"));
    }

    return res.json();
  } catch (multipartErr) {
    // Fallback: upload file, then create ticket via JSON (more reliable on some web setups)
    try {
      const attachment = await uploadAttachment(imageUri);
      return await createTicket({ ...payload, attachment });
    } catch {
      throw multipartErr instanceof Error
        ? multipartErr
        : new Error("Failed to create ticket with image");
    }
  }
}



export async function uploadAttachment(localUri: string): Promise<string> {

  const formData = new FormData();

  await appendFileToFormData(formData, "file", localUri);

  const res = await fetchWithTimeout(

    `${getBaseUrl()}/upload`,

    { method: "POST", body: formData },

    UPLOAD_TIMEOUT_MS

  );



  if (!res.ok) {

    throw new Error(await parseError(res, "Failed to upload image"));

  }



  const data = await res.json();

  return data.attachment as string;

}



export async function createTicket(payload: CreateTicketPayload): Promise<TicketResponse> {
  await hydrateSellerSession();
  const sellerId = requireSellerId();

  const res = await fetchWithTimeout(`${getBaseUrl()}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sellerId,
      subject: payload.subject,
      category: payload.category,
      priority: payload.priority,
      description: payload.description,
      attachment: payload.attachment,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to create ticket"));
  }

  return res.json();
}



export async function getTickets(status?: string): Promise<TicketResponse[]> {

  await ensureApiReachable();

  const url = status

    ? `${getBaseUrl()}/tickets/seller/${requireSellerId()}/status/${status}`

    : `${getBaseUrl()}/tickets/seller/${requireSellerId()}`;



  const res = await fetchWithTimeout(url);



  if (!res.ok) {

    throw new Error("Failed to fetch tickets");

  }



  return res.json();

}



export async function getTicketById(ticketId: number): Promise<TicketResponse> {

  const res = await fetchWithTimeout(

    `${getBaseUrl()}/tickets/${ticketId}/seller/${requireSellerId()}`

  );



  if (!res.ok) {

    throw new Error("Ticket not found");

  }



  return res.json();

}



export async function getMessages(ticketId: number): Promise<MessageResponse[]> {

  const res = await fetchWithTimeout(`${getBaseUrl()}/messages/ticket/${ticketId}`);



  if (!res.ok) {

    throw new Error("Failed to fetch messages");

  }



  return res.json();

}



export async function sendMessage(

  ticketId: number,

  message: string,

  attachment?: string | null

): Promise<MessageResponse> {

  const res = await fetchWithTimeout(`${getBaseUrl()}/messages`, {

    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({

      ticketId,

      senderType: "seller",

      senderId: requireSellerId(),

      message: message.trim() || "Attachment",

      attachment: attachment ?? null,

    }),

  });



  if (!res.ok) {

    throw new Error(await parseError(res, "Failed to send message"));

  }



  return res.json();

}



/** Reply with image in one multipart request */

export async function sendMessageWithImage(

  ticketId: number,

  imageUri: string,

  message?: string

): Promise<MessageResponse> {

  const formData = new FormData();

  formData.append("ticketId", String(ticketId));

  formData.append("senderType", "seller");

  formData.append("senderId", String(requireSellerId()));

  if (message?.trim()) {

    formData.append("message", message.trim());

  }

  await appendFileToFormData(formData, "file", imageUri);

  const res = await fetchWithTimeout(

    `${getBaseUrl()}/messages/with-file`,

    { method: "POST", body: formData },

    UPLOAD_TIMEOUT_MS

  );



  if (!res.ok) {

    throw new Error(await parseError(res, "Failed to send message with image"));

  }



  return res.json();

}



export async function closeTicket(ticketId: number): Promise<TicketResponse> {

  const res = await fetchWithTimeout(

    `${getBaseUrl()}/tickets/${ticketId}/close?sellerId=${requireSellerId()}`,

    { method: "PATCH" }

  );



  if (!res.ok) {

    throw new Error("Failed to close ticket");

  }



  return res.json();

}

// ── FAQs ──────────────────────────────────────────────────────────────────────

export interface FaqResponse {
  id: number;
  categoryId: number;
  categoryName?: string | null;
  question: string;
  answer: string;
  sortOrder?: number | null;
  isSeller?: boolean | null;
}

export interface FaqCategoryResponse {
  id: number;
  categoryName: string;
  categoryIcon?: string | null;
  sortOrder?: number | null;
  faqs: FaqResponse[];
}

/** sellerOnly=true → only rows where faqs.is_seller = 1 (seller app) */
export async function getFaqs(q?: string, _sellerOnly = true): Promise<FaqResponse[]> {
  const params = new URLSearchParams();
  params.set("sellerOnly", "true");
  if (q?.trim()) params.set("q", q.trim());
  const res = await fetchPublicGet(`/api/seller/support/faqs?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch FAQs");
  }
  return res.json();
}

export async function getGroupedFaqs(_sellerOnly = true): Promise<FaqCategoryResponse[]> {
  const res = await fetchPublicGet("/api/seller/support/faqs/grouped?sellerOnly=true");
  if (!res.ok) {
    throw new Error("Failed to fetch FAQ categories");
  }
  return res.json();
}

/** Seller FAQ rows — API with sellerOnly=true is already filtered; treat missing flag as seller-visible. */
export function isSellerFaq(f: FaqResponse): boolean {
  const raw = f as FaqResponse & { is_seller?: boolean | number | null };
  const v = raw.isSeller ?? raw.is_seller;
  if (v == null) return true;
  return v === true || v === 1;
}

// ── Contact support (chat / email / call) ─────────────────────────────────────

export interface SupportContactConfig {
  chat: { enabled: boolean; subtitle: string; whatsappNumber: string };
  email: { address: string; subtitle: string };
  call: { phone: string; subtitle: string; hours: string };
}

export interface LiveChatMessageResponse {
  id: number;
  sellerId: number;
  senderType: string;
  message: string;
  createdAt: string;
}

const DEFAULT_SUPPORT_CONTACT_CONFIG: SupportContactConfig = {
  chat: { enabled: true, subtitle: "Live Chat · Typically replies in minutes", whatsappNumber: "919063499092" },
  email: { address: "support@flintnthread.in", subtitle: "support@flintnthread.in" },
  call: { phone: "9063499092", subtitle: "Mon–Sun, 9 AM – 6 PM", hours: "Mon–Sun, 9 AM – 6 PM" },
};

export async function getSupportContactConfig(): Promise<SupportContactConfig> {
  try {
    const res = await fetchPublicGet("/api/seller/support/contact");
    if (!res.ok) {
      return DEFAULT_SUPPORT_CONTACT_CONFIG;
    }
    const ct = res.headers.get("content-type") ?? "";
    const raw = await res.text();
    if (ct.includes("text/html") || raw.trimStart().startsWith("<")) {
      return DEFAULT_SUPPORT_CONTACT_CONFIG;
    }
    return JSON.parse(raw) as SupportContactConfig;
  } catch {
    return DEFAULT_SUPPORT_CONTACT_CONFIG;
  }
}

export async function sendSupportEmail(payload: {
  sellerId: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const res = await fetchWithTimeout(`${getBaseUrl()}/contact/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to send email"));
  }
}

export async function getLiveChatHistory(sellerId: number): Promise<LiveChatMessageResponse[]> {
  const res = await fetchWithTimeout(`${getBaseUrl()}/contact/chat/${sellerId}`);
  if (!res.ok) throw new Error("Failed to load chat");
  return res.json();
}

export async function sendLiveChatMessage(
  sellerId: number,
  message: string
): Promise<LiveChatMessageResponse[]> {
  const res = await fetchWithTimeout(`${getBaseUrl()}/contact/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sellerId, message }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to send message"));
  }
  return res.json();
}

// ── Support feedback (Rate your experience) ────────────────────────────────
export async function submitSupportFeedback(payload: {
  rating: number;
  feedbackText?: string;
}): Promise<{ message: string }> {
  const res = await fetchWithTimeout(`${getBaseUrl()}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sellerId: requireSellerId(),
      rating: payload.rating,
      feedbackText: payload.feedbackText?.trim() ?? "",
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to submit feedback"));
  }

  return res.json();
}


