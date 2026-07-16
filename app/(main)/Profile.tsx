import React, { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";

import { Image } from "expo-image";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { AppHeader } from "@/components/common/AppHeader";
import { AppText } from "@/components/AppText";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { clearSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { getProfileMenuRoute } from "@/lib/profile/profileMenuRoutes";
import { resolveProfilePicUrl } from "@/lib/profile/resolveProfilePicUrl";
import { formatSellerUniqueIdDisplay } from "@/lib/profile/sellerDisplayFormat";
import {
  fetchSellerProfile,
  getApiErrorMessage,
  uploadProfilePhoto,
  type SellerProfileResponse,
} from "@/services/sellerProfileApi";
import { fetchDashboard } from "@/services/dashboardApi";
import { fetchPayoutSummary } from "@/services/payoutApi";

import * as ImagePicker from "expo-image-picker";

import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons
} from "@expo/vector-icons";
import { Modal, Text } from "react-native";

function ProfileAvatar({
  uri,
  size,
  style,
  iconSize,
}: {
  uri: string | null;
  size: number;
  style?: object;
  iconSize: number;
}) {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name="account" size={iconSize} color="#9CA3AF" />
    </View>
  );
}

function formatMobileDisplay(mobile: string): string {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return mobile || "—";
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

let VideoElement: any;
let CanvasElement: any;
if (Platform.OS === 'web') {
  // @ts-ignore
  VideoElement = React.forwardRef((props, ref) => React.createElement('video', { ...props, ref }));
  // @ts-ignore
  CanvasElement = React.forwardRef((props, ref) => React.createElement('canvas', { ...props, ref }));
}

function WebCameraModal({ visible, onClose, onCapture }: { visible: boolean, onClose: () => void, onCapture: (uri: string) => void }) {
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch(err => {
          console.error(err);
          Alert.alert("Camera error", "Could not access camera.");
          onClose();
        });
    } else {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [visible]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(dataUri);
        onClose();
      }
    }
  };

  if (!visible || Platform.OS !== 'web') return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 640, height: 480, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' }}>
          <VideoElement ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay playsInline />
          <CanvasElement ref={canvasRef} style={{ display: 'none' }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 24 }}>
          <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#4B5563', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontFamily: fontFamilies.medium }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={capture} style={{ backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontFamily: fontFamilies.bold }}>Capture Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function SellerProfileScreen() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [sellerId, setSellerIdDisplay] = useState("");
  const [sellerUniqueId, setSellerUniqueId] = useState("");
  const [approvalState, setApprovalState] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [profileCompleted, setProfileCompletedLocal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [webCameraVisible, setWebCameraVisible] = useState(false);
  const [profileStats, setProfileStats] = useState({
    totalOrders: "—",
    totalEarnings: "—",
    productsListed: "—",
    avgRating: "—",
  });
  const router = useRouter();
  const { showSuccess, showError, confirmAction, SweetAlertHost } = useSweetAlert();
  const { setIsProfileCompleted } = useProfileStatus();

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const isWeb = Platform.OS === "web";

  const applyProfile = useCallback(
    (profile: SellerProfileResponse) => {
      const name =
        profile.fullName?.trim() ||
        [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
      setFullName(name);
      setMobile(profile.mobile?.replace(/\D/g, "").slice(-10) || "");
      setEmail(profile.email || "");
      setSellerIdDisplay(String(profile.sellerId));
      setSellerUniqueId(profile.sellerUniqueId?.trim() || "");
      setApprovalState(profile.accountStatus?.approvalState ?? null);
      setBusinessName(profile.business?.businessName?.trim() || "");
      setProfileCompletedLocal(profile.profileCompleted);
      setIsProfileCompleted(profile.profileCompleted);
      setProfileImage(resolveProfilePicUrl(profile));
    },
    [setIsProfileCompleted]
  );

  useEffect(() => {
    let active = true;
    Promise.all([fetchDashboard(), fetchPayoutSummary()])
      .then(([dashboard, payout]) => {
        if (!active) return;
        setProfileStats({
          totalOrders: String(dashboard.overview?.orders ?? 0),
          totalEarnings: `₹${Math.round(payout.lifetimeEarnings ?? 0).toLocaleString("en-IN")}`,
          productsListed: String(dashboard.totalProducts ?? 0),
          avgRating: dashboard.overview?.rating ? `${dashboard.overview.rating} ★` : "—",
        });
      })
      .catch(() => {
        if (active) {
          setProfileStats({
            totalOrders: "—",
            totalEarnings: "—",
            productsListed: "—",
            avgRating: "—",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await hydrateSellerSession();
        const profile = await fetchSellerProfile(true);
        if (active) applyProfile(profile);
      } catch (e) {
        if (active) {
          showError(getApiErrorMessage(e, "Could not load your profile."));
        }
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyProfile, showError]);

  const displayName = fullName || businessName || "Seller";
  const displayMobile = formatMobileDisplay(mobile);
  const displaySellerId = formatSellerUniqueIdDisplay(sellerUniqueId, sellerId);
  const canViewProfile = profileCompleted && approvalState === "approved";

  useEffect(() => {
    if (Platform.OS !== "web" || loadingProfile) return;
    if (
      profileCompleted &&
      (approvalState === "pending_review" || approvalState === "rejected")
    ) {
      router.replace("/viewsellerprofile");
    }
  }, [loadingProfile, profileCompleted, approvalState, router]);

  const uploadPickedImage = async (localUri: string) => {
    setProfileImage(localUri);
    setUploadingPhoto(true);
    try {
      await hydrateSellerSession();
      const updated = await uploadProfilePhoto(localUri);
      applyProfile(updated);
      showSuccess("Profile photo updated.");
    } catch (e) {
      showError(getApiErrorMessage(e, "Could not upload profile photo."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSelectCamera = async () => {
    if (Platform.OS === 'web') {
      setModalVisible(false);
      setWebCameraVisible(true);
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Camera permission is required to take photos.");
        setModalVisible(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      setModalVisible(false);
      if (!result.canceled && result.assets?.[0]?.uri) {
        await uploadPickedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image. Please try again.");
      setModalVisible(false);
    }
  };

  const handleSelectGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Gallery permission is required to select photos.");
        setModalVisible(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      setModalVisible(false);
      if (!result.canceled && result.assets?.[0]?.uri) {
        await uploadPickedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image. Please try again.");
      setModalVisible(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmAction(
      "Confirm Logout",
      "Are you sure you want to sign out from your seller account?",
      "Logout"
    );
    if (!confirmed) return;

    await clearSellerId();
    setIsProfileCompleted(false);
    showSuccess("You have been signed out successfully.", "Logged Out");
    setTimeout(() => {
      router.replace("/(auth)/login");
    }, 1500);
  };

  const openViewProfile = () => router.push("/viewsellerprofile");
  const openCompleteProfile = () => router.push("/(main)/sellerpersonalinfo");

  const navigateMenuItem = (title: string) => {
    setSelectedItem(title);
    const route = getProfileMenuRoute(title);
    if (!route) {
      Alert.alert("Unavailable", `The screen "${title}" is not available yet.`);
      return;
    }
    try {
      router.push(route);
    } catch (e) {
      Alert.alert("Navigation error", e instanceof Error ? e.message : "Could not open this screen.");
    }
  };

  // ─── DESKTOP LAYOUT ───────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.root}>
        {/* Top Nav Bar */}
        {/* <View style={desktopStyles.topNav}>
          <AppText style={desktopStyles.topNavBrand}>🛒 SellerHub</AppText>
          <View style={desktopStyles.topNavRight}>
            <AppText style={desktopStyles.topNavItem}>Dashboard</AppText>
            <AppText style={desktopStyles.topNavItem}>Products</AppText>
            <AppText style={desktopStyles.topNavItem}>Orders</AppText>
            <TouchableOpacity style={desktopStyles.topNavLogout}>
              <AntDesign name="logout" size={16} color="#FF6B35" />
              <AppText style={desktopStyles.topNavLogoutText}>Logout</AppText>
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Page Body */}
        <View style={desktopStyles.body}>

          {/* LEFT SIDEBAR */}
          <View style={desktopStyles.sidebar}>
            {/* Profile Card */}
            <View style={desktopStyles.sidebarProfileCard}>
              <View style={desktopStyles.sidebarAvatarWrap}>
                <TouchableOpacity onPress={() => setModalVisible(true)} disabled={uploadingPhoto}>
                  <ProfileAvatar
                    uri={profileImage}
                    size={80}
                    style={desktopStyles.sidebarAvatar}
                    iconSize={40}
                  />
                  {uploadingPhoto && (
                    <View style={desktopStyles.avatarLoadingOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  <View style={desktopStyles.sidebarCameraOverlay}>
                    <Feather name="camera" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
              <AppText style={desktopStyles.sidebarName}>
                {loadingProfile ? "Loading…" : displayName}
              </AppText>
              {/* <View style={desktopStyles.sidebarBadge}>
                <Ionicons name="star" size={13} color="#c28b00" />
                <AppText style={desktopStyles.sidebarBadgeText}>Gold Seller</AppText>
              </View> */}
              <View style={desktopStyles.sidebarInfoBlock}>
                <View style={desktopStyles.sidebarInfoRow}>
                  <Feather name="phone" size={13} color="#888" />
                  <AppText style={desktopStyles.sidebarInfoText}>{displayMobile}</AppText>
                </View>
                <View style={desktopStyles.sidebarInfoRow}>
                  <MaterialIcons name="credit-card" size={13} color="#888" />
                  <AppText style={desktopStyles.sidebarInfoText}>{displaySellerId}</AppText>
                </View>
                <View style={desktopStyles.sidebarInfoRow}>
                  <MaterialIcons name="email" size={13} color="#888" />
                  <AppText style={desktopStyles.sidebarInfoText}>{email || "—"}</AppText>
                </View>
              </View>
              {!loadingProfile && !profileCompleted && (
                <TouchableOpacity
                  style={desktopStyles.sidebarCompleteBtn}
                  onPress={openCompleteProfile}
                >
                  <AppText style={desktopStyles.sidebarCompleteBtnText}>Complete profile</AppText>
                </TouchableOpacity>
              )}
              {canViewProfile ? (
                <TouchableOpacity
                  style={desktopStyles.sidebarEditBtn}
                  onPress={openViewProfile}
                >
                  <Ionicons name="create-outline" size={16} color="#FF6B35" />
                  <AppText style={desktopStyles.sidebarEditBtnText}>View Profile</AppText>
                </TouchableOpacity>
              ) : null}
            </View>

          {/* Sidebar Nav */}
        <View style={desktopStyles.sidebarNav}>
          {/* Seller Hub Heading */}
  <View style={modalStyles.desktopSellerHubHeader}>
    <AppText style={modalStyles.desktopSellerHubTitle}>
      Seller Hub
    </AppText>

    <View style={modalStyles.desktopSellerHubUnderline} />
  </View>
              {[
                { icon: 'shopping-bag', color: '#ff4d79', label: 'My Store' },
                { icon: 'box', color: '#4caf50', label: 'Products' },
                { icon: 'shopping-cart', color: '#2196f3', label: 'Orders' },
                { icon: 'bar-chart-2', color: '#4caf50', label: 'Earnings' },
                { icon: 'credit-card', color: '#9c27b0', label: 'Payouts' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    desktopStyles.sidebarNavItem,
                    selectedItem === item.label && desktopStyles.sidebarNavItemActive,
                  ]}
                  onPress={() => navigateMenuItem(item.label)}
                >
                  <Feather name={item.icon as any} size={18} color={selectedItem === item.label ? '#FF6B35' : item.color} />
                  <AppText style={[
                    desktopStyles.sidebarNavLabel,
                    selectedItem === item.label && desktopStyles.sidebarNavLabelActive,
                  ]}>{item.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
            {/* Desktop Logout Button */}
   <TouchableOpacity style={desktopStyles.desktopLogoutBtn} onPress={() => void handleLogout()}>
  <AntDesign name="logout" size={18} color="#FF6B35" />
  <AppText style={desktopStyles.desktopLogoutText}>
    Logout
  </AppText>
   </TouchableOpacity>
          </View>

          {/* MAIN CONTENT */}
          <ScrollView style={desktopStyles.mainScroll} showsVerticalScrollIndicator={false}>
            <View style={desktopStyles.main}>

              {/* Stats Row */}
              <View style={desktopStyles.statsRow}>
                {[
                  { label: 'Total Orders', value: profileStats.totalOrders, icon: 'shopping-cart', color: '#2196f3', bg: '#E3F2FD' },
                  { label: 'Total Earnings', value: profileStats.totalEarnings, icon: 'dollar-sign', color: '#4caf50', bg: '#E8F5E9' },
                  { label: 'Products Listed', value: profileStats.productsListed, icon: 'box', color: '#9c27b0', bg: '#F3E5F5' },
                  { label: 'Avg. Rating', value: profileStats.avgRating, icon: 'star', color: '#f5a623', bg: '#FFF8E1' },
                ].map((stat) => (
                  <View key={stat.label} style={desktopStyles.statCard}>
                    <View style={[desktopStyles.statIconBox, { backgroundColor: stat.bg }]}>
                      <Feather name={stat.icon as any} size={22} color={stat.color} />
                    </View>
                    <AppText style={desktopStyles.statValue}>{stat.value}</AppText>
                    <AppText style={desktopStyles.statLabel}>{stat.label}</AppText>
                  </View>
                ))}
              </View>

              {/* Two-column grid for sections */}
              <View style={desktopStyles.gridRow}>

                {/* Store Management */}
                <View style={desktopStyles.desktopCard}>
                  <DesktopSectionHeader title="Store Management" icon="grid" />
                  {[
                    { icon: 'grid', color: '#2196f3', title: 'Store Dashboard' },
                    { icon: 'box', color: '#4caf50', title: 'Manage Products' },
                    { icon: 'shopping-cart', color: '#2196f3', title: 'Orders Management' },
                    { icon: 'bar-chart-2', color: '#9c27b0', title: 'Store Analytics' },
                  ].map((item) => (
                    <DesktopListItem
                      key={item.title}
                      icon={item.icon}
                      color={item.color}
                      title={item.title}
                      selectedItem={selectedItem}
                      setSelectedItem={navigateMenuItem}
                    />
                  ))}
                </View>

                {/* Earnings & Finance */}
                <View style={desktopStyles.desktopCard}>
                  <DesktopSectionHeader title="Earnings & Finance" icon="dollar-sign" />
                  {[
                    { icon: 'dollar-sign', color: '#4caf50', title: 'Earnings Overview' },
                    { icon: 'credit-card', color: '#9c27b0', title: 'Payouts & Withdrawals' },
                    { icon: 'file-text', color: '#f5a623', title: 'Transactions History' },
                  ].map((item) => (
                    <DesktopListItem
                      key={item.title}
                      icon={item.icon}
                      color={item.color}
                      title={item.title}
                      selectedItem={selectedItem}
                      setSelectedItem={navigateMenuItem}
                    />
                  ))}
                </View>

                {/* Growth & Marketing */}
                 {/* <View style={desktopStyles.desktopCard}>
                  <DesktopSectionHeader title="Growth & Marketing" icon="trending-up" />
                  {[
                    { icon: 'tag', color: '#ff4d79', title: 'Promotions & Discounts' },
                    { icon: 'speaker', color: '#2196f3', title: 'Seller Advertising' },
                    { icon: 'trending-up', color: '#f5a623', title: 'Boost Products' },
                    { icon: 'star', color: '#4caf50', title: 'Customer Reviews' },
                  ].map((item) => (
                    <DesktopListItem
                      key={item.title}
                      icon={item.icon}
                      color={item.color}
                      title={item.title}
                      selectedItem={selectedItem}
                      setSelectedItem={navigateMenuItem}
                    />
                  ))}
                </View>  */}

                {/* Support & Help */}
                <View style={desktopStyles.desktopCard}>
                  <DesktopSectionHeader title="Support & Help" icon="headphones" />
                  {[
                    { icon: 'headphones', color: '#9c27b0', title: 'Help & Support' },
                    { icon: 'file-text', color: '#2196f3', title: 'Privacy & Policy' },
                  ].map((item) => (
                    <DesktopListItem
                      key={item.title}
                      icon={item.icon}
                      color={item.color}
                      title={item.title}
                      selectedItem={selectedItem}
                      setSelectedItem={navigateMenuItem}
                    />
                  ))}
                </View>

              </View>

              {/* <View style={{ height: 40 }} /> */}
            </View>
          </ScrollView>
        </View>      
<Modal
  visible={modalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setModalVisible(false)}
>
  <View style={modalStyles.overlay}>
    <View
      style={[
        modalStyles.modalContainer,
        Platform.OS === 'web' && modalStyles.desktopModalContainer,
      ]}
    >

      <TouchableOpacity
        style={modalStyles.closeBtn}
        onPress={() => setModalVisible(false)}
      >
        <Ionicons name="close" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={modalStyles.title}>Update Profile Photo</Text>

      <TouchableOpacity
        style={modalStyles.optionBtn}
        onPress={handleSelectCamera}
      >
        <Feather name="camera" size={20} color="#FF6B35" />
        <Text style={modalStyles.optionText}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={modalStyles.optionBtn}
        onPress={handleSelectGallery}
      >
        <Feather name="image" size={20} color="#FF6B35" />
        <Text style={modalStyles.optionText}>Choose From Gallery</Text>
      </TouchableOpacity>

      </View>
    </View>
</Modal>
        <WebCameraModal
          visible={webCameraVisible}
          onClose={() => setWebCameraVisible(false)}
          onCapture={async (uri) => {
            await uploadPickedImage(uri);
          }}
        />
        <SweetAlertHost />

      </View>
    );
  }

  // ─── ORIGINAL MOBILE LAYOUT (untouched) ───────────────────────────────────
  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>

      {!isWeb && <AppHeader title="My Seller Profile" showBackButton />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isWeb && styles.scrollContentWeb}
      >

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.imageContainer}>
              <TouchableOpacity onPress={() => setModalVisible(true)} disabled={uploadingPhoto}>
                <ProfileAvatar
                  uri={profileImage}
                  size={90}
                  style={styles.profileImage}
                  iconSize={44}
                />
                {uploadingPhoto && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  <Feather name="camera" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <AppText style={styles.name}>{loadingProfile ? "Loading…" : displayName}</AppText>
                {/* <View style={styles.badge}>
                  <Ionicons name="star" size={16} color="#c28b00" />
                  <AppText style={styles.badgeText}>Gold Seller</AppText>
                </View> */}
              </View>

              <View style={styles.infoRow}>
                <Feather name="phone" size={16} color="#666" />
                <AppText style={styles.infoText}>{displayMobile}</AppText>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="credit-card" size={16} color="#666" />
                <AppText style={styles.infoText}>Seller ID: {displaySellerId}</AppText>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="email" size={16} color="#666" />
                <AppText style={styles.infoText}>{email || "—"}</AppText>
              </View>
            </View>
          </View>

          {!loadingProfile && !profileCompleted && (
            <TouchableOpacity style={styles.completeProfileBtn} onPress={openCompleteProfile}>
              <AppText style={styles.completeProfileBtnText}>Complete your seller profile</AppText>
            </TouchableOpacity>
          )}

          {canViewProfile ? (
            <TouchableOpacity style={styles.editBtn} onPress={openViewProfile}>
              <View style={styles.editBtnHighlight}>
                <Ionicons name="create-outline" size={20} color="#FF6B35" />
                <AppText style={styles.editBtnText}>View Seller Profile</AppText>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* TOP MENU */}
        <View style={styles.card}>
          <View>
            <AppText style={styles.sellerHubTitle}>Seller Hub</AppText>
            <View style={styles.sellerHubUnderline} />
          </View>
          <ListItem icon="shopping-bag" color="#ff4d79" title="My Store" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="box" color="#4caf50" title="Products" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="shopping-cart" color="#2196f3" title="Orders" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="bar-chart-2" color="#4caf50" title="Earnings" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="credit-card" color="#9c27b0" title="Payouts" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
        </View>

        {/* STORE MANAGEMENT */}
        <SectionTitle title="Store Management" />
        <View style={styles.card}>
          <ListItem icon="grid" color="#2196f3" title="Store Dashboard" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="box" color="#4caf50" title="Manage Products" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="shopping-cart" color="#2196f3" title="Orders Management" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="bar-chart-2" color="#9c27b0" title="Store Analytics" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
        </View>

        {/* EARNINGS */}
        <SectionTitle title="Earnings & Finance" />
        <View style={styles.card}>
          <ListItem icon="dollar-sign" color="#4caf50" title="Earnings Overview" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="credit-card" color="#9c27b0" title="Payouts & Withdrawals" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="file-text" color="#f5a623" title="Transactions History" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
        </View>

        {/* GROWTH */}
        {/* <SectionTitle title="Growth & Marketing" />
        <View style={styles.card}>
          <ListItem icon="tag" color="#ff4d79" title="Promotions & Discounts" selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
          <ListItem icon="speaker" color="#2196f3" title="Seller Advertising" selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
          <ListItem icon="trending-up" color="#f5a623" title="Boost Products" selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
          <ListItem icon="star" color="#4caf50" title="Customer Reviews" selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
        </View> */}

        {/* SUPPORT */}
        <SectionTitle title="Support & Help" />
        <View style={styles.card}>
          <ListItem icon="headphones" color="#9c27b0" title="Help & Support" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
          <ListItem icon="file-text" color="#2196f3" title="Privacy & Support" selectedItem={selectedItem} setSelectedItem={navigateMenuItem} />
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => void handleLogout()}>
          <AntDesign name="logout" size={20} color="#FF6B35" />
          <AppText style={styles.logoutText}>Logout</AppText>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM TAB */}
      {Platform.OS !== 'web' && (
        <View style={styles.bottomTab}>
          {[
            { icon: "home-outline", iconActive: "home", label: "Home", active: false, color: "#2563EB", colorMuted: "#60A5FA", route: "/(main)/dashboard" },
            { icon: "shopping-outline", iconActive: "shopping", label: "Products", active: false, color: "#7C3AED", colorMuted: "#A78BFA", route: "/(main)/productmanagement" },
            { icon: "clipboard-list-outline", iconActive: "clipboard-list", label: "Orders", active: false, color: "#EA6000", colorMuted: "#FB923C", route: "/(main)/Ordersscreen", badge: 12 },
            { icon: "account-outline", iconActive: "account", label: "Profile", active: true, color: "#10B981", colorMuted: "#34D399", route: "/(main)/Profile" },
          ].map((tab, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.bottomItem} 
              activeOpacity={0.7} 
              onPress={() => {
                if (!tab.active) router.push(tab.route as any);
              }}
            >
              <View style={{ position: "relative" }}>
                <MaterialCommunityIcons 
                  name={(tab.active ? tab.iconActive : tab.icon) as any} 
                  size={24} 
                  color={tab.active ? tab.color : tab.colorMuted} 
                />
                {tab.badge && (
                  <View style={{
                    position: "absolute",
                    top: -4,
                    right: -9,
                    backgroundColor: "#EA6000",
                    minWidth: 17,
                    height: 17,
                    borderRadius: 8.5,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 3,
                  }}>
                    <Text style={{
                      fontSize: 10,
                      color: "#fff",
                      fontWeight: "bold",
                      lineHeight: 12,
                    }}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.bottomText, { color: tab.active ? tab.color : tab.colorMuted }, tab.active && { fontWeight: "600" }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* <ProfileImageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectCamera={handleSelectCamera}
        onSelectGallery={handleSelectGallery}
      /> */}

      <Modal
  visible={modalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setModalVisible(false)}
>
  <View style={modalStyles.overlay}>
    <View style={modalStyles.modalContainer}>

      <TouchableOpacity
        style={modalStyles.closeBtn}
        onPress={() => setModalVisible(false)}
      >
        <Ionicons name="close" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={modalStyles.title}>
        Update Profile Photo
      </Text>

      <TouchableOpacity
        style={modalStyles.optionBtn}
        onPress={handleSelectCamera}
      >
        <Feather name="camera" size={20} color="#FF6B35" />
        <Text style={modalStyles.optionText}>
          Take Photo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={modalStyles.optionBtn}
        onPress={handleSelectGallery}
      >
        <Feather name="image" size={20} color="#FF6B35" />
        <Text style={modalStyles.optionText}>
          Choose From Gallery
        </Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>
      <WebCameraModal
        visible={webCameraVisible}
        onClose={() => setWebCameraVisible(false)}
        onCapture={async (uri) => {
          await uploadPickedImage(uri);
        }}
      />
      <SweetAlertHost />
    </View>
  );
}


// ─── DESKTOP-ONLY HELPER COMPONENTS ────────────────────────────────────────

const DesktopSectionHeader = ({ title, icon }: { title: string; icon: any }) => (
  <View style={desktopStyles.cardSectionHeader}>
    <View style={desktopStyles.cardSectionIconBox}>
      <Feather name={icon} size={16} color="#FF6B35" />
    </View>
    <AppText style={desktopStyles.cardSectionTitle}>{title}</AppText>
  </View>
);

const DesktopListItem = ({
  icon, color, title, selectedItem, setSelectedItem,
}: {
  icon: any; color: string; title: string;
  selectedItem: string | null; setSelectedItem: (t: string) => void;
}) => (
  <TouchableOpacity
    style={[
      desktopStyles.desktopListItem,
      selectedItem === title && desktopStyles.desktopListItemActive,
    ]}
    onPress={() => setSelectedItem(title)}
  >
    <View style={desktopStyles.desktopListLeft}>
      <Feather name={icon} size={16} color={selectedItem === title ? '#FF6B35' : color} />
      <AppText style={[
        desktopStyles.desktopListTitle,
        selectedItem === title && desktopStyles.desktopListTitleActive,
      ]}>{title}</AppText>
    </View>
    <Ionicons name="chevron-forward" size={16} color={selectedItem === title ? '#FF6B35' : '#bbb'} />
  </TouchableOpacity>
);


// ─── ORIGINAL MOBILE-ONLY HELPER COMPONENTS (untouched) ────────────────────

const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionTitleContainer}>
    <AppText style={styles.sectionTitle}>{title}</AppText>
    <View style={styles.sectionUnderline}>
      <View style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
        height: 6, backgroundColor: '#F97316', borderRadius: 4,
      }} />
    </View>
  </View>
);

const ListItem = ({
  icon, color, title, badge, onPress, selectedItem, setSelectedItem,
}: {
  icon: any; color: string; title: string; badge?: string | number;
  onPress?: () => void; selectedItem: string | null; setSelectedItem: (item: string) => void;
}) => (
  <TouchableOpacity
    style={[styles.listItem, selectedItem === title && styles.selectedListItem]}
    onPress={() => { setSelectedItem(title); if (onPress) onPress(); }}
  >
    <View style={styles.listLeft}>
      <Feather name={icon} size={20} color={color} />
      {badge && (
        <View style={styles.itemBadge}>
          <AppText style={styles.itemBadgeText}>{badge}</AppText>
        </View>
      )}
      <AppText style={styles.listTitle}>{title}</AppText>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#999" />
  </TouchableOpacity>
);

const BottomItem = ({ icon, label, active }: { icon: any; label: string; active?: boolean }) => (
  <View style={styles.bottomItem}>
    <Feather name={icon} size={22} color={active ? "#1E3A8A" : "#555"} />
    <AppText style={[styles.bottomText, active && { color: "#1E3A8A" }]}>{label}</AppText>
  </View>
);


// ─── DESKTOP STYLES ─────────────────────────────────────────────────────────

const desktopStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F0F2F7',
    minHeight: '100%' as any,
  },

  // Top Nav
  topNav: {
    height: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EBF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  topNavBrand: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: '#1D3B6F',
    letterSpacing: 0.5,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  topNavItem: {
    fontSize: 14,
    color: '#444',
    fontFamily: fontFamilies.medium,
  },
  topNavLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  topNavLogoutText: {
    color: '#FF6B35',
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
  },

  // Body layout
  //  body: {
  //   flex: 1,
  //    flexDirection: 'row',
  //   max Width: 1280,
  //    width: '100%' ,
  // height: '100%',
  //    alignSelf: 'center',
  //    paddingHorizontal: 24,
  //    paddingTop: 28,
  //   paddingBottom: 32,
  //   gap: 24,
  //  },
   body: {
   flex: 1,
  flexDirection: 'row',
  width: '100%',
  height: '100%',
  gap: 24,
   paddingTop: 0,
  marginTop: 0,
 },

  // Sidebar
  sidebar: {
    width: 260,
    flexShrink: 0,
    gap: 16,
  },
  sidebarProfileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#1D3B6F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sidebarAvatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  sidebarAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  sidebarCameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sidebarName: {
    fontSize: 17,
    fontFamily: fontFamilies.bold,
    color: '#1D3B6F',
    marginBottom: 6,
    textAlign: 'center',
  },
  sidebarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
    gap: 4,
  },
  sidebarBadgeText: {
    color: '#c28b00',
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
  },
  sidebarInfoBlock: {
    width: '100%' as any,
    gap: 8,
    marginBottom: 16,
  },
  sidebarInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sidebarInfoText: {
    fontSize: 12,
    color: '#666',
    fontFamily: fontFamilies.medium,
    flexShrink: 1,
  },
  sidebarEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    width: '100%' as any,
    justifyContent: 'center',
  },
  sidebarEditBtnText: {
    color: '#FF6B35',
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },
  sidebarCompleteBtn: {
    marginBottom: 10,
    width: '100%' as any,
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  sidebarCompleteBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sidebar Nav
  sidebarNav: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#1D3B6F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarNavItemActive: {
    borderLeftColor: '#FF6B35',
    backgroundColor: '#FFF5F0',
  },
  sidebarNavLabel: {
    fontSize: 14,
    color: '#444',
    fontFamily: fontFamilies.medium,
  },
  sidebarNavLabelActive: {
    color: '#FF6B35',
    fontFamily: fontFamilies.bold,
  },

  // Main scroll area
  mainScroll: {
    flex: 1,
  },
  main: {
    flex: 1,
    gap: 24,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'flex-start',
    shadowColor: '#1D3B6F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: '#1D3B6F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    fontFamily: fontFamilies.medium,
  },

  // 2-column grid
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  desktopCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1D3B6F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    minWidth: 320,
    flexBasis: '47%' as any,
    flexGrow: 1,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F8',
  },
  cardSectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF0EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#1D3B6F',
  },

  // Desktop list items
  desktopListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FC',
  },
  desktopListItemActive: {
    backgroundColor: '#FFF5F0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  desktopListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopListTitle: {
    fontSize: 14,
    color: '#333',
    fontFamily: fontFamilies.medium,
  },
  desktopListTitleActive: {
    color: '#FF6B35',
    fontFamily: fontFamilies.bold,
  },

  desktopLogoutBtn: {
  marginTop: 18,
  backgroundColor: '#FFF3ED',
  borderWidth: 1,
  //borderColor: '#FFE0D2',
  borderRadius: 14,
  height: 52,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  shadowColor: '#FF6B35',
   borderColor: '#FF6B35', // orange outline
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
},

desktopLogoutText: {
  color: '#FF6B35',
  fontSize: 15,
  fontFamily: fontFamilies.bold,
},
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modalContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
  },

  desktopModalContainer: {
    width: 350,
    maxWidth: 350,
  },

  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D3B6F',
    marginBottom: 24,
    textAlign: 'center',
  },

  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFF5F0',
    marginBottom: 14,
    gap: 12,
  },

  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  desktopSellerHubHeader: {
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 18,
  paddingBottom: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#F3F4F8',
},

desktopSellerHubTitle: {
  fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: "#1D3B6F",
    marginBottom: 8,
    marginTop: 15,
    textAlign: "center",
    alignSelf: "center",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
},

desktopSellerHubUnderline: {
  width: 70,
  height: 5,
  backgroundColor: '#F97316',
  borderRadius: 4,
  marginTop: 6,
  shadowColor: '#F97316',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
},

});



// ─── ORIGINAL MOBILE STYLES (untouched) ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    paddingTop: 0,
  },
  containerWeb: {
    backgroundColor: "#F7F8FC",
  },
  scrollContentWeb: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    borderRadius: 15,
    padding: 12,
  },
  profileTop: {
    flexDirection: "row",
  },
  imageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFE5DB',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileCameraIcon: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#FF6B35',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginRight: 10,
  },
  badge: {
    flexDirection: "row",
    backgroundColor: "#fff3dd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#c28b00",
    marginLeft: 5,
    fontFamily: fontFamilies.semiBold,
  },
  badgeBox: {
    borderWidth: 1,
    borderColor: "#c28b00",
    borderRadius: 4,
    padding: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    color: "#555",
  },
  editBtn: {
    backgroundColor: "#FFE5D9",
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  editBtnText: {
    color: "#FF6B35",
    fontFamily: fontFamilies.bold,
    marginLeft: 8,
  },
  editBtnHighlight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  completeProfileBtn: {
    marginTop: 14,
    backgroundColor: "#FF6B35",
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
  },
  completeProfileBtnText: {
    color: "#fff",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
  menuItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sellerHubTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: "#1D3B6F",
    marginBottom: 8,
    marginTop: 15,
    textAlign: "center",
    alignSelf: "center",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sellerHubUnderline: {
    width: 80,
    height: 6,
    backgroundColor: "#F97316",
    borderRadius: 4,
    alignSelf: 'center',
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
    fontFamily: fontFamilies.medium,
    color: "#000",
  },
  iconBox: {
    borderWidth: 2,
    borderColor: "#FFD700",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FFFACD",
  },
  selectedMenuItem: {
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderRadius: 8,
    backgroundColor: "#FFF5F0",
  },
  menuLabel: {
    marginTop: 8,
    fontSize: 13,
  },
  smallBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#ff2d55",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  smallBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: fontFamilies.bold,
  },
  sectionTitleContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    marginBottom: 4,
    color: "#1D3B6F",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sectionUnderline: {
    width: 80,
    height: 2,
    backgroundColor: "#F97316",
    borderRadius: 4,
    alignSelf: 'center',
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  storeManagementCard: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedListItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
    backgroundColor: "#FFF5F0",
  },
  listLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  listTitle: {
    marginLeft: 15,
    fontSize: 16,
  },
  itemBadge: {
    backgroundColor: "#ff2d55",
    borderRadius: 10,
    marginLeft: -5,
    marginTop: -15,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  itemBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: fontFamilies.bold,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: "#FF6B35",
    marginHorizontal: 15,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  logoutText: {
    color: "#FF6B35",
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    marginLeft: 10,
  },
  bottomTab: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: Platform.OS === "ios" ? 84 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  bottomItem: {
    alignItems: "center",
  },
  bottomText: {
    fontSize: 12,
    marginTop: 5,
    color: "#555",
  },
  menuItem: { alignItems: 'center', width: '25%' },
  card: { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 12, paddingVertical: 8, elevation: 2 },
  orderBadge: {
    position: "absolute",
    top: -3,
    right: 0,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: { width: 24 },
  orderBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: fontFamilies.bold,
  },
});