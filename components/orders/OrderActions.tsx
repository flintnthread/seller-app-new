import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import type { CourierPartner, Order, OrderStatus } from "../../features/orders/types";
import { C, NC } from "./orderConstants";
import { newStyles } from "../../styles/orderStyles";
import { Icon } from "../common/Icon";

interface PendingActionBarProps {
  order: Order;
  onOrderUpdate: (updated: Order) => void;
}

export const PendingActionBar: React.FC<PendingActionBarProps> = ({ order, onOrderUpdate }) => {
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setBusy(false);
    onOrderUpdate({ ...order, status: "confirmed", updatedAt: new Date().toISOString() });
  };

  const handleCancel = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setBusy(false);
    setConfirmCancel(false);
    onOrderUpdate({ ...order, status: "cancelled", updatedAt: new Date().toISOString() });
  };

  return (
    <>
      <View style={newStyles.actionBar}>
        <Text style={newStyles.actionBarLabel}>Awaiting your response</Text>
        <Text style={newStyles.actionBarSub}>Accept or decline this order</Text>
        <View style={newStyles.actionBtns}>
          <TouchableOpacity style={newStyles.cancelActionBtn} onPress={() => setConfirmCancel(true)} disabled={busy}>
            <Text style={newStyles.cancelActionBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={newStyles.acceptActionBtn} onPress={handleAccept} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={newStyles.acceptActionBtnText}>Accept Order</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <Modal visible={confirmCancel} transparent animationType="fade" onRequestClose={() => setConfirmCancel(false)}>
        <View style={newStyles.confirmOverlay}>
          <View style={newStyles.confirmSheet}>
            <View style={{ marginBottom: 16 }}>
              <Icon name="info-circle" size={40} color="#ef4444" strokeWidth={2} />
            </View>
            <Text style={newStyles.confirmTitle}>Decline this order?</Text>
            <Text style={newStyles.confirmSub}>This will cancel {order.id} for {order.customerName}. Cannot be undone.</Text>
            <View style={newStyles.confirmBtns}>
              <TouchableOpacity style={newStyles.confirmBtnSecondary} onPress={() => setConfirmCancel(false)}>
                <Text style={newStyles.confirmBtnSecondaryText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={newStyles.confirmBtnDanger} onPress={handleCancel} disabled={busy}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={newStyles.confirmBtnDangerText}>Yes, Decline</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

interface StatusUpdaterInlineProps {
  order: Order;
  onOrderUpdate: (updated: Order) => void;
}

const courierPartners: CourierPartner[] = ["Delhivery", "BlueDart", "DTDC", "Ekart", "Xpressbees", "Shiprocket"];

const SELLER_UPDATABLE_STATUSES: { status: OrderStatus; label: string; icon: string; color: string }[] = [
  { status: "processing", label: "Packing", icon: "package", color: C.processing },
  { status: "shipped", label: "Shipped / In Transit", icon: "truck", color: C.shipped },
  { status: "delivered", label: "Delivered", icon: "check-circle", color: NC.success },
];

export const StatusUpdaterInline: React.FC<StatusUpdaterInlineProps> = ({ order, onOrderUpdate }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [selectedCourier, setSelectedCourier] = useState<CourierPartner | "">("");
  const [trackingId, setTrackingId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSaving(false);
    setModalVisible(false);
    onOrderUpdate({ ...order, status: selectedStatus, updatedAt: new Date().toISOString() });
  };

  return (
    <>
      <TouchableOpacity style={[newStyles.updateStatusBtn, { marginTop: 14 }]} onPress={() => setModalVisible(true)}>
        <Text style={newStyles.updateStatusBtnText}>Update Order Status</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={newStyles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
        <View style={newStyles.panel}>
          <View style={newStyles.panelHandle} />
          <Text style={newStyles.panelTitle}>Update Order Status</Text>
          <Text style={newStyles.panelSubtitle}>{order.id} · {order.customerName}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={newStyles.updaterSectionLabel}>SELECT NEW STATUS</Text>
            {SELLER_UPDATABLE_STATUSES.map((option) => {
              const active = selectedStatus === option.status;
              return (
                <TouchableOpacity
                  key={option.status}
                  style={[newStyles.statusOption, active && { borderColor: option.color, backgroundColor: `${option.color}18` }]}
                  onPress={() => setSelectedStatus(option.status)}
                >
                  <Icon name={option.icon} size={20} color={active ? option.color : "#64748b"} />
                  <Text style={[newStyles.statusOptionLabel, active && { color: option.color, fontWeight: "700" }]}>{option.label}</Text>
                  {active && <Icon name="check" size={16} color={option.color} />}
                </TouchableOpacity>
              );
            })}

            {selectedStatus === "shipped" && (
              <>
                <Text style={[newStyles.updaterSectionLabel, { marginTop: 20 }]}>COURIER PARTNER</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {courierPartners.map((partner) => (
                    <TouchableOpacity
                      key={partner}
                      style={[newStyles.courierChip, selectedCourier === partner && newStyles.courierChipActive]}
                      onPress={() => setSelectedCourier(partner)}
                    >
                      <Text style={[newStyles.courierChipText, selectedCourier === partner && { color: "#B8935A" }]}>{partner}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={newStyles.updaterSectionLabel}>TRACKING ID (optional)</Text>
                <TextInput
                  style={newStyles.trackingInput}
                  placeholder="e.g. DL1234567890"
                  placeholderTextColor="#A89D95"
                  value={trackingId}
                  onChangeText={setTrackingId}
                  autoCapitalize="characters"
                />
              </>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>

          <View style={newStyles.panelActions}>
            <TouchableOpacity style={newStyles.panelBtnSecondary} onPress={() => setModalVisible(false)}>
              <Text style={newStyles.panelBtnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[newStyles.panelBtnPrimary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={newStyles.panelBtnPrimaryText}>Save Status</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};
