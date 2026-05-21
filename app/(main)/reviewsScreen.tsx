import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const initialReviews = [
  {
    id: "1",
    product: "Leather Handbag",
    rating: 4,
    comment: "Amazing quality! Loved the stitching and design.",
    customer: "Ananya Sharma",
    date: "12 Aug 2026",
    reply: "",
  },
  {
    id: "2",
    product: "Canvas Tote Bag",
    rating: 5,
    comment: "Perfect for daily use. Highly recommend!",
    customer: "Riya Patel",
    date: "10 Aug 2026",
    reply: "",
  },
  {
    id: "3",
    product: "Mini Sling Bag",
    rating: 3,
    comment: "Good but size is smaller than expected.",
    customer: "Sneha Reddy",
    date: "08 Aug 2026",
    reply: "",
  },
];

const ReviewsScreen = () => {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [replyVisible, setReplyVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  // 🔥 Toast
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

  const handleSendReply = () => {
    const updatedReviews = reviews.map((rev) => {
      if (rev.id === selectedReview.id) {
        return { ...rev, reply: replyText };
      }
      return rev;
    });

    setReviews(updatedReviews);
    setReplyVisible(false);
    setReplyText("");

    triggerToast(); // ✅ Modern toast instead of alert
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.product}>{item.product}</Text>

      <View style={styles.row}>{renderStars(item.rating)}</View>

      <Text style={styles.comment}>{item.comment}</Text>

      {/* Reply */}
      {item.reply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>Your Reply</Text>
          <Text style={styles.replyContent}>{item.reply}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View>
          <Text style={styles.customer}>{item.customer}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>

        <TouchableOpacity
          style={styles.replyBtn}
          onPress={() => {
            setSelectedReview(item);
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
    <View style={styles.container}>
      {/* 🔥 Toast */}
      {showToast && (
        <Animated.View
          style={[
            styles.toast,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.toastText}>Reply sent successfully</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Customer Reviews</Text>
        <Text style={styles.subtitle}>
          See what your customers are saying 💬
        </Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Modal */}
      <Modal transparent visible={replyVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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

            <View style={styles.modalActions}>
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
    </View>
  );
};

export default ReviewsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    paddingHorizontal: 16,
  },

  header: {
    marginTop: 60,
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#666",
    marginTop: 5,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    elevation: 4,
  },

  product: {
    fontSize: 16,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    marginVertical: 6,
  },

  comment: {
    color: "#444",
    marginBottom: 10,
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

  replyText: {
    color: "#fff",
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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

  // 🔥 Toast styles
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

  toastText: {
    color: "#fff",
    marginLeft: 10,
    fontWeight: "600",
  },
});
