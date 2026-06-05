import React from "react";
import { useLocalSearchParams } from "expo-router";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getSellerLegalDocument } from "@/constants/sellerLegalContent";

export default function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const document = getSellerLegalDocument(type === "terms" ? "terms" : "privacy");
  return <LegalDocumentView document={document} />;
}
