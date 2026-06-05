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
  lastUpdated: string;
  effectiveDate: string;
  platformMeta?: PlatformMetaItem[];
  sections: LegalSection[];
};

type LegalJson = LegalDocument;

const privacyData = privacyJson as LegalJson;
const termsData = termsJson as LegalJson;

export function getSellerLegalDocument(type: string): LegalDocument {
  if (type === "terms") {
    return termsData;
  }
  return privacyData;
}
