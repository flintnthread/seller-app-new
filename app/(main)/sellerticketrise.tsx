import { useState } from "react";
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";

// import LinearGradient from "react-native-linear-gradient";
import * as ImagePicker from 'expo-image-picker';

import Toast from 'react-native-toast-message';
// @ts-ignore
import Feather from "react-native-vector-icons/Feather";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
// @ts-ignore
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const RaiseTicketScreen = () => {
  const [description, setDescription] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ uri: string, name: string, size: number }[]>([]);
  const [supportCategory, setSupportCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [otherDetails, setOtherDetails] = useState("");
  const [categoryDetails, setCategoryDetails] = useState("");
  const [showPremiumUploadModal, setShowPremiumUploadModal] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const supportCategories = [
    { id: 'order', name: 'Order Related', icon: 'package', color: '#FF6B6B' },
    { id: 'payment', name: 'Payment & Payout', icon: 'credit-card', color: '#4ECDC4' },
    { id: 'product', name: 'Product Related', icon: 'tag', color: '#45B7D1' },
    { id: 'shipping', name: 'Shipping Related', icon: 'truck', color: '#96CEB4' },
    { id: 'technical', name: 'Technical Support', icon: 'settings', color: '#FFEAA7' },
    { id: 'account', name: 'Account & Profile', icon: 'user', color: '#DDA0DD' },
    { id: 'other', name: 'Other', icon: 'help-circle', color: '#FFB6C1' },
  ];

  const handleImageUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Toast.show({ type: 'error', text1: 'Permission Required', text2: 'Please grant camera roll permissions to upload images.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (!asset) return;
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = asset.uri.split('.').pop()?.toLowerCase();
        const fileSize = asset.fileSize || 0;
        const maxSize = 5 * 1024 * 1024;
        if (fileExtension && validExtensions.includes(fileExtension)) {
          if (fileSize <= maxSize) {
            setSelectedImages(prev => [...prev, { uri: asset.uri, name: asset.fileName || 'image', size: fileSize }]);
            setShowPremiumUploadModal(false);
          } else {
            Toast.show({ type: 'error', text1: 'File Too Large', text2: 'Please select an image smaller than 5MB.' });
          }
        } else {
          Toast.show({ type: 'error', text1: 'Invalid File', text2: 'Please select a JPG or PNG image.' });
        }
      }
    } catch (error) {
      console.log('ImagePicker Error: ', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to select image. Please try again.' });
    }
  };

  const handleCameraUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Toast.show({ type: 'error', text1: 'Permission Required', text2: 'Please grant camera permissions to take photos.' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (!asset) return;
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = asset.uri.split('.').pop()?.toLowerCase();
        const fileSize = asset.fileSize || 0;
        const maxSize = 5 * 1024 * 1024;
        if (fileExtension && validExtensions.includes(fileExtension)) {
          if (fileSize <= maxSize) {
            setSelectedImages(prev => [...prev, { uri: asset.uri, name: asset.fileName || 'image', size: fileSize }]);
            setShowPremiumUploadModal(false);
          } else {
            Toast.show({ type: 'error', text1: 'File Too Large', text2: 'Please select an image smaller than 5MB.' });
          }
        } else {
          Toast.show({ type: 'error', text1: 'Invalid File', text2: 'Please select a JPG or PNG image.' });
        }
      }
    } catch (error) {
      console.log('Camera Error: ', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to take photo. Please try again.' });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!supportCategory.trim()) errors.supportCategory = 'Please fill out this field';
    if (!subject.trim()) errors.subject = 'Please fill out this field';
    if (!description.trim()) errors.description = 'Please fill out this field';
    if (subject.trim().length < 3) errors.categoryDetails = 'Please fill out this field';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTicket = async () => {
    if (isSubmitting) return;
    setValidationErrors({});

    if (!supportCategory.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please select a support category.' });
      setValidationErrors({ supportCategory: 'Please fill out this field' });
      return;
    }
    if (!subject.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a subject.' });
      setValidationErrors({ subject: 'Please fill out this field' });
      return;
    }
    if (subject.trim().length < 3) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Subject must be at least 3 characters.' });
      setValidationErrors({ subject: 'Please fill out this field' });
      return;
    }
    if (!description.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a description.' });
      setValidationErrors({ description: 'Please fill out this field' });
      return;
    }
    if (supportCategory === 'Other' && !categoryDetails.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter category details.' });
      setValidationErrors({ categoryDetails: 'Please fill out this field' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('supportCategory', supportCategory);
      formData.append('subject', subject);
      formData.append('description', description);
      if (supportCategory) formData.append('categoryDetails', categoryDetails);
      selectedImages.forEach((image, index) => {
        formData.append(`image_${index}`, { uri: image.uri, type: 'image/jpeg', name: image.name } as any);
      });
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        Toast.show({ type: 'success', text1: 'Your ticket has been submitted successfully.' });
        setSupportCategory('');
        setSubject('');
        setDescription('');
        setCategoryDetails('');
        setSelectedImages([]);
        setValidationErrors({});
      } catch (mockError) {
        Toast.show({ type: 'error', text1: 'Failed', text2: 'Something went wrong. Please try again.' });
      }
    } catch (error) {
      console.error('Submit error:', error);
      Toast.show({ type: 'error', text1: 'Failed', text2: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── SHARED MODALS (used by both desktop and mobile) ──────────────────────
  const sharedModals = (
    <>
      {/* Premium Upload Modal */}
      <Modal
        visible={showPremiumUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPremiumUploadModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalCard}>
            <TouchableOpacity style={styles.premiumCloseButton} onPress={() => setShowPremiumUploadModal(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <AppText style={styles.premiumHeading}>Upload Images</AppText>
            <AppText style={styles.premiumSubtitle}>Choose an option</AppText>
            <View style={styles.premiumButtonContainer}>
              <TouchableOpacity style={styles.premiumButton} onPress={handleCameraUpload}>
                <Ionicons name="camera" size={24} color="#FFFFFF" />
                <AppText style={styles.premiumButtonText}>Camera</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.premiumButton} onPress={handleImageUpload}>
                <Ionicons name="images" size={24} color="#FFFFFF" />
                <AppText style={styles.premiumButtonText}>Gallery</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowUploadModal(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalContent} onPress={e => e.stopPropagation()}>
              <View style={styles.dragIndicator} />
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle}>Upload Image</AppText>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowUploadModal(false)}>
                  <Ionicons name="close" size={24} color="#001C58" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalOptions}>
                <TouchableOpacity style={styles.optionButton} onPress={handleImageUpload}>
                  <Ionicons name="images" size={24} color="#001A72" />
                  <AppText style={styles.optionText}>Gallery</AppText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  // ─── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.root}>
        {/* Top Nav */}
        <View style={desktopStyles.topNav}>
          <View style={desktopStyles.topNavLeft}>
            <TouchableOpacity style={desktopStyles.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#001A72" />
              <AppText style={desktopStyles.backBtnText}>Back</AppText>
            </TouchableOpacity>
          </View>
          <View style={desktopStyles.topNavCenter}>
            <Ionicons name="headset-outline" size={22} color="#FF6B35" />
            <AppText style={desktopStyles.topNavTitle}>Support Center</AppText>
          </View>
          <View style={desktopStyles.topNavRight}>
            <View style={desktopStyles.topNavBadge}>
              <Ionicons name="shield-checkmark-outline" size={15} color="#001A72" />
              <AppText style={desktopStyles.topNavBadgeText}>Secure</AppText>
            </View>
          </View>
        </View>

        {/* Page Hero */}
        <View style={desktopStyles.hero}>
          <View style={desktopStyles.heroInner}>
            <AppText style={desktopStyles.heroTitle}>Raise a Support Ticket</AppText>
            <AppText style={desktopStyles.heroSubtitle}>
              We're here to help. Fill in the details below and our team will respond within 24–48 working hours.
            </AppText>
          </View>
        </View>

        {/* Body */}
        <ScrollView
          style={desktopStyles.scrollArea}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={desktopStyles.scrollContent}
          scrollEnabled={!showCategoryDropdown}
        >
          <View style={desktopStyles.twoCol}>

            {/* ── LEFT COLUMN: Form ── */}
            <View style={desktopStyles.formCol}>

              {/* Support Category */}
              <View style={desktopStyles.fieldBlock}>
                <AppText style={desktopStyles.fieldLabel}>
                  Support Category <AppText style={desktopStyles.required}>*</AppText>
                </AppText>
                <View style={desktopStyles.dropdownWrapper}>
                  <TouchableOpacity
                    style={[
                      desktopStyles.dropdownTrigger,
                      supportCategory && desktopStyles.dropdownTriggerActive,
                      validationErrors.supportCategory && desktopStyles.dropdownTriggerError,
                    ]}
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  >
                    <View style={desktopStyles.dropdownLeft}>
                      <View style={desktopStyles.dropdownIconCircle}>
                        <Feather name="headphones" size={18} color="#ff6a00" />
                      </View>
                      <AppText style={supportCategory ? desktopStyles.dropdownValueText : desktopStyles.dropdownPlaceholder}>
                        {supportCategory || 'Select Support Category'}
                      </AppText>
                    </View>
                    <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                  </TouchableOpacity>

                  {showCategoryDropdown && (
                    <View style={desktopStyles.dropdownCard}>
                      <View style={desktopStyles.dropdownGrid}>
                        {supportCategories.map((category) => (
                          <TouchableOpacity
                            key={category.id}
                            style={[
                              desktopStyles.dropdownGridItem,
                              supportCategory === category.name && desktopStyles.dropdownGridItemActive,
                            ]}
                            onPress={() => {
                              setSupportCategory(category.name);
                              if (category.name !== 'Other') setCategoryDetails('');
                              setShowCategoryDropdown(false);
                              setValidationErrors(prev => ({ ...prev, supportCategory: '', categoryDetails: '' }));
                            }}
                          >
                            <View style={[desktopStyles.dropdownGridIcon, { backgroundColor: category.color }]}>
                              <Feather name={category.icon as any} size={20} color="#fff" />
                            </View>
                            <AppText style={[
                              desktopStyles.dropdownGridLabel,
                              supportCategory === category.name && desktopStyles.dropdownGridLabelActive,
                            ]}>{category.name}</AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
                {validationErrors.supportCategory ? (
                  <AppText style={desktopStyles.errorText}>{validationErrors.supportCategory}</AppText>
                ) : null}

                {supportCategory === 'Other' && (
                  <View style={{ marginTop: 16 }}>
                    <AppText style={desktopStyles.fieldLabel}>
                      Category Details <AppText style={desktopStyles.required}>*</AppText>
                    </AppText>
                    <View style={[desktopStyles.inputRow, validationErrors.categoryDetails && desktopStyles.inputRowError]}>
                      <View style={desktopStyles.inputIcon}>
                        <Feather name="edit-2" size={16} color="#ff6a00" />
                      </View>
                      <TextInput
                        placeholder="Enter details"
                        placeholderTextColor="#8A94A6"
                        style={desktopStyles.textInput}
                        value={categoryDetails}
                        onChangeText={(text) => setCategoryDetails(text.replace(/[^a-zA-Z0-9\s.,!?]/g, ''))}
                      />
                    </View>
                    {validationErrors.categoryDetails ? (
                      <AppText style={desktopStyles.errorText}>{validationErrors.categoryDetails}</AppText>
                    ) : null}

                    <View style={desktopStyles.infoAlert}>
                      <Ionicons name="information-circle" size={18} color="#ff6a00" />
                      <AppText style={desktopStyles.infoAlertText}>
                        Please specify your issue by selecting "Other" and entering details.
                      </AppText>
                    </View>
                  </View>
                )}
              </View>

              {/* Subject */}
              <View style={desktopStyles.fieldBlock}>
                <AppText style={desktopStyles.fieldLabel}>
                  Subject <AppText style={desktopStyles.required}>*</AppText>
                </AppText>
                <View style={[desktopStyles.inputRow, validationErrors.subject && desktopStyles.inputRowError]}>
                  <View style={desktopStyles.inputIcon}>
                    <Feather name="edit-2" size={16} color="#ff6a00" />
                  </View>
                  <TextInput
                    placeholder="Enter subject"
                    placeholderTextColor="#8A94A6"
                    style={desktopStyles.textInput}
                    value={subject}
                    onChangeText={setSubject}
                  />
                </View>
                {validationErrors.subject ? (
                  <AppText style={desktopStyles.errorText}>{validationErrors.subject}</AppText>
                ) : null}
              </View>

              {/* Order ID */}
              <View style={desktopStyles.fieldBlock}>
                <AppText style={desktopStyles.fieldLabel}>Order ID (Optional)</AppText>
                <View style={desktopStyles.inputRow}>
                  <View style={desktopStyles.inputIcon}>
                    <Feather name="box" size={16} color="#ff6a00" />
                  </View>
                  <TextInput
                    placeholder="Enter Order ID"
                    placeholderTextColor="#8A94A6"
                    style={desktopStyles.textInput}
                  />
                </View>
                <AppText style={desktopStyles.helperText}>
                  Enter an Order ID if your concern is related to a specific order.
                </AppText>
              </View>

              {/* Description */}
              <View style={desktopStyles.fieldBlock}>
                <AppText style={desktopStyles.fieldLabel}>
                  Description <AppText style={desktopStyles.required}>*</AppText>
                </AppText>
                <View style={[desktopStyles.descriptionBox, validationErrors.description && desktopStyles.descriptionBoxError]}>
                  <View style={desktopStyles.descriptionTop}>
                    <View style={desktopStyles.inputIcon}>
                      <MaterialCommunityIcons name="message-outline" size={18} color="#ff6a00" />
                    </View>
                    <TextInput
                      multiline
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Describe your issue in detail..."
                      placeholderTextColor="#8A94A6"
                      style={desktopStyles.descriptionInput}
                      maxLength={500}
                    />
                  </View>
                  <AppText style={desktopStyles.counter}>{description.length}/500</AppText>
                </View>
                {validationErrors.description ? (
                  <AppText style={desktopStyles.errorText}>{validationErrors.description}</AppText>
                ) : null}
              </View>

              {/* Upload */}
              <View style={desktopStyles.fieldBlock}>
                <AppText style={desktopStyles.fieldLabel}>Upload Attachments (Optional)</AppText>
                <TouchableOpacity style={desktopStyles.uploadBox} onPress={() => setShowPremiumUploadModal(true)}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={28} color="#ff6a00" />
                  <View style={{ marginLeft: 14 }}>
                    <AppText style={desktopStyles.uploadTitle}>Upload Images</AppText>
                    <AppText style={desktopStyles.uploadSub}>JPG, PNG up to 5MB</AppText>
                  </View>
                  <View style={desktopStyles.uploadBadge}>
                    <AppText style={desktopStyles.uploadBadgeText}>Browse</AppText>
                  </View>
                </TouchableOpacity>

                {selectedImages.length > 0 && (
                  <View style={desktopStyles.imagePreviewRow}>
                    {selectedImages.map((image, index) => (
                      <View key={index} style={desktopStyles.imageCard}>
                        <Image source={{ uri: image.uri }} style={desktopStyles.previewImage} />
                        <TouchableOpacity style={desktopStyles.removeBtn} onPress={() => removeImage(index)}>
                          <Ionicons name="close" size={14} color="#001F6B" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Submit */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[desktopStyles.submitBtn, isSubmitting && desktopStyles.submitBtnDisabled]}
                onPress={handleSubmitTicket}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={desktopStyles.loadingRow}>
                    <View style={desktopStyles.loadingSpinner} />
                    <AppText style={desktopStyles.submitBtnText}>Submitting...</AppText>
                  </View>
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                    <AppText style={desktopStyles.submitBtnText}>Submit Ticket</AppText>
                  </>
                )}
              </TouchableOpacity>

              <View style={desktopStyles.secureRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#001A72" />
                <AppText style={desktopStyles.secureText}>Your information is safe with us.</AppText>
              </View>
            </View>

            {/* ── RIGHT COLUMN: Info sidebar ── */}
            <View style={desktopStyles.sideCol}>

              {/* What Happens Next */}
              <View style={desktopStyles.sideCard}>
                <View style={desktopStyles.sideCardHeader}>
                  <View style={desktopStyles.sideCardIconBox}>
                    <Ionicons name="information-circle" size={20} color="#FF6B35" />
                  </View>
                  <AppText style={desktopStyles.sideCardTitle}>What happens next?</AppText>
                </View>
                {[
                  { icon: 'checkmark-circle', text: 'Our support team will review your ticket.' },
                  { icon: 'time-outline', text: 'We\'ll respond within 24–48 working hours.' },
                  { icon: 'list-outline', text: 'You can track your ticket in My Tickets.' },
                ].map((item, i) => (
                  <View key={i} style={desktopStyles.sideCardRow}>
                    <View style={desktopStyles.sideCardCheck}>
                      <Ionicons name={item.icon as any} size={18} color="#ff6a00" />
                    </View>
                    <AppText style={desktopStyles.sideCardText}>{item.text}</AppText>
                  </View>
                ))}
              </View>

              {/* Category Guide */}
              <View style={desktopStyles.sideCard}>
                <View style={desktopStyles.sideCardHeader}>
                  <View style={desktopStyles.sideCardIconBox}>
                    <Feather name="grid" size={16} color="#FF6B35" />
                  </View>
                  <AppText style={desktopStyles.sideCardTitle}>Category Guide</AppText>
                </View>
                {supportCategories.slice(0, 5).map((cat) => (
                  <View key={cat.id} style={desktopStyles.categoryGuideRow}>
                    <View style={[desktopStyles.categoryGuideDot, { backgroundColor: cat.color }]}>
                      <Feather name={cat.icon as any} size={12} color="#fff" />
                    </View>
                    <AppText style={desktopStyles.categoryGuideText}>{cat.name}</AppText>
                  </View>
                ))}
              </View>

              {/* Tips */}
              <View style={[desktopStyles.sideCard, desktopStyles.tipsCard]}>
                <View style={desktopStyles.sideCardHeader}>
                  <View style={desktopStyles.sideCardIconBox}>
                    <Ionicons name="bulb-outline" size={18} color="#FF6B35" />
                  </View>
                  <AppText style={desktopStyles.sideCardTitle}>Tips for faster resolution</AppText>
                </View>
                {[
                  'Include your Order ID if order-related.',
                  'Attach screenshots showing the issue.',
                  'Use a clear, descriptive subject.',
                  'Provide as much detail as possible.',
                ].map((tip, i) => (
                  <View key={i} style={desktopStyles.tipRow}>
                    <AppText style={desktopStyles.tipNumber}>{i + 1}</AppText>
                    <AppText style={desktopStyles.tipText}>{tip}</AppText>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>

        {sharedModals}
      </View>
    );
  }

  // ─── ORIGINAL MOBILE LAYOUT (untouched) ───────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={34} color="#fff" />
        </TouchableOpacity>

        <AppText style={styles.headerTitle}>Raise a Ticket</AppText>

        <AppText style={styles.headerSubtitle} numberOfLines={1} adjustsFontSizeToFit={true}>
          We&apos;re here to help you. Please fill in the details.
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!showCategoryDropdown}
      >
        {/* Support Category */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>
            Support Category <AppText style={styles.required}>*</AppText>
          </AppText>

<View style={styles.dropdownWrapper}>
            <TouchableOpacity 
              style={[
                styles.customDropdownTrigger,
                supportCategory && styles.customDropdownTriggerActive,
                validationErrors.supportCategory && styles.customDropdownTriggerError
              ]}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <View style={styles.customDropdownContent}>
                <View style={styles.customDropdownIcon}>
                  <Feather name="headphones" size={24} color="#ff6a00" />
                </View>
                <AppText style={supportCategory ? styles.customDropdownText : styles.customDropdownPlaceholder}>
                  {supportCategory || 'Select Support Category'}
                </AppText>
              </View>
              <Ionicons
                name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
            
            {showCategoryDropdown && (
              <View style={styles.customDropdownCard}>
                {supportCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.customDropdownOption}
                    onPress={() => {
                      setSupportCategory(category.name);
                      // Clear category details if not selecting 'Other'
                      if (category.name !== 'Other') {
                        setCategoryDetails('');
                      }
                      setShowCategoryDropdown(false);
                      // Clear validation errors for category
                      setValidationErrors(prev => ({
                        ...prev,
                        supportCategory: '',
                        categoryDetails: ''
                      }));
                    }}
                  >
                    <View style={[styles.customOptionIcon, { backgroundColor: category.color }]}> 
                      <Feather name={category.icon} size={28} color="#fff" />
                    </View>
                    <AppText style={styles.customOptionText}>{category.name}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {validationErrors.supportCategory && (
            <AppText style={styles.errorText}>{validationErrors.supportCategory}</AppText>
          )}

          {supportCategory === 'Other' && (
            <View style={styles.fieldContainer}>
              <AppText style={styles.label}>
                Category Details <AppText style={styles.required}>*</AppText>
              </AppText>

              <View style={[
                styles.inputBox,
                validationErrors.categoryDetails && styles.inputBoxError
              ]}>
                <View style={styles.iconCircle}>
                  <Feather name="edit-2" size={20} color="#ff6a00" />
                </View>

                <TextInput
                  placeholder="Enter details"
                  placeholderTextColor="#8A94A6"
                  style={styles.textInput}
                  value={categoryDetails}
                  onChangeText={(text) => {
                    // Remove special characters and allow only alphanumeric and basic punctuation
                    const cleanText = text.replace(/[^a-zA-Z0-9\s.,!?]/g, '');
                    setCategoryDetails(cleanText);
                  }}
                />
              </View>

              {validationErrors.categoryDetails && (
                <AppText style={styles.errorText}>{validationErrors.categoryDetails}</AppText>
              )}
            </View>
          )}

          {supportCategory === 'Other' && (
            <View style={styles.otherInfoAlert}>
              <View style={styles.otherInfoIcon}>
                <Ionicons name="information-circle" size={20} color="#ff6a00" />
              </View>
              <AppText style={styles.otherInfoText}>
                Please specify your issue by selecting &quot;Other&quot; and entering details.
              </AppText>
            </View>
          )}
        </View>


        {/* Subject */}
        <View style={[styles.fieldContainer, { marginTop: 0 }]}>
          <AppText style={styles.label}>
            Subject <AppText style={styles.required}>*</AppText>
          </AppText>

          <View style={[
            styles.inputBox,
            validationErrors.subject && styles.inputBoxError
          ]}>
            <View style={styles.iconCircle}>
              <Feather name="edit-2" size={20} color="#ff6a00" />
            </View>

            <TextInput
              placeholder="Enter subject"
              placeholderTextColor="#8A94A6"
              style={styles.textInput}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {validationErrors.subject && (
            <AppText style={styles.errorText}>{validationErrors.subject}</AppText>
          )}
        </View>

        {/* Order ID */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>Order ID (Optional)</AppText>

          <View style={styles.inputBox}>
            <View style={styles.iconCircle}>
              <Feather name="box" size={20} color="#ff6a00" />
            </View>

            <TextInput
              placeholder="Enter Order ID"
              placeholderTextColor="#8A94A6"
              style={styles.textInput}
            />
          </View>

          <AppText style={styles.helperText}>
            Enter an Order ID if your concern is related to a specific order.
          </AppText>
        </View>

        {/* Description */}
        <View style={[
          styles.fieldContainer,
          { marginBottom: 24 }
        ]}>
          <AppText style={styles.label}>
            Description <AppText style={styles.required}>*</AppText>
          </AppText>

          <View style={[
            styles.descriptionBox,
            validationErrors.description && styles.descriptionBoxError
          ]}>
            <View style={styles.descriptionTop}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="message-outline"
                  size={22}
                  color="#ff6a00"
                />
              </View>

              <TextInput
                multiline
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your issue in detail..."
                placeholderTextColor="#8A94A6"
                style={styles.descriptionInput}
              />
            </View>

            <AppText style={styles.counter}>{description.length}/500</AppText>
          </View>

          {validationErrors.description && (
            <AppText style={styles.errorText}>{validationErrors.description}</AppText>
          )}
        </View>

        {/* Upload */}
        <View style={styles.fieldContainer}>
          <AppText style={styles.label}>
            Upload Attachments (Optional)
          </AppText>

          <TouchableOpacity style={styles.uploadBox} onPress={() => setShowPremiumUploadModal(true)}>
            <MaterialCommunityIcons
              name="cloud-upload-outline"
              size={34}
              color="#ff6a00"
            />

            <View style={{ marginLeft: 12 }}>
              <AppText style={styles.uploadTitle}>Upload Images</AppText>

              <AppText style={styles.uploadSubText}>
                JPG, PNG up to 5MB
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Image Preview Cards */}
          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageCard}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={16} color="#001F6B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* What Happens Next */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle"
              size={24}
              color="#ff6a00"
            />

            <AppText style={styles.infoTitle}>What happens next?</AppText>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="checkmark"
              size={20}
              color="#ff6a00"
            />
            <AppText style={styles.infoText}>
              Our support team will review your ticket.
            </AppText>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="checkmark"
              size={20}
              color="#ff6a00"
            />
            <AppText style={styles.infoText}>
              We'll respond within 24–48 working hours.
            </AppText>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="checkmark"
              size={20}
              color="#ff6a00"
            />
            <AppText style={styles.infoText}>
              You can track your ticket in My Tickets.
            </AppText>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmitTicket}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner} />
              <AppText style={styles.submitText}>Submitting...</AppText>
            </View>
          ) : (
            <>
              <Ionicons
                name="paper-plane-outline"
                size={24}
                color="#fff"
              />

              <AppText style={styles.submitText}>Submit Ticket</AppText>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomTextContainer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color="#001A72"
          />

          <AppText style={styles.bottomText}>
            Your information is safe with us.
          </AppText>
        </View>
      </ScrollView>

      {sharedModals}
    </SafeAreaView>
  );
};

export default RaiseTicketScreen;


// ─── DESKTOP STYLES ──────────────────────────────────────────────────────────

const desktopStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F6FB',
    minHeight: '100%' as any,
  },

  // Top Nav
  topNav: {
    height: 64,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EBF2',
    shadowColor: '#001A72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  topNavLeft: {
    flex: 1,
  },
  topNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topNavTitle: {
    fontSize: 17,
    fontFamily: fontFamilies.bold,
    color: '#001A72',
  },
  topNavRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  topNavBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  topNavBadgeText: {
    fontSize: 13,
    color: '#001A72',
    fontFamily: fontFamilies.semiBold,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    color: '#001A72',
    fontFamily: fontFamilies.medium,
  },

  // Hero
  hero: {
    backgroundColor: '#001A72',
    paddingVertical: 36,
    paddingHorizontal: 48,
  },
  heroInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%' as any,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: fontFamilies.bold,
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fontFamilies.medium,
    maxWidth: 560,
  },

  // Scroll / body
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: 1200,
    width: '100%' as any,
    alignSelf: 'center',
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 48,
  },

  // Two-column layout
  twoCol: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
  },
  formCol: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 36,
    shadowColor: '#001A72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    gap: 24,
  },
  sideCol: {
    width: 300,
    flexShrink: 0,
    gap: 20,
  },

  // Field
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  required: {
    color: '#FF3B30',
  },

  // Input row
  inputRow: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
  },
  inputRowError: {
    borderColor: '#FF4D4F',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE5CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#111827',
  },

  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FF4D4F',
    marginTop: 4,
  },

  // Dropdown
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownTrigger: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
  },
  dropdownTriggerActive: {
    borderColor: '#001A72',
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  dropdownTriggerError: {
    borderColor: '#FF4D4F',
    backgroundColor: '#FFF5F5',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE5CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownValueText: {
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
    fontFamily: fontFamilies.medium,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#8A94A6',
    marginLeft: 12,
  },
  dropdownCard: {
    position: 'absolute',
    top: '100%' as any,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 6,
    shadowColor: '#001A72',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 1000,
    padding: 16,
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dropdownGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    minWidth: 160,
  },
  dropdownGridItemActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F0',
  },
  dropdownGridIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownGridLabel: {
    fontSize: 14,
    color: '#333',
    fontFamily: fontFamilies.medium,
  },
  dropdownGridLabelActive: {
    color: '#FF6B35',
    fontFamily: fontFamilies.bold,
  },

  // Info alert (for "Other")
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  infoAlertText: {
    fontSize: 13,
    color: '#344054',
    flex: 1,
    lineHeight: 18,
  },

  // Description
  descriptionBox: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    padding: 14,
  },
  descriptionBoxError: {
    borderColor: '#FF4D4F',
    backgroundColor: '#FFF5F5',
  },
  descriptionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },

  // Upload
  uploadBox: {
    height: 90,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
  },
  uploadTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#ff6a00',
  },
  uploadSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  uploadBadge: {
    marginLeft: 'auto' as any,
    backgroundColor: '#FFE5CC',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  uploadBadgeText: {
    fontSize: 13,
    color: '#ff6a00',
    fontFamily: fontFamilies.semiBold,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  imageCard: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  removeBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#D9E3FF',
    borderRadius: 8,
    padding: 2,
  },

  // Submit
  submitBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#001A72',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#001A72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: '#A0A0A0',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontFamilies.bold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingSpinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopColor: 'transparent',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -8,
  },
  secureText: {
    fontSize: 13,
    color: '#8A94A6',
  },

  // Sidebar cards
  sideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#001A72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  tipsCard: {
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#FFE5CC',
  },
  sideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sideCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF0EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideCardTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#001A72',
    flex: 1,
  },
  sideCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sideCardCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF0EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideCardText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  categoryGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  categoryGuideDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryGuideText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: fontFamilies.medium,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFE5CC',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#ff6a00',
    lineHeight: 22,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
});


// ─── ORIGINAL MOBILE STYLES (untouched) ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 190,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: "#001A72",
  },

  backButton: {
    width: 40,
    marginTop: 56,
  },

  headerTitle: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    color: "#FFFFFF",
    alignSelf: "center",
    marginTop: -36,
  },

  headerSubtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "500",
  },

  scrollContent: {
    padding: 22,
    paddingBottom: 40,
  },

  fieldContainer: {
    marginBottom: 24,
    position: 'relative',
  },

  label: {
    fontSize: 17,
    fontFamily: fontFamilies.bold,
    color: "#0F172A",
    marginBottom: 12,
  },

  required: {
    color: "#FF3B30",
  },

  inputBox: {
    height: 72,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE5CC",
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderText: {
    fontSize: 18,
    color: "#111827",
    marginLeft: 14,
  },

  textInput: {
    flex: 1,
    marginLeft: 14,
    fontSize: 18,
    color: "#111827",
  },

  helperText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
  },

  descriptionBox: {
    minHeight: 210,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 14,
  },

  descriptionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  descriptionInput: {
    flex: 1,
    marginLeft: 14,
    fontSize: 18,
    color: "#111827",
    minHeight: 130,
    textAlignVertical: "top",
  },

  counter: {
    alignSelf: "flex-end",
    color: "#6B7280",
    fontSize: 15,
    marginTop: 10,
  },

  uploadBox: {
    height: 120,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },

  uploadTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: "#ff6a00",
  },

  uploadSubText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: "#F5F8FF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  infoTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: "#001A72",
    marginLeft: 10,
  },

  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },

  infoText: {
    fontSize: 17,
    color: "#111827",
    marginLeft: 12,
    flex: 1,
    lineHeight: 24,
  },

  submitButton: {
    height: 72,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#001A72",
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    marginLeft: 12,
  },

  bottomTextContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },

  bottomText: {
    fontSize: 16,
    color: "#8A94A6",
    marginLeft: 8,
  },

  // Image Preview Styles
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },

  imageCard: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    fontFamily: "Arial",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },

  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#D9E3FF",
    borderRadius: 10,
    padding: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    width: "100%",
    height: "40%",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  modalContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },

  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.semiBold,
    color: "#001C58",
  },

  closeBtn: {
    padding: 4,
  },

  modalOptions: {
    paddingHorizontal: 20,
  },

  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  optionText: {
    fontSize: 16,
    color: "#001A72",
    marginLeft: 12,
    fontWeight: "500",
  },

  // Form Styles
  inputText: {
    fontSize: 18,
    color: "#111827",
    marginLeft: 14,
    flex: 1,
  },

  errorText: {
    fontSize: 14,
    color: "#FF4D4F",
    marginTop: 6,
  },

  // Loading Styles
  submitButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    borderTopColor: "transparent",
    marginRight: 8,
  },

  // Custom Dropdown Styles
  customDropdownTrigger: {
    height: 72,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },

  customDropdownTriggerActive: {
    borderColor: "#001A72",
    borderWidth: 2,
  },

  customDropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  customDropdownIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE5CC",
    justifyContent: "center",
    alignItems: "center",
  },

  customDropdownText: {
    fontSize: 18,
    color: "#111827",
    marginLeft: 14,
    flex: 1,
  },

  customDropdownPlaceholder: {
    fontSize: 18,
    color: "#8A94A6",
    marginLeft: 14,
    flex: 1,
  },

  customDropdownCard: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginTop: -4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1000,
    paddingVertical: 12,
  },

  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },

  customDropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },

  customOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  customOptionText: {
    fontSize: 18,
    color: "#1A1A1A",
    fontWeight: "500",
  },

  // Other Details Styles
  otherHelperText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },

  // Other Info Alert Styles
  otherInfoAlert: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 0,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  otherInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFE5CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  otherInfoText: {
    fontSize: 14,
    color: "#344054",
    flex: 1,
    lineHeight: 20,
  },

  otherDetailsBox: {
    height: 72,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  otherDetailsBoxActive: {
    borderColor: "#001A72",
    borderWidth: 3,
    shadowColor: "#001A72",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  otherDetailsTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    padding: 16,
  },

  otherDetailsInput: {
    flex: 1,
    fontSize: 18,
    color: "#111827",
    marginLeft: 14,
    textAlignVertical: "top",
    minHeight: 200,
  },

  // Premium Modal Styles
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  premiumModalCard: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    padding: 32,
    alignItems: "center",
  },

  premiumCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFE5CC",
    justifyContent: "center",
    alignItems: "center",
  },

  premiumHeading: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },

  premiumSubtitle: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    fontFamily: "serif",
  },

  premiumButtonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: 16,
  },

  premiumButton: {
    flex: 1,
    backgroundColor: "#001F6B",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#001F6B",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  premiumButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.semiBold,
    color: "#FFFFFF",
    marginLeft: 12,
  },

  // Error State Styles
  inputBoxError: {
    height: 72,
    borderWidth: 1,
    borderColor: "#FF4D4F",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  customDropdownTriggerError: {
    height: 72,
    borderWidth: 1,
    borderColor: "#FF4D4F",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },

  otherDetailsBoxError: {
    height: 72,
    borderWidth: 1,
    borderColor: "#FF4D4F",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },

  descriptionBoxError: {
    borderColor: "#FF4D4F",
  },
});
