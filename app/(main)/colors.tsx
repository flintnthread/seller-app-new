import React from "react";
import { CatalogAttributeScreen } from "@/components/catalog/CatalogAttributeScreen";
import { COLOR_PAGE_CONFIG } from "@/components/catalog/catalogConfig";

export default function ColorsPage() {
    return <CatalogAttributeScreen config={COLOR_PAGE_CONFIG} initialColors={[]} />;
}
