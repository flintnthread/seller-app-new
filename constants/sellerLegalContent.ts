import privacyJson from "@/assets/legal/seller-privacy.json";
import termsJson from "@/assets/legal/seller-terms.json";

export type PlatformMetaItem = {
  label: string;
  value: string;
};

export type LegalSection = {
  title: string;
  body: string;
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  effectiveDate: string;
  platformMeta?: PlatformMetaItem[];
  sections: LegalSection[];
};

type LegalJson = Omit<LegalDocument, "effectiveDate"> & {
  effectiveDate?: string;
  lastUpdated?: string;
};

/**
 * Set to the calendar date (YYYY-MM-DD) when you last revised Terms or Privacy content.
 * The legal screen will show this as the Effective Date.
 */
export const SELLER_LEGAL_REVISION = "2026-06-19";

const privacyData = privacyJson as LegalJson;
const termsData = termsJson as LegalJson;

export function formatLegalEffectiveDate(isoDate: string = SELLER_LEGAL_REVISION): string {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getSellerLegalEffectiveDate(): string {
  return formatLegalEffectiveDate(SELLER_LEGAL_REVISION);
}

function applyEffectiveDate(doc: LegalJson): LegalDocument {
  const effectiveDate = getSellerLegalEffectiveDate();
  const platformMeta = doc.platformMeta?.map((item) =>
    /effective date/i.test(item.label) ? { ...item, value: effectiveDate } : item
  );

  return {
    title: doc.title,
    subtitle: doc.subtitle,
    effectiveDate,
    platformMeta,
    sections: doc.sections,
  };
}

export function getSellerLegalDocument(type: string): LegalDocument {
  if (type === "terms") {
    return applyEffectiveDate(termsData);
  }
  return applyEffectiveDate(privacyData);
}
