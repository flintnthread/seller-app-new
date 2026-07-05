import React from "react";
import { useLocalSearchParams } from "expo-router";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getSellerLegalDocument } from "@/constants/sellerLegalContent";

export default function LegalDocumentScreen() {
  const { type, returnTo } = useLocalSearchParams<{ type?: string; returnTo?: string }>();
  const document = getSellerLegalDocument(type === "terms" ? "terms" : "privacy");
  const backRoute = typeof returnTo === "string" && returnTo.trim() ? returnTo.trim() : undefined;
  return <LegalDocumentView document={document} returnTo={backRoute} />;
}
