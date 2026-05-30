import { Platform } from "react-native";

import { resolveApiBaseUrl } from "@/lib/api/config";
import { ensureSellerId } from "@/lib/api/sellerSession";

const REQUEST_TIMEOUT_MS = 20000;

const UPLOAD_TIMEOUT_MS = 90000;



function requireSellerId(): number {
  const id = ensureSellerId();
  if (!id) {
    throw new Error("Seller not logged in. Please log in again.");
  }
  return id;
}



function getBaseUrl(): string {
  const base = resolveApiBaseUrl().replace(/\/$/, "");
  return `${base}/api/seller/support`;
}



/** Turn relative /uploads/... paths into full URLs for Image components */

export function resolveMediaUrl(url: string | null | undefined): string | null {

  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {

    return url;

  }

  const base = resolveApiBaseUrl().replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;

}



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



async function fetchWithTimeout(

  url: string,

  options: RequestInit = {},

  timeoutMs = REQUEST_TIMEOUT_MS

): Promise<Response> {

  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), timeoutMs);



  const bustUrl = url.includes("?") ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;

  try {

    return await fetch(bustUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(options.headers as Record<string, string>),
      },
    });

  } catch (err: any) {

    const base = resolveApiBaseUrl();

    if (err?.name === "AbortError") {
      throw new Error(
        `Cannot reach server at ${base}. Start the backend (mvn spring-boot:run), ensure MySQL is running, and allow port 8080 in Windows Firewall.`
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

/** Call on Help screen load to verify phone can reach the backend */
export async function checkServerConnection(): Promise<{ ok: boolean; url: string; error?: string }> {
  const url = `${getBaseUrl()}/tickets/seller/${requireSellerId()}`;
  try {
    const res = await fetchWithTimeout(url, {}, 8000);
    return { ok: res.ok, url };
  } catch (err: any) {
    return { ok: false, url, error: err?.message || "Cannot reach server" };
  }
}



/** Ticket + image in one multipart request */

export async function createTicketWithImage(

  payload: CreateTicketPayload,

  imageUri: string

): Promise<TicketResponse> {

  const formData = new FormData();

  formData.append("sellerId", String(requireSellerId()));

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

  const res = await fetchWithTimeout(`${getBaseUrl()}/tickets`, {

    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({

      sellerId: requireSellerId(),

      ...payload,

    }),

  });



  if (!res.ok) {

    throw new Error(await parseError(res, "Failed to create ticket"));

  }



  return res.json();

}



export async function getTickets(status?: string): Promise<TicketResponse[]> {

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
  const res = await fetchWithTimeout(`${getBaseUrl()}/faqs?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch FAQs");
  }
  return res.json();
}

export async function getGroupedFaqs(_sellerOnly = true): Promise<FaqCategoryResponse[]> {
  const res = await fetchWithTimeout(`${getBaseUrl()}/faqs/grouped?sellerOnly=true`);
  if (!res.ok) {
    throw new Error("Failed to fetch FAQ categories");
  }
  return res.json();
}

/** Only FAQs marked for sellers in DB */
export function isSellerFaq(f: FaqResponse): boolean {
  const raw = f as FaqResponse & { is_seller?: boolean | number | null };
  const v = raw.isSeller ?? raw.is_seller;
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

export async function getSupportContactConfig(): Promise<SupportContactConfig> {
  const res = await fetchWithTimeout(`${getBaseUrl()}/contact`);
  if (!res.ok) throw new Error("Failed to load contact options");
  return res.json();
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


