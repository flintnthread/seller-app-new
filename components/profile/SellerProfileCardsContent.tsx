import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import {
    resolveDocumentDisplayUrl,
    updateAddressProfile,
    type AddressProfilePayload,
    type SellerProfileResponse,
} from "@/services/sellerProfileApi";
import { resolveProfilePicUrl } from "@/lib/profile/resolveProfilePicUrl";
import { formatSellerUniqueIdDisplay } from "@/lib/profile/sellerDisplayFormat";



const C = {

    orangeHeader: "#F4A44A",

    brownHeader: "#8B4513",

    greenHeader: "#4CAF50",

    navyHeader: "#2C3E50",

    purpleHeader: "#7B2FBE",

    white: "#FFFFFF",

    border: "#E2E8F0",

    textPrimary: "#2D3748",

    textSecondary: "#718096",

    offWhite: "#F8F9FA",

};



type SectionCardProps = {

    headerColor: string;

    title: string;

    children: React.ReactNode;

    cardStyle?: StyleProp<ViewStyle>;

    onEdit?: () => void;

    headerActions?: React.ReactNode;

};



function SectionCard({ headerColor, title, children, cardStyle, onEdit, headerActions }: SectionCardProps) {

    return (

        <View style={[styles.card, cardStyle]}>

            <View style={[styles.cardHeader, { backgroundColor: headerColor }]}>

                <Text style={styles.cardHeaderText}>{title}</Text>

                {headerActions ?? (onEdit ? (

                    <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.75}>

                        <Ionicons name="pencil" size={14} color={C.white} />

                        <Text style={styles.editBtnText}>Edit</Text>

                    </TouchableOpacity>

                ) : null)}

            </View>

            <View style={styles.cardBody}>{children}</View>

        </View>

    );

}



function InfoRow({ label, value }: { label: string; value: string }) {

    return (

        <View style={styles.infoRow}>

            <Text style={styles.infoLabel}>{label}</Text>

            <Text style={styles.infoValue}>{value || "—"}</Text>

        </View>

    );

}



function InfoGrid({ left, right }: { left: { label: string; value: string }; right?: { label: string; value: string } }) {

    return (

        <View style={styles.infoGrid}>

            <View style={styles.infoGridCell}>

                <Text style={styles.infoLabel}>{left.label}</Text>

                <Text style={styles.infoValue}>{left.value || "—"}</Text>

            </View>

            {right ? (

                <View style={styles.infoGridCell}>

                    <Text style={styles.infoLabel}>{right.label}</Text>

                    <Text style={styles.infoValue}>{right.value || "—"}</Text>

                </View>

            ) : null}

        </View>

    );

}



function DocImage({ label, url }: { label: string; url: string | null | undefined }) {

    const resolved = url ? resolveDocumentDisplayUrl(url) : null;

    if (!resolved) return null;

    return (

        <View style={styles.docBlock}>

            <Text style={styles.infoLabel}>{label}</Text>

            <Image

                source={{ uri: resolved }}

                style={styles.docImage}

                contentFit="cover"

                cachePolicy="memory-disk"

                transition={150}

            />

        </View>

    );

}



function maskAadhaar(value?: string | null): string {

    if (!value?.trim()) return "—";

    const digits = value.replace(/\D/g, "");

    if (digits.length <= 4) return `****${digits}`;

    return `****${digits.slice(-4)}`;

}



function EditField({ label, value, onChangeText, multiline }: { label: string; value: string; onChangeText: (v: string) => void; multiline?: boolean }) {
    return (
        <View style={styles.editField}>
            <Text style={styles.infoLabel}>{label}</Text>
            <TextInput
                style={[styles.editInput, multiline && styles.editInputMultiline]}
                value={value}
                onChangeText={onChangeText}
                placeholder={`Enter ${label.toLowerCase()}`}
                placeholderTextColor={C.textSecondary}
                multiline={multiline}
                textAlignVertical={multiline ? "top" : "center"}
            />
        </View>
    );
}



type Props = {
    profile: SellerProfileResponse | null;
    loading?: boolean;
    isDesktop?: boolean;
    readOnly?: boolean;
    onProfileUpdated?: (profile: SellerProfileResponse) => void;
};

export function SellerProfileCardsContent({ profile, loading, isDesktop = false, readOnly = false, onProfileUpdated }: Props) {
    const picUrl = resolveProfilePicUrl(profile);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [isSavingAddress, setIsSavingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState({
        streetAddress: "",
        landmark: "",
        city: "",
        state: "",
        area: "",
        country: "",
        pincode: "",
    });

    const startAddressEdit = () => {
        if (!profile) return;
        setAddressForm({
            streetAddress: profile.address?.streetAddress?.trim() || "",
            landmark: profile.address?.landmark?.trim() || "",
            city: profile.address?.city?.trim() || "",
            state: profile.address?.state?.trim() || "",
            area: profile.address?.area?.trim() || "",
            country: profile.address?.country?.trim() || "",
            pincode: profile.address?.pincode?.trim() || "",
        });
        setIsEditingAddress(true);
    };

    const cancelAddressEdit = () => {
        setIsEditingAddress(false);
    };

    const saveAddressEdit = async () => {
        if (!profile) return;
        const payload: AddressProfilePayload = {
            streetAddress: addressForm.streetAddress.trim(),
            landmark: addressForm.landmark.trim(),
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            area: addressForm.area.trim(),
            country: addressForm.country.trim(),
            pincode: addressForm.pincode.trim(),
            warehouseDifferent: profile.address?.warehouseDifferent ?? false,
            warehouseAddress: profile.address?.warehouseAddress?.trim() || undefined,
            warehouseLandmark: profile.address?.warehouseLandmark?.trim() || undefined,
            warehouseCity: profile.address?.warehouseCity?.trim() || undefined,
            warehouseState: profile.address?.warehouseState?.trim() || undefined,
            warehouseArea: profile.address?.warehouseArea?.trim() || undefined,
            warehouseCountry: profile.address?.warehouseCountry?.trim() || undefined,
            warehousePincode: profile.address?.warehousePincode?.trim() || undefined,
        };

        if (!payload.streetAddress || !payload.city || !payload.state || !payload.pincode || !payload.country) {
            Alert.alert("Required fields", "Please fill address, city, state, pincode, and country.");
            return;
        }

        setIsSavingAddress(true);
        try {
            const updated = await updateAddressProfile(payload);
            onProfileUpdated?.(updated);
            setIsEditingAddress(false);
            Alert.alert("Saved", "Address updated successfully.");
        } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed to update address.");
        } finally {
            setIsSavingAddress(false);
        }
    };



    useEffect(() => {

        if (!profile) return;

        const urls = [

            resolveProfilePicUrl(profile),

            ...Object.values(profile.documents?.files ?? {})

                .filter(Boolean)

                .map((u) => resolveDocumentDisplayUrl(u)),

            profile.documents?.liveSelfieUrl

                ? resolveDocumentDisplayUrl(profile.documents.liveSelfieUrl)

                : null,

        ].filter(Boolean) as string[];

        urls.forEach((uri) => {

            Image.prefetch(uri).catch(() => undefined);

        });

    }, [profile]);

    if (loading && !profile) {

        return (

            <View style={styles.loadingBox}>

                <ActivityIndicator size="large" color={C.orangeHeader} />

                <Text style={styles.loadingText}>Loading profile from server…</Text>

            </View>

        );

    }



    if (!profile) {

        return (

            <View style={styles.loadingBox}>

                <Text style={styles.loadingText}>Could not load seller profile.</Text>

            </View>

        );

    }



    const statusTitle = profile.accountStatus?.title ?? profile.profileCompleted ? "Active" : "Pending";

    const docs = profile.documents?.files ?? {};



    const personalCard = (
        <SectionCard headerColor={C.orangeHeader} title="Personal Information" cardStyle={isDesktop ? styles.desktopCard : undefined}>
            <View style={styles.profilePicRow}>
                {picUrl ? (
                    <Image source={{ uri: picUrl }} style={styles.profilePic} contentFit="cover" cachePolicy="memory-disk" transition={150} />
                ) : (
                    <View style={styles.profilePicPlaceholder}>
                        <Text style={styles.profilePicPlaceholderText}>No photo</Text>
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>FULL NAME</Text>
                    <Text style={styles.infoValueLarge}>{profile.fullName || "—"}</Text>
                </View>
            </View>

            <InfoGrid

                left={{ label: "FIRST NAME", value: profile.firstName || "—" }}

                right={{ label: "LAST NAME", value: profile.lastName || "—" }}

            />

            <InfoGrid

                left={{ label: "MOBILE", value: profile.mobile || "—" }}

                right={{ label: "EMAIL", value: profile.email || "—" }}

            />

            <InfoRow label="STATUS" value={statusTitle} />

            <InfoRow label="SELLER ID" value={formatSellerUniqueIdDisplay(profile.sellerUniqueId, profile.sellerId)} />

        </SectionCard>

    );



    const businessCard = (
        <SectionCard headerColor={C.brownHeader} title="Business Information" cardStyle={isDesktop ? styles.desktopCard : undefined}>

            <InfoRow label="BUSINESS NAME" value={profile.business?.businessName || "—"} />

            <InfoRow label="BUSINESS ADDRESS" value={profile.business?.address || profile.address?.streetAddress || "—"} />

            <InfoGrid

                left={{ label: "BUSINESS TYPE", value: profile.business?.businessType || "—" }}

                right={{ label: "CATEGORY", value: profile.business?.businessCategory || "—" }}

            />

            <InfoGrid

                left={{ label: "GST NUMBER", value: profile.business?.hasGst ? profile.business?.gstNumber || "—" : "Not registered" }}

                right={{ label: "PAN NUMBER", value: profile.business?.panNumber || "—" }}

            />

            <InfoRow label="AADHAAR NUMBER" value={maskAadhaar(profile.business?.aadhaarNumber)} />

            <InfoRow label="COMPANY PAN" value={profile.business?.companyPan || "—"} />

            {isDesktop ? (
                <View style={{ flexDirection: "row", gap: 16 }}>
                    <View style={{ flex: 1 }}><DocImage label="BUSINESS PROOF" url={docs.businessProof} /></View>
                    <View style={{ flex: 1 }}><DocImage label="PAN CARD" url={docs.panCard} /></View>
                </View>
            ) : (
                <>
                    <DocImage label="BUSINESS PROOF" url={docs.businessProof} />
                    <DocImage label="PAN CARD" url={docs.panCard} />
                </>
            )}

        </SectionCard>

    );



    const addressCard = (

        <SectionCard

            headerColor={C.navyHeader}

            title="Address Information"

            cardStyle={isDesktop ? styles.desktopCard : undefined}

            onEdit={!readOnly && !isEditingAddress ? startAddressEdit : undefined}

            headerActions={isEditingAddress ? (
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelAddressEdit} disabled={isSavingAddress}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveAddressEdit} disabled={isSavingAddress}>
                        {isSavingAddress ? (
                            <ActivityIndicator size="small" color={C.white} />
                        ) : (
                            <Text style={styles.saveBtnText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>
            ) : undefined}

        >

            {isEditingAddress ? (
                <>
                    <EditField label="ADDRESS" value={addressForm.streetAddress} onChangeText={(v) => setAddressForm((f) => ({ ...f, streetAddress: v }))} multiline />
                    <View style={styles.infoGrid}>
                        <View style={styles.infoGridCell}>
                            <EditField label="CITY" value={addressForm.city} onChangeText={(v) => setAddressForm((f) => ({ ...f, city: v }))} />
                        </View>
                        <View style={styles.infoGridCell}>
                            <EditField label="STATE" value={addressForm.state} onChangeText={(v) => setAddressForm((f) => ({ ...f, state: v }))} />
                        </View>
                    </View>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoGridCell}>
                            <EditField label="PINCODE" value={addressForm.pincode} onChangeText={(v) => setAddressForm((f) => ({ ...f, pincode: v }))} />
                        </View>
                        <View style={styles.infoGridCell}>
                            <EditField label="COUNTRY" value={addressForm.country} onChangeText={(v) => setAddressForm((f) => ({ ...f, country: v }))} />
                        </View>
                    </View>
                    <EditField label="LANDMARK" value={addressForm.landmark} onChangeText={(v) => setAddressForm((f) => ({ ...f, landmark: v }))} />
                    <EditField label="AREA" value={addressForm.area} onChangeText={(v) => setAddressForm((f) => ({ ...f, area: v }))} />
                </>
            ) : (
                <>
            <InfoRow label="ADDRESS" value={profile.address?.streetAddress || "—"} />

            <InfoGrid

                left={{ label: "CITY", value: profile.address?.city || "—" }}

                right={{ label: "STATE", value: profile.address?.state || "—" }}

            />

            <InfoGrid

                left={{ label: "PINCODE", value: profile.address?.pincode || "—" }}

                right={{ label: "COUNTRY", value: profile.address?.country || "—" }}

            />

            <InfoRow label="LANDMARK" value={profile.address?.landmark || "—"} />
                </>
            )}

            {!isEditingAddress && profile.address?.warehouseDifferent ? (

                <>

                    <View style={styles.divider} />

                    <Text style={styles.subheading}>Warehouse Address</Text>

                    <InfoRow label="WAREHOUSE ADDRESS" value={profile.address?.warehouseAddress || "—"} />

                    <InfoGrid

                        left={{ label: "WAREHOUSE CITY", value: profile.address?.warehouseCity || "—" }}

                        right={{ label: "WAREHOUSE STATE", value: profile.address?.warehouseState || "—" }}

                    />

                    <InfoGrid

                        left={{ label: "WAREHOUSE PINCODE", value: profile.address?.warehousePincode || "—" }}

                        right={{ label: "WAREHOUSE COUNTRY", value: profile.address?.warehouseCountry || "—" }}

                    />

                </>

            ) : null}

        </SectionCard>

    );



    const bankCard = (
        <SectionCard headerColor={C.greenHeader} title="Bank Information" cardStyle={isDesktop ? styles.desktopCard : undefined}>

            <InfoRow label="BANK NAME" value={profile.banking?.bankName || "—"} />

            <InfoGrid

                left={{ label: "ACCOUNT NUMBER", value: profile.banking?.accountNumberPresent ? "••••••••" : "—" }}

                right={{ label: "IFSC CODE", value: profile.banking?.ifscCode || "—" }}

            />

            <InfoRow label="BRANCH" value={profile.banking?.branchName || "—"} />

            <InfoRow label="ACCOUNT HOLDER NAME" value={profile.banking?.accountHolderName || "—"} />

            <DocImage label="BANK PROOF" url={docs.bankProof || docs.cancelledCheque} />

        </SectionCard>

    );



    const kycCard = (

        <SectionCard headerColor={C.purpleHeader} title="KYC & Verification Status" cardStyle={isDesktop ? styles.desktopFullCard : undefined}>

            <InfoGrid

                left={{ label: "PROFILE COMPLETED", value: profile.profileCompleted ? "Yes" : "No" }}

                right={{ label: "KYC COMPLETED", value: profile.kycCompleted ? "Yes" : "No" }}

            />

            <InfoRow label="ACCOUNT STATUS" value={profile.accountStatus?.title || "—"} />

            <InfoRow label="KYC MESSAGE" value={profile.accountStatus?.message || "—"} />

            {isDesktop ? (
                <View style={{ flexDirection: "row", gap: 16 }}>
                    <View style={{ flex: 1 }}><DocImage label="AADHAAR FRONT" url={docs.aadharFront} /></View>
                    <View style={{ flex: 1 }}><DocImage label="AADHAAR BACK" url={docs.aadharBack} /></View>
                    <View style={{ flex: 1 }}><DocImage label="LIVE SELFIE" url={profile.documents?.liveSelfieUrl || docs.liveSelfie} /></View>
                </View>
            ) : (
                <>
                    <DocImage label="AADHAAR FRONT" url={docs.aadharFront} />
                    <DocImage label="AADHAAR BACK" url={docs.aadharBack} />
                    <DocImage label="LIVE SELFIE" url={profile.documents?.liveSelfieUrl || docs.liveSelfie} />
                </>
            )}

        </SectionCard>

    );



    if (isDesktop) {

        return (

            <View style={styles.desktopContent}>

                <View style={styles.desktopRow}>

                    {personalCard}

                    {businessCard}

                </View>

                <View style={styles.desktopRow}>

                    {addressCard}

                    {bankCard}

                </View>

                {kycCard}

            </View>

        );

    }



    return (

        <View style={styles.mobileContent}>

            {personalCard}

            {businessCard}

            {addressCard}

            {bankCard}

            {kycCard}

        </View>

    );

}



const styles = StyleSheet.create({

    loadingBox: { padding: 32, alignItems: "center", gap: 12 },

    loadingText: { color: C.textSecondary, fontSize: 14 },

    mobileContent: { padding: 16, gap: 14, paddingBottom: 32 },

    desktopContent: { gap: 20, paddingBottom: 32 },

    desktopRow: { flexDirection: "row", gap: 20, alignItems: "stretch" },

    desktopCard: { flex: 1, minWidth: 320 },

    desktopFullCard: { width: "100%" },

    card: {

        backgroundColor: C.white,

        borderRadius: 12,

        overflow: "hidden",

        borderWidth: 1,

        borderColor: C.border,

    },

    cardHeader: {

        flexDirection: "row",

        alignItems: "center",

        justifyContent: "space-between",

        paddingHorizontal: 16,

        paddingVertical: 12,

    },

    cardHeaderText: { color: C.white, fontSize: 15, fontWeight: "700", flex: 1 },

    editBtn: {

        flexDirection: "row",

        alignItems: "center",

        gap: 4,

        backgroundColor: "rgba(255,255,255,0.2)",

        borderRadius: 8,

        paddingHorizontal: 10,

        paddingVertical: 5,

    },

    editBtnText: { color: C.white, fontSize: 12, fontWeight: "600" },

    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },

    cancelBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.15)",
    },

    cancelBtnText: { color: C.white, fontSize: 12, fontWeight: "600" },

    saveBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.95)",
        minWidth: 52,
        alignItems: "center",
    },

    saveBtnText: { color: C.navyHeader, fontSize: 12, fontWeight: "700" },

    editField: { gap: 4, marginBottom: 8 },

    editInput: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: C.textPrimary,
        backgroundColor: C.offWhite,
    },

    editInputMultiline: { minHeight: 72, textAlignVertical: "top" },

    cardBody: { padding: 16, gap: 10 },

    infoRow: { gap: 4, marginBottom: 4 },

    infoLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "600", letterSpacing: 0.4 },

    infoValue: { fontSize: 14, color: C.textPrimary, fontWeight: "500" },

    infoValueLarge: { fontSize: 16, color: C.textPrimary, fontWeight: "700" },

    infoGrid: { flexDirection: "row", gap: 12 },

    infoGridCell: { flex: 1, gap: 4 },

    profilePicRow: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 8 },

    profilePicWrap: { position: "relative" },

    profilePic: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.offWhite },

    profilePicPlaceholder: {

        width: 72,

        height: 72,

        borderRadius: 36,

        backgroundColor: C.offWhite,

        alignItems: "center",

        justifyContent: "center",

        borderWidth: 1,

        borderColor: C.border,

    },

    profilePicPlaceholderText: { fontSize: 11, color: C.textSecondary },

    profilePicEditBadge: {

        position: "absolute",

        right: -2,

        bottom: -2,

        width: 26,

        height: 26,

        borderRadius: 13,

        backgroundColor: C.orangeHeader,

        alignItems: "center",

        justifyContent: "center",

        borderWidth: 2,

        borderColor: C.white,

    },

    divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },

    subheading: { fontSize: 13, fontWeight: "700", color: C.textPrimary, marginBottom: 4 },

    docBlock: { gap: 6, marginTop: 6 },

    docImage: { width: "100%", height: 140, borderRadius: 10, backgroundColor: C.offWhite },

});

