import React from "react";
import { CatalogAttributeScreen } from "@/components/catalog/CatalogAttributeScreen";
import { SIZE_PAGE_CONFIG } from "@/components/catalog/catalogConfig";

export default function SizesPage() {
    return <CatalogAttributeScreen config={SIZE_PAGE_CONFIG} initialSizes={[]} />;
}
