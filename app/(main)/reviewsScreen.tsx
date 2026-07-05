import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components/common/AppHeader";
import { useResponsive } from "@/hooks/useResponsive";
import { fetchProductReviews, replyToReview } from "@/services/reviewApi";

const initialReviews: {
  id: string;
  product: string;
  rating: number;
  comment: string;
  customer: string;
  date: string;
  reply: string;
}[] = [];

const ReviewsScreen = () => {
  const { isWeb, isMobile } = useResponsive();
  const isWebMobile = isWeb && isMobile;
  const ScreenRoot = Platform.OS === "web" ? View : SafeAreaView;
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductReviews()
      .then((rows) => {
        setReviews(rows.map((r) => ({
          id: String(r.id),
          product: r.productName,
          rating: r.rating,
          comment: r.description,
          customer: r.customerName,
          date: r.date,
          reply: r.sellerReply || "",
        })));
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);
  const [replyVisible, setReplyVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const triggerToast = () => {
    setShowToast(true);

    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowToast(false));
    }, 2000);
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? "star" : "star-outline"}
        size={16}
        color="#ff7a00"
      />
    ));
  };

  const handleSendReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    try {
      const updated = await replyToReview(Number(selectedReview.id), replyText.trim());
      setReviews((prev) =>
        prev.map((rev) =>
          rev.id === selectedReview.id
            ? { ...rev, reply: updated.sellerReply || replyText.trim() }
            : rev
        )
      );
      setReplyVisible(false);
      setReplyText("");
      triggerToast();
    } catch {
      Alert.alert("Error", "Failed to send reply. Please try again.");
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={[styles.card, isWebMobile && styles.cardWebMobile]}>
      <Text style={[styles.product, isWebMobile && styles.productWebMobile]} numberOfLines={2}>
        {item.product}
      </Text>

      <View style={styles.row}>{renderStars(item.rating)}</View>

      <Text style={[styles.comment, isWebMobile && styles.commentWebMobile]}>{item.comment}</Text>

      {item.reply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>Your Reply</Text>
          <Text style={styles.replyContent}>{item.reply}</Text>
        </View>
      ) : null}

      <View style={[styles.footer, isWebMobile && styles.footerWebMobile]}>
        <View style={isWebMobile && styles.footerMetaWebMobile}>
          <Text style={styles.customer} numberOfLines={1}>{item.customer}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>

        <TouchableOpacity
          style={[styles.replyBtn, isWebMobile && styles.replyBtnWebMobile]}
          onPress={() => {
            setSelectedReview(item);
            setReplyText(item.reply || "");
            setReplyVisible(true);
          }}
        >
          <Text style={styles.replyText}>
            {item.reply ? "Edit" : "Reply"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenRoot style={[styles.container, isWeb && styles.containerWeb]}>
      {showToast && (
        <Animated.View
          style={[
            styles.toast,
            isWebMobile && styles.toastWebMobile,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.toastText}>Reply sent successfully</Text>
        </Animated.View>
      )}

      {Platform.OS !== "web" && (
        <AppHeader title="Customer Reviews" subtitle="See what your customers are saying 💬" showBackButton />
      )}

      {isWebMobile && (
        <View style={styles.webMobileIntro}>
          <Text style={styles.webMobileTitle}>Customer Reviews</Text>
          <Text style={styles.webMobileSubtitle} numberOfLines={2}>
            See what your customers are saying
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#ff7a00" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={isWebMobile}
          contentContainerStyle={[
            styles.listContent,
            isWebMobile && styles.listContentWebMobile,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          }
        />
      )}

      <Modal transparent visible={replyVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
            <Text style={styles.modalTitle}>Reply to Review</Text>

            {selectedReview && (
              <>
                <Text style={styles.customerName}>
                  {selectedReview.customer}
                </Text>
                <Text style={styles.reviewText}>
                  &quot;{selectedReview.comment}&quot;
                </Text>
              </>
            )}

            <TextInput
              placeholder="Write your reply..."
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />

            <View style={[styles.modalActions, isWebMobile && styles.modalActionsWebMobile]}>
              <TouchableOpacity
                onPress={() => {
                  setReplyVisible(false);
                  setReplyText("");
                }}
              >
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSendReply}
              >
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenRoot>
  );
};

export default ReviewsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    paddingHorizontal: 16,
  },
  containerWeb: {
    width: "100%",
    minWidth: 0,
  },
  webMobileIntro: {
    marginBottom: 12,
    paddingTop: 4,
  },
  webMobileTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  webMobileSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentWebMobile: {
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 48,
    gap: 8,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      },
    }),
  },
  cardWebMobile: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  product: {
    fontSize: 16,
    fontWeight: "bold",
  },
  productWebMobile: {
    fontSize: 14,
  },

  row: {
    flexDirection: "row",
    marginVertical: 6,
  },

  comment: {
    color: "#444",
    marginBottom: 10,
  },
  commentWebMobile: {
    fontSize: 13,
    lineHeight: 19,
  },

  replyBox: {
    backgroundColor: "#fff4ec",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  replyLabel: {
    fontSize: 12,
    color: "#ff7a00",
    fontWeight: "600",
  },

  replyContent: {
    color: "#444",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerWebMobile: {
    flexWrap: "wrap",
    gap: 8,
    alignItems: "flex-start",
  },
  footerMetaWebMobile: {
    flex: 1,
    minWidth: 0,
  },

  customer: {
    fontWeight: "600",
  },

  date: {
    fontSize: 12,
    color: "#888",
  },

  replyBtn: {
    backgroundColor: "#ff7a00",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  replyBtnWebMobile: {
    alignSelf: "flex-end",
  },

  replyText: {
    color: "#fff",
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    ...Platform.select({
      web: { alignItems: "center" },
    }),
  },

  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
  },
  modalContainerWeb: {
    maxWidth: 480,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      },
    }),
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  customerName: {
    fontWeight: "600",
  },

  reviewText: {
    color: "#555",
    marginBottom: 10,
  },

  replyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    alignItems: "center",
  },
  modalActionsWebMobile: {
    gap: 12,
  },

  cancel: {
    color: "#999",
  },

  sendBtn: {
    backgroundColor: "#ff7a00",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },

  sendText: {
    color: "#fff",
    fontWeight: "600",
  },

  toast: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    elevation: 6,
    zIndex: 999,
  },
  toastWebMobile: {
    top: 8,
    left: 0,
    right: 0,
  },

  toastText: {
    color: "#fff",
    marginLeft: 10,
    fontWeight: "600",
  },
});
