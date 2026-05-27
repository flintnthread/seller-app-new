import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

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
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  // Desktop success toast
  const [desktopToastVisible, setDesktopToastVisible] = useState(false);
  const desktopToastAnim = useRef(new Animated.Value(400)).current; // starts off-screen right

  const showDesktopSuccessToast = () => {
    setDesktopToastVisible(true);
    desktopToastAnim.setValue(400);
    Animated.sequence([
      Animated.timing(desktopToastAnim, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.delay(2400),
      Animated.timing(desktopToastAnim, {
        toValue: 400,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start(() => setDesktopToastVisible(false));
  };

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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No image selected. Please try again.' });
          return;
        }

        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = asset.uri.split('.').pop()?.toLowerCase();
        const fileSize = asset.fileSize || 0;
        const maxSize = 5 * 1024 * 1024;

        if (fileExtension && validExtensions.includes(fileExtension)) {
          if (fileSize <= maxSize) {
            setSelectedImages(prev => [...prev, {
              uri: asset.uri,
              name: asset.fileName || 'image',
              size: fileSize
            }]);
            setShowPremiumUploadModal(false);
          } else {
            Toast.show({ type: 'error', text1: 'File Too Large', text2: 'Please select an image smaller than 5MB.' });
          }
        } else {
          Toast.show({ type: 'error', text1: 'Invalid File', text2: 'Please select a JPG or PNG image.' });
        }
      } else if (!result.canceled) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No image selected. Please try again.' });
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
        const asset = result.assets?.[0];
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const fileExtension = asset?.uri.split('.').pop()?.toLowerCase();
        const fileSize = asset?.fileSize || 0;
        const maxSize = 5 * 1024 * 1024;

        if (asset && fileExtension && validExtensions.includes(fileExtension)) {
          if (fileSize <= maxSize) {
            setSelectedImages(prev => [...prev, {
              uri: asset.uri,
              name: asset.fileName || 'image',
              size: fileSize
            }]);
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

  // Desktop web: use file input for gallery
  const handleDesktopFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        Toast.show({ type: 'error', text1: 'File Too Large', text2: 'Please select an image smaller than 5MB.' });
        return;
      }
      const uri = URL.createObjectURL(file);
      setSelectedImages(prev => [...prev, { uri, name: file.name, size: file.size }]);
      setShowPremiumUploadModal(false);
    };
    input.click();
  };

  // Desktop web: live camera capture using getUserMedia + canvas snapshot
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  const startDesktopCamera = async () => {
    setShowPremiumUploadModal(false);
    setShowCameraModal(true);
    try {
      const stream = await (navigator as any).mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      // slight delay to let the modal/video element mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 200);
    } catch (err) {
      console.log('Camera error:', err);
      Toast.show({ type: 'error', text1: 'Camera Error', text2: 'Could not access camera. Please check permissions.' });
      setShowCameraModal(false);
    }
  };

  const stopDesktopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const captureDesktopPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const maxSize = 5 * 1024 * 1024;
      if (blob.size > maxSize) {
        Toast.show({ type: 'error', text1: 'File Too Large', text2: 'Captured image exceeds 5MB.' });
        return;
      }
      const uri = URL.createObjectURL(blob);
      const name = `camera_${Date.now()}.jpg`;
      setSelectedImages(prev => [...prev, { uri, name, size: blob.size }]);
      stopDesktopCamera();
    }, 'image/jpeg', 0.85);
  };

  // kept for legacy / fallback
  const handleDesktopCameraCapture = startDesktopCamera;

  // ✅ FIX: Restored missing removeImage function
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
        formData.append(`image_${index}`, {
          uri: image.uri,
          type: 'image/jpeg',
          name: image.name,
        } as any);
      });

      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (isDesktop) {
          showDesktopSuccessToast();
        } else {
          Toast.show({ type: 'success', text1: 'Your ticket has been submitted successfully.' });
        }
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

  // ─── Shared form JSX (used in both mobile and desktop) ───────────────────────

  const renderFormContent = () => (
    <>
      {/* Support Category */}
      <View style={[styles.fieldContainer, isDesktop && desktopStyles.fieldContainer]}>
        <Text style={[styles.label, isDesktop && desktopStyles.label]}>
          Support Category <Text style={styles.required}>*</Text>
        </Text>

        <View style={[styles.dropdownWrapper, isDesktop && desktopStyles.dropdownWrapper]}>
          <TouchableOpacity
            style={[
              styles.customDropdownTrigger,
              isDesktop && desktopStyles.inputBox,
              supportCategory && styles.customDropdownTriggerActive,
              validationErrors.supportCategory && styles.customDropdownTriggerError
            ]}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <View style={styles.customDropdownContent}>
              <View style={[styles.customDropdownIcon, isDesktop && desktopStyles.iconCircle]}>
                <Feather name="headphones" size={isDesktop ? 20 : 24} color="#ff6a00" />
              </View>
              <Text style={[
                supportCategory ? styles.customDropdownText : styles.customDropdownPlaceholder,
                isDesktop && desktopStyles.inputText
              ]}>
                {supportCategory || 'Select Support Category'}
              </Text>
            </View>
            <Ionicons
              name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
              size={isDesktop ? 20 : 24}
              color="#6B7280"
            />
          </TouchableOpacity>

          {showCategoryDropdown && (
            <View style={[styles.customDropdownCard, isDesktop && desktopStyles.dropdownCard]}>
              {supportCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.customDropdownOption, isDesktop && desktopStyles.dropdownOption]}
                  onPress={() => {
                    setSupportCategory(category.name);
                    if (category.name !== 'Other') setCategoryDetails('');
                    setShowCategoryDropdown(false);
                    setValidationErrors(prev => ({
                      ...prev,
                      supportCategory: '',
                      categoryDetails: ''
                    }));
                  }}
                >
                  <View style={[styles.customOptionIcon, isDesktop && desktopStyles.optionIcon, { backgroundColor: category.color }]}>
                    <Feather name={category.icon} size={isDesktop ? 20 : 28} color="#fff" />
                  </View>
                  <Text style={[styles.customOptionText, isDesktop && desktopStyles.optionText]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {validationErrors.supportCategory && (
          <Text style={styles.errorText}>{validationErrors.supportCategory}</Text>
        )}

        {supportCategory === 'Other' && (
          <View style={[styles.fieldContainer, isDesktop && desktopStyles.fieldContainer]}>
            <Text style={[styles.label, isDesktop && desktopStyles.label]}>
              Category Details <Text style={styles.required}>*</Text>
            </Text>
            <View style={[
              styles.inputBox,
              isDesktop && desktopStyles.inputBox,
              validationErrors.categoryDetails && styles.inputBoxError
            ]}>
              <View style={[styles.iconCircle, isDesktop && desktopStyles.iconCircle]}>
                <Feather name="edit-2" size={isDesktop ? 16 : 20} color="#ff6a00" />
              </View>
              <TextInput
                placeholder="Enter details"
                placeholderTextColor="#8A94A6"
                style={[styles.textInput, isDesktop && desktopStyles.textInput]}
                value={categoryDetails}
                onChangeText={(text) => {
                  const cleanText = text.replace(/[^a-zA-Z0-9\s.,!?]/g, '');
                  setCategoryDetails(cleanText);
                }}
              />
            </View>
            {validationErrors.categoryDetails && (
              <Text style={styles.errorText}>{validationErrors.categoryDetails}</Text>
            )}
          </View>
        )}

        {supportCategory === 'Other' && (
          <View style={[styles.otherInfoAlert, isDesktop && desktopStyles.otherInfoAlert]}>
            <View style={[styles.otherInfoIcon, isDesktop && desktopStyles.iconCircle]}>
              <Ionicons name="information-circle" size={isDesktop ? 16 : 20} color="#ff6a00" />
            </View>
            <Text style={[styles.otherInfoText, isDesktop && desktopStyles.helperText]}>
              Please specify your issue by selecting "Other" and entering details.
            </Text>
          </View>
        )}
      </View>

      {/* Subject */}
      <View style={[styles.fieldContainer, isDesktop && desktopStyles.fieldContainer, { marginTop: 0 }]}>
        <Text style={[styles.label, isDesktop && desktopStyles.label]}>
          Subject <Text style={styles.required}>*</Text>
        </Text>
        <View style={[
          styles.inputBox,
          isDesktop && desktopStyles.inputBox,
          validationErrors.subject && styles.inputBoxError
        ]}>
          <View style={[styles.iconCircle, isDesktop && desktopStyles.iconCircle]}>
            <Feather name="edit-2" size={isDesktop ? 16 : 20} color="#ff6a00" />
          </View>
          <TextInput
            placeholder="Enter subject"
            placeholderTextColor="#8A94A6"
            style={[styles.textInput, isDesktop && desktopStyles.textInput]}
            value={subject}
            onChangeText={setSubject}
          />
        </View>
        {validationErrors.subject && (
          <Text style={styles.errorText}>{validationErrors.subject}</Text>
        )}
      </View>

      {/* Order ID */}
      <View style={[styles.fieldContainer, isDesktop && desktopStyles.fieldContainer]}>
        <Text style={[styles.label, isDesktop && desktopStyles.label]}>Order ID (Optional)</Text>
        <View style={[styles.inputBox, isDesktop && desktopStyles.inputBox]}>
          <View style={[styles.iconCircle, isDesktop && desktopStyles.iconCircle]}>
            <Feather name="box" size={isDesktop ? 16 : 20} color="#ff6a00" />
          </View>
          <TextInput
            placeholder="Enter Order ID"
            placeholderTextColor="#8A94A6"
            style={[styles.textInput, isDesktop && desktopStyles.textInput]}
          />
        </View>
        <Text style={[styles.helperText, isDesktop && desktopStyles.helperText]}>
          Enter an Order ID if your concern is related to a specific order.
        </Text>
      </View>

      {/* Description */}
      <View style={[styles.fieldContainer, isDesktop && desktopStyles.fieldContainer, { marginBottom: 24 }]}>
        <Text style={[styles.label, isDesktop && desktopStyles.label]}>
          Description <Text style={styles.required}>*</Text>
        </Text>
        <View style={[
          styles.descriptionBox,
          isDesktop && desktopStyles.descriptionBox,
          validationErrors.description && styles.descriptionBoxError
        ]}>
          <View style={styles.descriptionTop}>
            <View style={[styles.iconCircle, isDesktop && desktopStyles.iconCircle]}>
              <MaterialCommunityIcons name="message-outline" size={isDesktop ? 18 : 22} color="#ff6a00" />
            </View>
            <TextInput
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your issue in detail..."
              placeholderTextColor="#8A94A6"
              style={[styles.descriptionInput, isDesktop && desktopStyles.descriptionInput]}
            />
          </View>
          <Text style={[styles.counter, isDesktop && desktopStyles.counter]}>{description.length}/500</Text>
        </View>
        {validationErrors.description && (
          <Text style={styles.errorText}>{validationErrors.description}</Text>
        )}
      </View>

      {/* Upload */}
      <View style={[styles.fieldContainer, isDesktop && desktopStyles.fieldContainer]}>
        <Text style={[styles.label, isDesktop && desktopStyles.label]}>
          Upload Attachments (Optional)
        </Text>
        <TouchableOpacity
          style={[styles.uploadBox, isDesktop && desktopStyles.uploadBox]}
          onPress={() => setShowPremiumUploadModal(true)}
        >
          <MaterialCommunityIcons name="cloud-upload-outline" size={isDesktop ? 28 : 34} color="#ff6a00" />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.uploadTitle, isDesktop && desktopStyles.uploadTitle]}>Upload Images</Text>
            <Text style={[styles.uploadSubText, isDesktop && desktopStyles.uploadSubText]}>JPG, PNG up to 5MB</Text>
          </View>
        </TouchableOpacity>

        {selectedImages.length > 0 && (
          <View style={styles.imagePreviewContainer}>
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.imageCard}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                  <Ionicons name="close" size={16} color="#001F6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* What Happens Next */}
      <View style={[styles.infoCard, isDesktop && desktopStyles.infoCard]}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={isDesktop ? 20 : 24} color="#ff6a00" />
          <Text style={[styles.infoTitle, isDesktop && desktopStyles.infoTitle]}>What happens next?</Text>
        </View>
        {[
          'Our support team will review your ticket.',
          'We\'ll respond within 24–48 working hours.',
          'You can track your ticket in My Tickets.',
        ].map((text, i) => (
          <View key={i} style={styles.infoRow}>
            <Ionicons name="checkmark" size={isDesktop ? 16 : 20} color="#ff6a00" />
            <Text style={[styles.infoText, isDesktop && desktopStyles.infoText]}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.submitButton,
          isDesktop && desktopStyles.submitButton,
          isSubmitting && styles.submitButtonDisabled
        ]}
        onPress={handleSubmitTicket}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={[styles.submitText, isDesktop && desktopStyles.submitText]}>Submitting...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={isDesktop ? 20 : 24} color="#fff" />
            <Text style={[styles.submitText, isDesktop && desktopStyles.submitText]}>Submit Ticket</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.bottomTextContainer}>
        <Ionicons name="shield-checkmark-outline" size={isDesktop ? 16 : 20} color="#001A72" />
        <Text style={[styles.bottomText, isDesktop && desktopStyles.bottomText]}>
          Your information is safe with us.
        </Text>
      </View>
    </>
  );

  // ─── DESKTOP LAYOUT ──────────────────────────────────────────────────────────

  if (isDesktop) {
    return (
      <View style={desktopStyles.pageWrapper}>
        {/* Desktop Header Banner */}
        <View style={desktopStyles.desktopHeader}>
          <TouchableOpacity style={desktopStyles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={desktopStyles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={desktopStyles.headerCenter}>
            <Text style={desktopStyles.headerTitle}>Raise a Support Ticket</Text>
            <Text style={desktopStyles.headerSubtitle}>We're here to help you. Please fill in the details below.</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>

        {/* Desktop Body */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={desktopStyles.scrollContent}
        >
          <View style={desktopStyles.desktopGrid}>
            {/* Left Column — Main Form */}
            <View style={desktopStyles.desktopMainCard}>
              {renderFormContent()}
            </View>

            {/* Right Column — Sidebar */}
            <View style={desktopStyles.desktopSidebar}>
              {/* Quick Tips */}
              <View style={desktopStyles.sidebarCard}>
                <View style={desktopStyles.sidebarCardHeader}>
                  <Ionicons name="bulb-outline" size={20} color="#ff6a00" />
                  <Text style={desktopStyles.sidebarCardTitle}>Quick Tips</Text>
                </View>
                {[
                  { icon: 'check-circle', text: 'Be specific about your issue for faster resolution.' },
                  { icon: 'check-circle', text: 'Attach screenshots to help our team understand.' },
                  { icon: 'check-circle', text: 'Include your Order ID for order-related issues.' },
                ].map((tip, i) => (
                  <View key={i} style={desktopStyles.tipRow}>
                    <Feather name={tip.icon} size={14} color="#ff6a00" />
                    <Text style={desktopStyles.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>

              {/* Response Time */}
              <View style={desktopStyles.sidebarCard}>
                <View style={desktopStyles.sidebarCardHeader}>
                  <Ionicons name="time-outline" size={20} color="#ff6a00" />
                  <Text style={desktopStyles.sidebarCardTitle}>Response Times</Text>
                </View>
                {[
                  { label: 'Order Issues', time: '< 4 hrs', color: '#4ECDC4' },
                  { label: 'Payment', time: '< 8 hrs', color: '#45B7D1' },
                  { label: 'Technical', time: '< 24 hrs', color: '#96CEB4' },
                  { label: 'Other', time: '24–48 hrs', color: '#DDA0DD' },
                ].map((item, i) => (
                  <View key={i} style={desktopStyles.responseRow}>
                    <View style={[desktopStyles.responseDot, { backgroundColor: item.color }]} />
                    <Text style={desktopStyles.responseLabel}>{item.label}</Text>
                    <Text style={desktopStyles.responseTime}>{item.time}</Text>
                  </View>
                ))}
              </View>

              {/* Contact Alternative */}
              <View style={[desktopStyles.sidebarCard, desktopStyles.contactCard]}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                <Text style={desktopStyles.contactTitle}>Need instant help?</Text>
                <Text style={desktopStyles.contactSubtitle}>Chat with us directly for urgent issues.</Text>
                <TouchableOpacity style={desktopStyles.contactButton} onPress={() => { if (Platform.OS === 'web') { (window as any).open('https://wa.me/', '_blank'); } }}>
                  <Text style={desktopStyles.contactButtonText}>Start Live Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Desktop Success Toast */}
        {desktopToastVisible && (
          <Animated.View
            style={[
              desktopStyles.successToast,
              Platform.OS === 'web' && ({ position: 'fixed', bottom: 36, right: 36 } as any),
              { transform: [{ translateX: desktopToastAnim }] }
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={desktopStyles.successToastText}>
              Your ticket has been submitted successfully!
            </Text>
          </Animated.View>
        )}

        {/* Upload Modal */}
        <Modal
          visible={showPremiumUploadModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPremiumUploadModal(false)}
        >
          <View style={styles.premiumModalOverlay}>
            <View style={[styles.premiumModalCard, desktopStyles.premiumModalCard]}>
              <TouchableOpacity style={styles.premiumCloseButton} onPress={() => setShowPremiumUploadModal(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={[styles.premiumHeading, desktopStyles.modalHeading]}>Upload Images</Text>
              <Text style={[styles.premiumSubtitle, desktopStyles.modalSubtitle]}>Choose an option</Text>
              <View style={styles.premiumButtonContainer}>
                <TouchableOpacity style={[styles.premiumButton, desktopStyles.premiumButton]} onPress={startDesktopCamera}>
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={[styles.premiumButtonText, desktopStyles.premiumButtonText]}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.premiumButton, desktopStyles.premiumButton]} onPress={handleDesktopFileUpload}>
                  <Ionicons name="images" size={20} color="#FFFFFF" />
                  <Text style={[styles.premiumButtonText, desktopStyles.premiumButtonText]}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Desktop Live Camera Modal */}
        <Modal
          visible={showCameraModal}
          transparent={true}
          animationType="fade"
          onRequestClose={stopDesktopCamera}
        >
          <View style={desktopStyles.cameraModalOverlay}>
            <View style={desktopStyles.cameraModalCard}>
              {/* Header */}
              <View style={desktopStyles.cameraModalHeader}>
                <Text style={desktopStyles.cameraModalTitle}>Take a Photo</Text>
                <TouchableOpacity style={desktopStyles.cameraCloseBtn} onPress={stopDesktopCamera}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Video preview */}
              <View style={desktopStyles.videoWrapper}>
                {Platform.OS === 'web' && (
                  // @ts-ignore
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                  />
                )}
              </View>

              {/* Capture button */}
              <View style={desktopStyles.cameraActions}>
                <TouchableOpacity style={desktopStyles.captureBtn} onPress={captureDesktopPhoto}>
                  <View style={desktopStyles.captureBtnInner} />
                </TouchableOpacity>
              </View>
              <Text style={desktopStyles.cameraHint}>Click the button to capture</Text>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── MOBILE LAYOUT (unchanged) ───────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={34} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raise a Ticket</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1} adjustsFontSizeToFit={true}>
          We're here to help you. Please fill in the details.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!showCategoryDropdown}
      >
        {/* Support Category */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Support Category <Text style={styles.required}>*</Text>
          </Text>

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
                <Text style={supportCategory ? styles.customDropdownText : styles.customDropdownPlaceholder}>
                  {supportCategory || 'Select Support Category'}
                </Text>
              </View>
              <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={24} color="#6B7280" />
            </TouchableOpacity>

            {showCategoryDropdown && (
              <View style={styles.customDropdownCard}>
                {supportCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.customDropdownOption}
                    onPress={() => {
                      setSupportCategory(category.name);
                      if (category.name !== 'Other') setCategoryDetails('');
                      setShowCategoryDropdown(false);
                      setValidationErrors(prev => ({ ...prev, supportCategory: '', categoryDetails: '' }));
                    }}
                  >
                    <View style={[styles.customOptionIcon, { backgroundColor: category.color }]}>
                      <Feather name={category.icon} size={28} color="#fff" />
                    </View>
                    <Text style={styles.customOptionText}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {validationErrors.supportCategory && (
            <Text style={styles.errorText}>{validationErrors.supportCategory}</Text>
          )}

          {supportCategory === 'Other' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Category Details <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputBox, validationErrors.categoryDetails && styles.inputBoxError]}>
                <View style={styles.iconCircle}>
                  <Feather name="edit-2" size={20} color="#ff6a00" />
                </View>
                <TextInput
                  placeholder="Enter details"
                  placeholderTextColor="#8A94A6"
                  style={styles.textInput}
                  value={categoryDetails}
                  onChangeText={(text) => {
                    const cleanText = text.replace(/[^a-zA-Z0-9\s.,!?]/g, '');
                    setCategoryDetails(cleanText);
                  }}
                />
              </View>
              {validationErrors.categoryDetails && (
                <Text style={styles.errorText}>{validationErrors.categoryDetails}</Text>
              )}
            </View>
          )}

          {supportCategory === 'Other' && (
            <View style={styles.otherInfoAlert}>
              <View style={styles.otherInfoIcon}>
                <Ionicons name="information-circle" size={20} color="#ff6a00" />
              </View>
              <Text style={styles.otherInfoText}>
                Please specify your issue by selecting "Other" and entering details.
              </Text>
            </View>
          )}
        </View>

        {/* Subject */}
        <View style={[styles.fieldContainer, { marginTop: 0 }]}>
          <Text style={styles.label}>Subject <Text style={styles.required}>*</Text></Text>
          <View style={[styles.inputBox, validationErrors.subject && styles.inputBoxError]}>
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
          {validationErrors.subject && <Text style={styles.errorText}>{validationErrors.subject}</Text>}
        </View>

        {/* Order ID */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Order ID (Optional)</Text>
          <View style={styles.inputBox}>
            <View style={styles.iconCircle}>
              <Feather name="box" size={20} color="#ff6a00" />
            </View>
            <TextInput placeholder="Enter Order ID" placeholderTextColor="#8A94A6" style={styles.textInput} />
          </View>
          <Text style={styles.helperText}>Enter an Order ID if your concern is related to a specific order.</Text>
        </View>

        {/* Description */}
        <View style={[styles.fieldContainer, { marginBottom: 24 }]}>
          <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
          <View style={[styles.descriptionBox, validationErrors.description && styles.descriptionBoxError]}>
            <View style={styles.descriptionTop}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="message-outline" size={22} color="#ff6a00" />
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
            <Text style={styles.counter}>{description.length}/500</Text>
          </View>
          {validationErrors.description && <Text style={styles.errorText}>{validationErrors.description}</Text>}
        </View>

        {/* Upload */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Upload Attachments (Optional)</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => setShowPremiumUploadModal(true)}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={34} color="#ff6a00" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.uploadTitle}>Upload Images</Text>
              <Text style={styles.uploadSubText}>JPG, PNG up to 5MB</Text>
            </View>
          </TouchableOpacity>
          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageCard}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
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
            <Ionicons name="information-circle" size={24} color="#ff6a00" />
            <Text style={styles.infoTitle}>What happens next?</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark" size={20} color="#ff6a00" />
            <Text style={styles.infoText}>Our support team will review your ticket.</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark" size={20} color="#ff6a00" />
            <Text style={styles.infoText}>We'll respond within 24–48 working hours.</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark" size={20} color="#ff6a00" />
            <Text style={styles.infoText}>You can track your ticket in My Tickets.</Text>
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
              <Text style={styles.submitText}>Submitting...</Text>
            </View>
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={24} color="#fff" />
              <Text style={styles.submitText}>Submit Ticket</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomTextContainer}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#001A72" />
          <Text style={styles.bottomText}>Your information is safe with us.</Text>
        </View>
      </ScrollView>

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
            <Text style={styles.premiumHeading}>Upload Images</Text>
            <Text style={styles.premiumSubtitle}>Choose an option</Text>
            <View style={styles.premiumButtonContainer}>
              <TouchableOpacity style={styles.premiumButton} onPress={handleCameraUpload}>
                <Ionicons name="camera" size={24} color="#FFFFFF" />
                <Text style={styles.premiumButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.premiumButton} onPress={handleImageUpload}>
                <Ionicons name="images" size={24} color="#FFFFFF" />
                <Text style={styles.premiumButtonText}>Gallery</Text>
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
                <Text style={styles.modalTitle}>Upload Image</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowUploadModal(false)}>
                  <Ionicons name="close" size={24} color="#001C58" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalOptions}>
                <TouchableOpacity style={styles.optionButton} onPress={handleImageUpload}>
                  <Ionicons name="images" size={24} color="#001A72" />
                  <Text style={styles.optionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default RaiseTicketScreen;

// ─── MOBILE STYLES (original — untouched) ────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { height: 190, paddingHorizontal: 24, paddingTop: 20, backgroundColor: "#001A72" },
  backButton: { width: 40, marginTop: 56 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", alignSelf: "center", marginTop: -36 },
  headerSubtitle: { fontSize: 16, color: "#FFFFFF", textAlign: "center", marginTop: 10, fontWeight: "500" },
  scrollContent: { padding: 22, paddingBottom: 40 },
  fieldContainer: { marginBottom: 24, position: 'relative' },
  label: { fontSize: 17, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  required: { color: "#FF3B30" },
  inputBox: { height: 72, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, backgroundColor: "#FFFFFF" },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFE5CC", justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 18, color: "#111827", marginLeft: 14 },
  textInput: { flex: 1, marginLeft: 14, fontSize: 18, color: "#111827" },
  helperText: { marginTop: 10, color: "#6B7280", fontSize: 15, lineHeight: 22 },
  descriptionBox: { minHeight: 210, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, backgroundColor: "#FFFFFF", padding: 14 },
  descriptionTop: { flexDirection: "row", alignItems: "flex-start" },
  descriptionInput: { flex: 1, marginLeft: 14, fontSize: 18, color: "#111827", minHeight: 130, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", color: "#6B7280", fontSize: 15, marginTop: 10 },
  uploadBox: { height: 120, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D1D5DB", borderRadius: 18, justifyContent: "center", alignItems: "center", flexDirection: "row", backgroundColor: "#FFFFFF" },
  uploadTitle: { fontSize: 22, fontWeight: "700", color: "#ff6a00" },
  uploadSubText: { fontSize: 16, color: "#6B7280", marginTop: 4 },
  infoCard: { backgroundColor: "#F5F8FF", borderRadius: 20, padding: 20, marginBottom: 28 },
  infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  infoTitle: { fontSize: 22, fontWeight: "700", color: "#001A72", marginLeft: 10 },
  infoRow: { flexDirection: "row", marginBottom: 12, alignItems: "center" },
  infoText: { fontSize: 17, color: "#111827", marginLeft: 12, flex: 1, lineHeight: 24 },
  submitButton: { height: 72, borderRadius: 18, justifyContent: "center", alignItems: "center", flexDirection: "row", backgroundColor: "#001A72" },
  submitText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginLeft: 12 },
  bottomTextContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  bottomText: { fontSize: 16, color: "#8A94A6", marginLeft: 8 },
  imagePreviewContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 8 },
  imageCard: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", position: "relative" },
  previewImage: { width: "100%", height: "100%", borderRadius: 8 },
  removeImageButton: { position: "absolute", top: 4, right: 4, backgroundColor: "#D9E3FF", borderRadius: 10, padding: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContainer: { width: "100%", height: "40%", justifyContent: "flex-end", alignItems: "center" },
  modalContent: { width: "100%", height: "100%", backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16 },
  dragIndicator: { width: 40, height: 4, backgroundColor: "#E0E0E0", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#001C58" },
  closeBtn: { padding: 4 },
  modalOptions: { paddingHorizontal: 20 },
  optionButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, marginBottom: 12 },
  optionText: { fontSize: 16, color: "#001A72", marginLeft: 12, fontWeight: "500" },
  inputText: { fontSize: 18, color: "#111827", marginLeft: 14, flex: 1 },
  errorText: { fontSize: 14, color: "#FF4D4F", marginTop: 6 },
  submitButtonDisabled: { backgroundColor: "#A0A0A0" },
  loadingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  loadingSpinner: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#fff", borderTopColor: "transparent", marginRight: 8 },
  dropdownWrapper: { position: 'relative', zIndex: 1000 },
  customDropdownTrigger: { height: 72, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, backgroundColor: "#FFFFFF", marginBottom: 20 },
  customDropdownTriggerActive: { borderColor: "#001A72", borderWidth: 2 },
  customDropdownContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  customDropdownIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFE5CC", justifyContent: "center", alignItems: "center" },
  customDropdownText: { fontSize: 18, color: "#111827", marginLeft: 14, flex: 1 },
  customDropdownPlaceholder: { fontSize: 18, color: "#8A94A6", marginLeft: 14, flex: 1 },
  customDropdownCard: { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#FFFFFF", borderRadius: 24, marginTop: -4, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, zIndex: 1000, paddingVertical: 12 },
  customDropdownOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  customOptionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center", marginRight: 16 },
  customOptionText: { fontSize: 18, color: "#1A1A1A", fontWeight: "500" },
  otherHelperText: { fontSize: 16, color: "#FFFFFF", textAlign: "center", marginTop: 12, fontWeight: "500" },
  otherInfoAlert: { backgroundColor: "#EEF2FF", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 14, marginTop: 0, flexDirection: "row", alignItems: "center", width: "100%" },
  otherInfoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFE5CC", justifyContent: "center", alignItems: "center", marginRight: 12 },
  otherInfoText: { fontSize: 14, color: "#344054", flex: 1, lineHeight: 20 },
  otherDetailsBox: { height: 72, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, backgroundColor: "#FFFFFF" },
  otherDetailsBoxActive: { borderColor: "#001A72", borderWidth: 3, shadowColor: "#001A72", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  otherDetailsTop: { flexDirection: "row", alignItems: "flex-start", flex: 1, padding: 16 },
  otherDetailsInput: { flex: 1, fontSize: 18, color: "#111827", marginLeft: 14, textAlignVertical: "top", minHeight: 200 },
  premiumModalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "center", alignItems: "center" },
  premiumModalCard: { width: "85%", backgroundColor: "#FFFFFF", borderRadius: 28, shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10, padding: 32, alignItems: "center" },
  premiumCloseButton: { position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFE5CC", justifyContent: "center", alignItems: "center" },
  premiumHeading: { fontSize: 28, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 8, fontFamily: "serif" },
  premiumSubtitle: { fontSize: 16, fontStyle: "italic", color: "#6B7280", textAlign: "center", marginBottom: 32, fontFamily: "serif" },
  premiumButtonContainer: { flexDirection: "row", width: "100%", justifyContent: "space-between", gap: 16 },
  premiumButton: { flex: 1, backgroundColor: "#001F6B", borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 20, shadowColor: "#001F6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  premiumButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", marginLeft: 12, fontFamily: "serif" },
  inputBoxError: { height: 72, borderWidth: 1, borderColor: "#FF4D4F", borderRadius: 18, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  customDropdownTriggerError: { height: 72, borderWidth: 1, borderColor: "#FF4D4F", borderRadius: 18, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, justifyContent: "space-between" },
  otherDetailsBoxError: { height: 72, borderWidth: 1, borderColor: "#FF4D4F", borderRadius: 18, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "flex-start", padding: 16 },
  descriptionBoxError: { borderColor: "#FF4D4F" },
});

// ─── DESKTOP-ONLY STYLES ─────────────────────────────────────────────────────

const desktopStyles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    backgroundColor: "#F0F4FA",
  },

  // Header
  desktopHeader: {
    height: 100,
    backgroundColor: "#001A72",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 48,
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },

  // Scroll + Grid
  scrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  desktopGrid: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 1200,
    gap: 28,
    alignItems: "flex-start",
  },

  // Main form card
  desktopMainCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 36,
    shadowColor: "#001A72",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
    overflow: "visible",
  },

  // Sidebar
  desktopSidebar: {
    width: 300,
    gap: 20,
  },
  sidebarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#001A72",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sidebarCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sidebarCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#001A72",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    flex: 1,
  },
  responseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  responseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  responseLabel: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
  responseTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#001A72",
  },

  // Contact card
  contactCard: {
    backgroundColor: "#001A72",
    alignItems: "center",
    gap: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
  },
  contactSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  contactButton: {
    marginTop: 8,
    backgroundColor: "#ff6a00",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Form field overrides for desktop
  fieldContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  inputBox: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 0,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFE5CC",
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#111827",
  },
  inputText: {
    fontSize: 14,
    color: "#111827",
    marginLeft: 10,
    flex: 1,
  },
  helperText: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
  },
  descriptionBox: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  descriptionInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#111827",
    minHeight: 100,
    textAlignVertical: "top",
  },
  counter: {
    alignSelf: "flex-end",
    color: "#6B7280",
    fontSize: 12,
    marginTop: 6,
  },
  uploadBox: {
    height: 90,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ff6a00",
  },
  uploadSubText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: "#F5F8FF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#001A72",
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#111827",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#001A72",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
  bottomText: {
    fontSize: 13,
    color: "#8A94A6",
    marginLeft: 6,
  },

  // Dropdown overrides for desktop
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownCard: {
    position: "relative",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 1000,
    paddingVertical: 6,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  otherInfoAlert: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  // Modal overrides
  premiumModalCard: {
    width: 400,
    padding: 36,
  },
  modalHeading: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  premiumButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  premiumButtonText: {
    fontSize: 14,
  },

  // Desktop success toast
  successToast: {
    position: "absolute",
    bottom: 36,
    right: 36,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
    maxWidth: 420,
  },
  successToastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },

  // Desktop live camera modal
  cameraModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraModalCard: {
    width: 560,
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  cameraModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#001A72",
  },
  cameraModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  cameraCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoWrapper: {
    width: "100%",
    height: 340,
    backgroundColor: "#000",
  },
  cameraActions: {
    alignItems: "center",
    paddingVertical: 20,
  },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  captureBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
  },
  cameraHint: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    paddingBottom: 16,
  },
});