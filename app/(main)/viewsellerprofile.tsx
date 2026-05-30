/**
 * SellerProfileScreen.jsx
 * - All emoji icons replaced with Bootstrap Icons (via @expo/vector-icons or web font)
 * - Desktop: card pairs (Personal+Business) and (Address+Bank) are equal height
 * - Mobile layout: UNCHANGED
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { AppHeader } from '@/components/common/AppHeader';

// ─── Bootstrap Icons via web font (desktop/web) ───────────────────────────────
// On native, falls back to a simple text character via BI component below.
// Inject the Bootstrap Icons stylesheet once on web.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.getElementById('bi-font')) {
    const link = document.createElement('link');
    link.id   = 'bi-font';
    link.rel  = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
    document.head.appendChild(link);
  }
}

/**
 * BI — Bootstrap Icon component
 * On web  : renders <i class="bi bi-{name}"> via a Text with dangerouslySetInnerHTML trick
 * On native: renders a fallback Text symbol
 */
const NATIVE_FALLBACKS = {
  'person-circle'        : '👤',
  'building'             : '🏢',
  'geo-alt'              : '📍',
  'bank'                 : '🏦',
  'shield-check'         : '🛡',
  'house-door'           : '🏠',
  'box-seam'             : '📦',
  'receipt'              : '📋',
  'folder'               : '📁',
  'palette'              : '🎨',
  'rulers'               : '📏',
  'tag'                  : '📝',
  'headset'              : '💬',
  'search'               : '🔍',
  'moon'                 : '🌙',
  'bell'                 : '🔔',
  'gear'                 : '⚙️',
  'person'               : 'P',
  'upload'               : '⬆',
  'pencil-square'        : '✏',
  'check-lg'             : '✓',
  'x-lg'                 : '✕',
  'wallet2'              : '💳',
  'calendar-event'       : '📅',
  'building-check'       : '🏭',
  'clock-history'        : '⏳',
  'patch-check'          : '✓',
  'exclamation-triangle' : '⚠',
  'info-circle'          : 'ℹ',
};

function BI({ name, size = 16, color = '#2D3748', style }) {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[{ fontSize: size, color, lineHeight: size + 4, fontFamily: 'bootstrap-icons' }, style]}
        // Bootstrap Icons font renders via CSS class on web
      >
        {/* We use a span trick: render as HTML element */}
        {null}
      </Text>
    );
  }
  return (
    <Text style={[{ fontSize: size, color }, style]}>
      {NATIVE_FALLBACKS[name] || '•'}
    </Text>
  );
}

// On web we use a real <i> tag via a wrapper component
function Icon({ name, size = 16, color = '#2D3748', style }) {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        {/* eslint-disable-next-line react-native/no-raw-text */}
        <Text
          style={{ fontSize: size, color, lineHeight: size }}
          // @ts-ignore – web only
          dangerouslySetInnerHTML={undefined}
        >
          <i className={`bi bi-${name}`} style={{ fontSize: size, color }} />
        </Text>
      </View>
    );
  }
  return (
    <Text style={[{ fontSize: size, color }, style]}>
      {NATIVE_FALLBACKS[name] || '•'}
    </Text>
  );
}

// ─── Optional native image picker ─────────────────────────────────────────────
let ImagePicker = null;
try { ImagePicker = require('react-native-image-picker'); } catch (_) {}

// ─── Breakpoint ───────────────────────────────────────────────────────────────
const DESKTOP_BREAKPOINT = 1024;

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  orangeHeader : '#F4A44A',
  brownHeader  : '#8B4513',
  greenHeader  : '#4CAF50',
  navyHeader   : '#2C3E50',
  purpleHeader : '#7B2FBE',
  sidebarBg    : '#1E2A38',
  sidebarText  : '#A0AEC0',
  sidebarHover : 'rgba(255,255,255,0.06)',
  white        : '#FFFFFF',
  offWhite     : '#F8F9FA',
  border       : '#E2E8F0',
  textPrimary  : '#2D3748',
  textSecondary: '#718096',
  orange       : '#F4A44A',
  activeGreen  : '#38A169',
  walletOrange : '#E67E22',
  labelGray    : '#9B9B9B',
  inputBorder  : '#CBD5E0',
  inputFocus   : '#F4A44A',
  saveBg       : '#38A169',
  cancelBg     : '#E2E8F0',
};

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { title: 'GENERAL', items: [
      { label: 'Dashboard', icon: 'house-door' },
  ]},
  { title: 'SELLER TOOLS', items: [
      { label: 'Products',      icon: 'box-seam'   },
      { label: 'Orders',        icon: 'receipt'    },
      { label: 'Subcategories', icon: 'folder'     },
      { label: 'Colors',        icon: 'palette'    },
      { label: 'Sizes',         icon: 'rulers'     },
  ]},
  { title: 'SERVICES', items: [
      { label: 'Request Category', icon: 'tag'     },
      { label: 'Support',          icon: 'headset' },
  ]},
];

// ═══════════════════════════════════════════════════════════════
//  Reusable helpers
// ═══════════════════════════════════════════════════════════════

function SectionCard({ headerColor, iconName, title, children, cardStyle }) {
  return (
    <View style={[s.card, cardStyle]}>
      <View style={[s.cardHeader, { backgroundColor: headerColor }]}>
        <Icon name={iconName} size={16} color={C.white} style={s.cardHeaderIcon} />
        <Text style={s.cardHeaderText}>{title}</Text>
      </View>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, valueStyle }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function InfoGrid({ left, right }) {
  return (
    <View style={s.infoGrid}>
      <View style={s.infoGridCell}>
        <Text style={s.infoLabel}>{left.label}</Text>
        <Text style={s.infoValue}>{left.value}</Text>
      </View>
      {right && (
        <View style={s.infoGridCell}>
          <Text style={s.infoLabel}>{right.label}</Text>
          <Text style={s.infoValue}>{right.value}</Text>
        </View>
      )}
    </View>
  );
}

function PendingBadge() {
  return (
    <View style={[s.badge, { backgroundColor: '#FEF3C7' }]}>
      <Text style={[s.badgeText, { color: '#92400E' }]}>Pending Approval</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Editable field
// ═══════════════════════════════════════════════════════════════
function EditableField({ label, value, onSave, pending = false, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);

  const handleEdit   = () => { setDraft(value); setEditing(true); };
  const handleSave   = () => {
    if (!draft.trim()) { Alert.alert('Validation', `${label} cannot be empty.`); return; }
    onSave(draft.trim()); setEditing(false);
  };
  const handleCancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <View style={s.editableWrap}>
        <Text style={s.infoLabel}>{label}</Text>
        <TextInput
          style={[s.textInput, multiline && s.textInputMulti]}
          value={draft}
          onChangeText={setDraft}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          autoFocus
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={C.textSecondary}
        />
        <View style={s.editBtnRow}>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Icon name="check-lg" size={13} color={C.white} />
            <Text style={s.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
            <Icon name="x-lg" size={13} color={C.textPrimary} />
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.editableWrap}>
      <Text style={s.infoLabel}>{label}</Text>
      <View style={s.editableValueRow}>
        <Text style={[s.infoValue, { flex: 1 }]}>{value}</Text>
        <View style={s.editableActions}>
          {pending && <PendingBadge />}
          <TouchableOpacity style={s.editBtn} onPress={handleEdit}>
            <Icon name="pencil-square" size={12} color={C.textPrimary} />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Profile Photo Upload
// ═══════════════════════════════════════════════════════════════
function ProfilePhotoSection({ photoUri, onPhotoChange }) {
  const fileInputRef = useRef(null);

  const handleWebUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    if (!allowed.includes(file.type)) { alert('Only JPG, PNG, GIF, or WebP files are allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('File size must be 2 MB or less.'); return; }
    onPhotoChange(URL.createObjectURL(file));
  };

  const handleNativeUpload = () => {
    if (!ImagePicker) { Alert.alert('Not available','react-native-image-picker is not installed.'); return; }
    ImagePicker.launchImageLibrary({ mediaType:'photo', quality:0.8, selectionLimit:1 }, (res) => {
      if (res.didCancel || res.errorCode) return;
      const asset = res.assets && res.assets[0];
      if (asset) onPhotoChange(asset.uri);
    });
  };

  const handleUploadPress = () => {
    if (Platform.OS === 'web') fileInputRef.current && fileInputRef.current.click();
    else handleNativeUpload();
  };

  return (
    <View style={s.profilePicRow}>
      <View style={s.profilePicWrap}>
        {photoUri
          ? <Image source={{ uri: photoUri }} style={s.profilePicImage} />
          : <View style={s.profilePicPlaceholder}>
              <Icon name="person-circle" size={36} color={C.orange} />
            </View>
        }
      </View>
      <View style={s.profilePicInfo}>
        <Text style={s.infoLabel}>PROFILE PICTURE</Text>
        <Text style={s.profilePicHint}>JPG, PNG, GIF or WebP. Max 2 MB.</Text>
        <TouchableOpacity style={s.uploadBtn} onPress={handleUploadPress}>
          <Icon name="upload" size={13} color={C.white} style={{ marginRight: 6 }} />
          <Text style={s.uploadBtnText}>Upload new photo</Text>
        </TouchableOpacity>
      </View>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={handleWebUpload}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Desktop Sidebar
// ═══════════════════════════════════════════════════════════════
function DesktopSidebar() {
  return (
    <View style={s.desktopSidebar}>
      <View style={s.sidebarLogo}>
        <Text style={s.sidebarLogoText}>
          <Text style={{ color: C.orange }}>F</Text>LINT &amp;{' '}
          <Text style={{ color: C.orange }}>T</Text>HREAD
        </Text>
        <Text style={s.sidebarLogoSub}>The Infinity and Vanguard</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {NAV_SECTIONS.map((sec) => (
          <View key={sec.title} style={s.navSection}>
            <Text style={s.navSectionTitle}>{sec.title}</Text>
            {sec.items.map((item) => (
              <TouchableOpacity key={item.label} style={s.navItem}>
                <Icon name={item.icon} size={16} color={C.sidebarText} style={{ marginRight: 10 }} />
                <Text style={s.navItemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={s.navSection}>
          <TouchableOpacity style={s.navItem}>
            <Icon name="bank" size={16} color={C.sidebarText} style={{ marginRight: 10 }} />
            <Text style={s.navItemLabel}>Bank Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Desktop Top Bar
// ═══════════════════════════════════════════════════════════════
function DesktopTopBar() {
  return (
    <View style={s.desktopTopBar}>
      <View style={s.searchBox}>
        <Icon name="search" size={14} color={C.textSecondary} style={{ marginRight: 8 }} />
        <Text style={s.searchPlaceholder}>Search...</Text>
      </View>
      <View style={s.topBarActions}>
        <Icon name="moon"  size={18} color={C.textSecondary} />
        <Icon name="bell"  size={18} color={C.textSecondary} />
        <Icon name="gear"  size={18} color={C.textSecondary} />
        <View style={s.avatarCircle}>
          <Icon name="person" size={18} color={C.white} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  KYC status items
// ═══════════════════════════════════════════════════════════════
const KYC_ITEMS = [
  { label: 'PROFILE COMPLETED', text: 'Completed',    icon: 'patch-check',  bg: '#C6F6D5', fg: '#276749' },
  { label: 'KYC COMPLETED',     text: 'Pending',      icon: 'clock-history',bg: '#FEEBC8', fg: '#7B341E' },
  { label: 'KYC VERIFIED',      text: 'Not Verified', icon: 'x-lg',         bg: '#FED7D7', fg: '#9B2C2C' },
  { label: 'HAS GST',           text: 'Yes',          icon: 'check-lg',     bg: '#BEE3F8', fg: '#2A4365' },
];

// ═══════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════
export default function SellerProfileScreen() {
  const { width } = useWindowDimensions();
  const isDesktop  = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const { profile } = useSellerProfile();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [address,  setAddress]  = useState('');
  const [road,     setRoad]     = useState('');
  const [landmark, setLandmark] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (profile.profilePicUrl) setPhotoUri(profile.profilePicUrl);
    if (profile.address) setAddress(profile.address);
    if (profile.roadNumber) setRoad(profile.roadNumber);
    if (profile.landmark) setLandmark(profile.landmark);
  }, [profile]);

  if (!isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <AppHeader title="Profile" subtitle="View and edit your seller details" showBackButton />
        <ScrollView style={s.mobileContainer}>
          <MobileProfileContent
            photoUri={photoUri}   onPhotoChange={setPhotoUri}
            address={address}     onAddressSave={setAddress}
            road={road}           onRoadSave={setRoad}
            landmark={landmark}   onLandmarkSave={setLandmark}
          />
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  DESKTOP — equal-height card rows via alignItems:'stretch'
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={s.desktopRoot}>
      {/* <DesktopSidebar /> */}
      <View style={s.desktopMain}>
        {/* <DesktopTopBar /> */}
        <ScrollView
          style={s.desktopScrollArea}
          contentContainerStyle={s.desktopScrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Row 1: Personal Info + Business Info (equal height) ── */}
          <View style={s.desktopRow}>

            <SectionCard
              headerColor={C.orangeHeader}
              iconName="person-circle"
              title="Personal Information"
              cardStyle={s.desktopCard}
            >
              <ProfilePhotoSection photoUri={photoUri} onPhotoChange={setPhotoUri} />
              <View style={s.divider} />
              <InfoGrid
                left={{ label: 'FIRST NAME', value: 'Pickcell' }}
                right={{ label: 'LAST NAME',  value: 'Pickcell' }}
              />
              <InfoGrid
                left={{ label: 'MOBILE', value: '+919321502225' }}
                right={{ label: 'EMAIL',  value: 'pickcellonlines@gmail.com' }}
              />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>STATUS</Text>
                <View style={[s.badge, { backgroundColor: '#C6F6D5', alignSelf: 'flex-start' }]}>
                  <Text style={[s.badgeText, { color: '#276749' }]}>Active</Text>
                </View>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>MEMBER SINCE</Text>
                <View style={s.iconValueRow}>
                  <Icon name="calendar-event" size={13} color={C.textSecondary} style={{ marginRight: 5 }} />
                  <Text style={s.infoValue}>15 Nov, 2025</Text>
                </View>
              </View>
            </SectionCard>

            <SectionCard
              headerColor={C.brownHeader}
              iconName="building"
              title="Business Information"
              cardStyle={s.desktopCard}
            >
              <InfoRow label="BUSINESS NAME" value="PICKCELL" />
              <InfoGrid
                left={{ label: 'BUSINESS TYPE', value: 'Sole Proprietorship' }}
                right={{ label: 'GST NUMBER',   value: '27AWMPS1214Q1ZX' }}
              />
              <InfoGrid
                left={{ label: 'PAN NUMBER',      value: 'AWMPS1214Q' }}
                right={{ label: 'AADHAAR NUMBER', value: '****7423' }}
              />
              <View style={s.walletRow}>
                <Text style={s.infoLabel}>WALLET BALANCE</Text>
                <View style={s.iconValueRow}>
                  <Icon name="wallet2" size={18} color={C.walletOrange} style={{ marginRight: 6 }} />
                  <Text style={s.walletAmount}>₹465.00</Text>
                </View>
              </View>
            </SectionCard>
          </View>

          {/* ── Row 2: Address Info + Bank Info (equal height) ── */}
          <View style={s.desktopRow}>

            <SectionCard
              headerColor={C.navyHeader}
              iconName="geo-alt"
              title="Address Information"
              cardStyle={s.desktopCard}
            >
              <EditableField label="ADDRESS"            value={address}  onSave={setAddress}  pending multiline />
              <InfoGrid
                left={{ label: 'CITY',  value: 'Mumbai' }}
                right={{ label: 'STATE', value: 'Maharashtra' }}
              />
              <EditableField label="ROAD / STREET NUMBER" value={road}     onSave={setRoad}     pending />
              <EditableField label="LANDMARK"             value={landmark} onSave={setLandmark} pending />
              <InfoGrid
                left={{ label: 'PINCODE', value: '400063' }}
                right={{ label: 'COUNTRY', value: 'India' }}
              />

              <View style={s.divider} />

              <View style={s.warehouseHeader}>
                <Icon name="building-check" size={16} color={C.textPrimary} style={{ marginRight: 6 }} />
                <Text style={s.warehouseTitle}>Warehouse Address</Text>
              </View>
              <InfoRow
                label="WAREHOUSE ADDRESS"
                value="B-706,Radha Vallabh, Near Dmart, 150 Feet Road, City Bhayndar West"
              />
              <InfoGrid
                left={{ label: 'WAREHOUSE AREA',  value: 'Thane'        }}
                right={{ label: 'WAREHOUSE CITY', value: 'Mumbai'       }}
              />
              <InfoGrid
                left={{ label: 'WAREHOUSE STATE',   value: 'Maharashtra' }}
                right={{ label: 'WAREHOUSE COUNTRY', value: 'India'      }}
              />
            </SectionCard>

            <SectionCard
              headerColor={C.greenHeader}
              iconName="bank"
              title="Bank Information"
              cardStyle={s.desktopCard}
            >
              <InfoRow label="BANK NAME" value="Indusind Bank" />
              <InfoGrid
                left={{ label: 'ACCOUNT NUMBER', value: '****6666'    }}
                right={{ label: 'IFSC CODE',     value: 'INDB0000862' }}
              />
              <InfoRow label="ACCOUNT HOLDER NAME" value="PICKCELL" />
            </SectionCard>
          </View>

          {/* ── Row 3: KYC full-width ── */}
          <View style={s.desktopFullRow}>
            <View style={[s.card, s.desktopCard]}>
              <View style={[s.cardHeader, { backgroundColor: C.purpleHeader }]}>
                <Icon name="shield-check" size={16} color={C.white} style={s.cardHeaderIcon} />
                <Text style={s.cardHeaderText}>KYC &amp; Verification Status</Text>
              </View>
              <View style={s.cardBody}>
                <View style={s.kycGrid}>
                  {KYC_ITEMS.map((item) => (
                    <View key={item.label} style={s.kycItem}>
                      <Text style={s.infoLabel}>{item.label}</Text>
                      <View style={[s.statusBadge, { backgroundColor: item.bg }]}>
                        <Icon name={item.icon} size={12} color={item.fg} style={{ marginRight: 5 }} />
                        <Text style={[s.statusBadgeText, { color: item.fg }]}>{item.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>KYC VERIFIED AT</Text>
                  <View style={s.iconValueRow}>
                    <Icon name="calendar-event" size={13} color={C.textSecondary} style={{ marginRight: 5 }} />
                    <Text style={s.infoValue}>18 Nov, 2025 05:27</Text>
                  </View>
                </View>
                <View style={s.kycRemarksBox}>
                  <Text style={s.infoLabel}>KYC REMARKS</Text>
                  <View style={s.kycRemarksCard}>
                    <View style={s.kycRemarksAccent} />
                    <Text style={s.kycRemarksText}>
                      you need to upload business proof and you need to show all documents in vkyc
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Mobile content (wire your existing JSX here)
// ═══════════════════════════════════════════════════════════════
function MobileProfileContent({ photoUri, onPhotoChange, address, onAddressSave, road, onRoadSave, landmark, onLandmarkSave }) {
  return (
    <View style={s.mobilePlaceholder}>
      <ProfilePhotoSection photoUri={photoUri} onPhotoChange={onPhotoChange} />
      <EditableField label="ADDRESS"        value={address}  onSave={onAddressSave}  pending multiline />
      <EditableField label="ROAD / STREET"  value={road}     onSave={onRoadSave}     pending />
      <EditableField label="LANDMARK"       value={landmark} onSave={onLandmarkSave} pending />
      <Text style={s.mobilePlaceholderText}>Mobile Profile UI — paste your existing JSX here</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  // ── Mobile ────────────────────────────────────────────────────
  mobileContainer:       { flex: 1, backgroundColor: C.offWhite },
  mobilePlaceholder:     { flex: 1, padding: 16, gap: 12 },
  mobilePlaceholderText: { fontSize: 14, color: C.textSecondary, marginTop: 12 },

  // ── Desktop root ───────────────────────────────────────────────
  desktopRoot: {
  flex: 1,
  flexDirection: 'row',
  backgroundColor: C.offWhite,
  width: '100%',
  height: '100vh',
},
  // desktopRoot: {
  //   flex: 1, flexDirection: 'row', backgroundColor: C.offWhite,
  //   ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
  // },

  // ── Sidebar ────────────────────────────────────────────────────
  desktopSidebar: {
    width: 240, backgroundColor: C.sidebarBg, paddingBottom: 24, flexShrink: 0,
    ...(Platform.OS === 'web' ? { height: '100vh', position: 'sticky', top: 0 } : {}),
  },
  sidebarLogo: {
    paddingHorizontal: 20, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 8,
  },
  sidebarLogoText: { fontSize: 15, fontWeight: '800', color: C.white, letterSpacing: 1 },
  sidebarLogoSub:  { fontSize: 10, color: C.sidebarText, marginTop: 2 },
  navSection:      { marginTop: 6, paddingHorizontal: 12 },
  navSectionTitle: { fontSize: 10, fontWeight: '700', color: C.sidebarText, letterSpacing: 1.2, paddingHorizontal: 8, paddingVertical: 6 },
  navItem:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 2 },
  navItemLabel:    { fontSize: 14, color: C.sidebarText },

  // ── Top bar ────────────────────────────────────────────────────
  desktopTopBar: {
    height: 60, backgroundColor: C.white, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: C.border,
    ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 10 } : {}),
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.offWhite,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    width: 280, borderWidth: 1, borderColor: C.border,
  },
  searchPlaceholder: { fontSize: 14, color: C.textSecondary },
  topBarActions:     { flexDirection: 'row', alignItems: 'center', gap: 18 },
  avatarCircle:      { width: 36, height: 36, borderRadius: 18, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },

  // ── Scroll area ────────────────────────────────────────────────
  desktopMain: {
  flex: 1,
  width: '100%',
  flexDirection: 'column',
  overflow: 'hidden',
},
  desktopScrollArea:    { flex: 1 },
  desktopScrollContent: {
  width: '100%',
  paddingHorizontal: 24,
  paddingBottom: 0,
  gap: 20,
},


  // ── Rows — alignItems:'stretch' gives equal height to children ─
desktopRow: {
  width: '100%',
  flexDirection: 'row',
  gap: 20,
  alignItems: 'stretch',
},
  desktopFullRow: { flexDirection: 'row' },

  // ── Card ───────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
  },
  desktopCard: {
    flex: 1,                                    // equal width
    // height is driven by alignItems:'stretch' on the row
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  cardHeaderIcon: { marginRight: 10 },
  cardHeaderText: { fontSize: 15, fontWeight: '700', color: C.white, letterSpacing: 0.3 },
  cardBody: { padding: 20, gap: 14 },

  // ── Profile photo ──────────────────────────────────────────────
  profilePicRow:         { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profilePicWrap:        { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: C.orange, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3E0' },
  profilePicImage:       { width: '100%', height: '100%', resizeMode: 'cover' },
  profilePicPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  profilePicInfo:        { flex: 1, gap: 6 },
  profilePicHint:        { fontSize: 12, color: C.textSecondary },
  uploadBtn:             { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.orange, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, marginTop: 4 },
  uploadBtnText:         { fontSize: 13, color: C.white, fontWeight: '600' },

  // ── Info rows ──────────────────────────────────────────────────
  divider:       { height: 1, backgroundColor: C.border, marginVertical: 4 },
  infoRow:       { gap: 4 },
  iconValueRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  infoGrid:      { flexDirection: 'row', gap: 16 },
  infoGridCell:  { flex: 1, gap: 4 },
  infoLabel:     { fontSize: 11, fontWeight: '700', color: C.labelGray, letterSpacing: 0.8, textTransform: 'uppercase' },
  infoValue:     { fontSize: 14, color: C.textPrimary, fontWeight: '500' },

  // ── Badge ──────────────────────────────────────────────────────
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // ── Editable field ─────────────────────────────────────────────
  editableWrap:     { gap: 6 },
  editableValueRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  editableActions:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  editBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.inputBorder, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: C.white },
  editBtnText:      { fontSize: 12, color: C.textPrimary, fontWeight: '500' },
  textInput: {
    borderWidth: 1.5, borderColor: C.inputFocus, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: C.textPrimary, backgroundColor: '#FFFBF5',
  },
  textInputMulti: { minHeight: 72, textAlignVertical: 'top' },
  editBtnRow:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 7, backgroundColor: C.saveBg },
  saveBtnText:    { fontSize: 13, color: C.white, fontWeight: '700' },
  cancelBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 7, backgroundColor: C.cancelBg, borderWidth: 1, borderColor: C.inputBorder },
  cancelBtnText:  { fontSize: 13, color: C.textPrimary, fontWeight: '600' },

  // ── Wallet ─────────────────────────────────────────────────────
  walletRow:   { gap: 4, marginTop: 4 },
  walletAmount:{ fontSize: 20, fontWeight: '700', color: C.walletOrange },

  // ── Warehouse ──────────────────────────────────────────────────
  warehouseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  warehouseTitle:  { fontSize: 14, fontWeight: '700', color: C.textPrimary },

  // ── KYC ────────────────────────────────────────────────────────
  kycGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 24,justifyContent: 'space-between', marginBottom: 8 },
  kycItem:         { gap: 6, minWidth: 180,flex: 1},
  statusBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  kycRemarksBox:   { gap: 8, marginTop: 4 },
  kycRemarksCard:  { flexDirection: 'row', backgroundColor: '#FFF8F0', borderRadius: 8, overflow: 'hidden', padding: 14, gap: 10 },
  kycRemarksAccent:{ width: 4, borderRadius: 2, backgroundColor: C.orange, alignSelf: 'stretch', marginRight: 6 },
  kycRemarksText:  { flex: 1, fontSize: 13, color: C.textPrimary, lineHeight: 20 },
});