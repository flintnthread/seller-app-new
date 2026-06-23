import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProductFormScreen } from "./Addnewproduct";

export default function EditProduct() {
    const router = useRouter();
    const { id: productId } = useLocalSearchParams<{ id?: string }>();

    useEffect(() => {
        if (!productId) {
            router.replace("/(main)/productmanagement");
        }
    }, [productId, router]);

    if (!productId) {
        return null;
    }

    return <ProductFormScreen editProductId={String(productId)} />;
}
