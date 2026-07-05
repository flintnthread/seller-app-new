import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
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
    getRegistrationPaymentStatus,
    resolveDocumentDisplayUrl,
    updateAddressProfile,
    type AddressProfilePayload,
    type RegistrationPaymentStatusResponse,
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

    tealHeader: "#0D9488",

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



function maskAadhaar(value?: string | null): string {

    if (!value?.trim()) return "—";

    const digits = value.replace(/\D/g, "");

    if (digits.length <= 4) return `****${digits}`;

    return `****${digits.slice(-4)}`;

}

type DocumentViewItem = {
    label: string;
    keys: string[];
    b2bOnly?: boolean;
    useLiveSelfieUrl?: boolean;
};

const DOCUMENT_VIEW_ITEMS: DocumentViewItem[] = [
    { label: "Aadhaar Card (Front)", keys: ["aadharFront"] },
    { label: "Aadhaar Card (Back)", keys: ["aadharBack"] },
    { label: "PAN Card", keys: ["panCard"] },
    { label: "Business Proof", keys: ["businessProof"] },
    { label: "Bank Account Proof", keys: ["bankProof", "bankAccountProof"] },
    { label: "Cancelled Cheque", keys: ["cancelledCheque"] },
    { label: "Live Selfie", keys: ["liveSelfie"], useLiveSelfieUrl: true },
    { label: "Company PAN Document", keys: ["companyPanDocument"], b2bOnly: true },
    { label: "Certificate of Incorporation", keys: ["certificateOfIncorporation"], b2bOnly: true },
    { label: "Partnership Deed", keys: ["partnershipDeed"], b2bOnly: true },
    { label: "MSME / Udyam Certificate", keys: ["msmeUdyamCertificate"], b2bOnly: true },
    { label: "Import Export Code (IEC)", keys: ["iecCertificate"], b2bOnly: true },
];

function inferDocumentFileType(url: string): "image" | "pdf" {
    const lower = url.toLowerCase();
    if (lower.includes(".pdf") || lower.includes("application/pdf")) return "pdf";
    return "image";
}

function resolveDocUrl(
    files: Record<string, string>,
    keys: string[],
    liveSelfieUrl?: string | null,
    useLiveSelfieUrl?: boolean,
): string | null {
    if (useLiveSelfieUrl && liveSelfieUrl) return liveSelfieUrl;
    for (const key of keys) {
        const url = files[key];
        if (url) return url;
    }
    return null;
}

function DocPreview({ label, url, compact }: { label: string; url: string | null | undefined; compact?: boolean }) {
    const resolved = url ? resolveDocumentDisplayUrl(url) : null;
    const fileType = resolved ? inferDocumentFileType(resolved) : null;
    const mediaStyle = compact ? styles.docImageCompact : styles.docImage;
    const placeholderStyle = compact ? styles.docPlaceholderCompact : styles.docPlaceholder;

    const openDocument = () => {
        if (!resolved) return;
        Linking.openURL(resolved).catch(() => undefined);
    };

    return (
        <View style={[styles.docBlock, compact && styles.docBlockCompact]}>
            <Text style={styles.infoLabel}>{label}</Text>
            {resolved ? (
                <TouchableOpacity activeOpacity={0.85} onPress={openDocument} disabled={Platform.OS !== "web"}>
                    {fileType === "pdf" ? (
                        <View style={placeholderStyle}>
                            <Ionicons name="document-text-outline" size={30} color={C.tealHeader} />
                            <Text style={styles.docPdfText}>PDF uploaded</Text>
                            {Platform.OS === "web" ? (
                                <Text style={styles.docOpenHint}>Click to open</Text>
                            ) : null}
                        </View>
                    ) : (
                        <Image
                            source={{ uri: resolved }}
                            style={mediaStyle}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={150}
                        />
                    )}
                </TouchableOpacity>
            ) : (
                <View style={placeholderStyle}>
                    <Ionicons name="image-outline" size={28} color={C.textSecondary} />
                    <Text style={styles.docPlaceholderText}>Not uploaded</Text>
                </View>
            )}
        </View>
    );
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
    const [paymentInfo, setPaymentInfo] = useState<RegistrationPaymentStatusResponse | null>(null);
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

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const payment = await getRegistrationPaymentStatus();
                if (active) setPaymentInfo(payment);
            } catch {
                if (active) setPaymentInfo(null);
            }
        })();
        return () => {
            active = false;
        };
    }, [profile?.sellerId]);

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
    const isB2B = (profile.business?.businessCategory ?? "").toUpperCase() === "B2B";
    const visibleDocumentItems = DOCUMENT_VIEW_ITEMS.filter(
        (item) => !item.b2bOnly || isB2B || resolveDocUrl(docs, item.keys, profile.documents?.liveSelfieUrl, item.useLiveSelfieUrl),
    );
    const registrationPaid = paymentInfo?.subscriptionActive ?? paymentInfo?.paid ?? false;
    const registrationTotal =
        paymentInfo?.totalAmount ??
        (paymentInfo?.amount && paymentInfo.amount > 0 ? paymentInfo.amount / 100 : null);



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

        </SectionCard>

    );

    const documentsCard = (
        <SectionCard headerColor={C.tealHeader} title="Seller Documents" cardStyle={isDesktop ? styles.desktopFullCard : undefined}>
            <InfoGrid
                left={{
                    label: "REGISTRATION PAYMENT",
                    value: registrationPaid ? "Paid" : "Pending",
                }}
                right={{
                    label: "DOCUMENTS STEP",
                    value: profile.steps?.documents ? "Completed" : "Incomplete",
                }}
            />
            {registrationPaid && registrationTotal != null ? (
                <InfoRow label="AMOUNT PAID" value={`₹${registrationTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
            ) : null}
            {paymentInfo?.paidAt ? (
                <InfoRow label="PAID ON" value={new Date(paymentInfo.paidAt).toLocaleDateString("en-IN")} />
            ) : null}
            {isB2B && profile.business?.companyPan ? (
                <InfoRow label="COMPANY PAN" value={profile.business.companyPan} />
            ) : null}

            <View style={styles.divider} />
            <Text style={styles.subheading}>Uploaded Documents</Text>

            <View style={isDesktop ? styles.docGridDesktop : styles.docGridMobile}>
                {visibleDocumentItems.map((item) => (
                    <View
                        key={item.label}
                        style={[
                            isDesktop ? styles.docGridItem : undefined,
                            item.useLiveSelfieUrl && styles.docGridItemCompact,
                        ]}
                    >
                        <DocPreview
                            label={item.label.toUpperCase()}
                            url={resolveDocUrl(docs, item.keys, profile.documents?.liveSelfieUrl, item.useLiveSelfieUrl)}
                            compact={item.useLiveSelfieUrl}
                        />
                    </View>
                ))}
            </View>
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

                {documentsCard}

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

            {documentsCard}

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

    docBlockCompact: { alignSelf: "flex-start", maxWidth: 132 },

    docImage: { width: "100%", height: 140, borderRadius: 10, backgroundColor: C.offWhite },

    docImageCompact: { width: 132, height: 168, borderRadius: 10, backgroundColor: C.offWhite },

    docPlaceholder: {
        width: "100%",
        height: 140,
        borderRadius: 10,
        backgroundColor: C.offWhite,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },

    docPlaceholderCompact: {
        width: 132,
        height: 168,
        borderRadius: 10,
        backgroundColor: C.offWhite,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },

    docPlaceholderText: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },

    docPdfText: { fontSize: 13, color: C.textPrimary, fontWeight: "600" },

    docOpenHint: { fontSize: 11, color: C.tealHeader, fontWeight: "500" },

    docGridDesktop: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginTop: 4,
    },

    docGridMobile: {
        gap: 4,
        marginTop: 4,
    },

    docGridItem: {
        width: "31%",
        minWidth: 220,
        flexGrow: 1,
    },

    docGridItemCompact: {
        width: "auto",
        minWidth: 0,
        flexGrow: 0,
    },

});

