import { useState } from "react";

import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";

import * as ImagePicker from 'expo-image-picker';

import {
  AntDesign,
  Feather,
  Ionicons,

  MaterialIcons
} from "@expo/vector-icons";
import ProfileImageModal from "../../components/ProfileImageModal";




export default function SellerProfileScreen() {

  const [profileImage, setProfileImage] = useState('https://i.pravatar.cc/300');

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);



  const handleSelectCamera = async () => {

    try {

      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {

        Alert.alert('Permission denied', 'Camera permission is required to take photos.');

        setModalVisible(false);

        return;

      }

      const result = await ImagePicker.launchCameraAsync({

        mediaTypes: ImagePicker.MediaTypeOptions.Images,

        allowsEditing: true,

        aspect: [1, 1],

        quality: 1,

      });



      if (!result.canceled && result.assets && result.assets[0]) {

        setProfileImage(result.assets[0].uri);

      }

      setModalVisible(false);

    } catch (error) {

      console.error('Error picking image:', error);

      Alert.alert('Error', 'Failed to pick image. Please try again.');

      setModalVisible(false);

    }

  };



  const handleSelectGallery = async () => {

    try {

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {

        Alert.alert('Permission denied', 'Gallery permission is required to select photos.');

        setModalVisible(false);

        return;

      }

      const result = await ImagePicker.launchImageLibraryAsync({

        mediaTypes: ImagePicker.MediaTypeOptions.Images,

        allowsEditing: true,

        aspect: [1, 1],

        quality: 1,

      });



      if (!result.canceled && result.assets && result.assets[0]) {

        setProfileImage(result.assets[0].uri);

      }

      setModalVisible(false);

    } catch (error) {

      console.error('Error picking image:', error);

      Alert.alert('Error', 'Failed to pick image. Please try again.');

      setModalVisible(false);

    }

  };



  return (

    <View style={styles.container}>

      {/* HEADER */}

      {Platform.OS !== 'web' && (
      <View style={styles.header}>

        <Ionicons name="arrow-back" size={24} color="#000" />

        <AppText style={styles.headerTitle}>My Seller Profile</AppText>

        <View style={styles.placeholder} />

      </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* PROFILE CARD */}

        <View style={styles.profileCard}>

          <View style={styles.profileTop}>

            <View style={styles.imageContainer}>

              <TouchableOpacity onPress={() => setModalVisible(true)}>

                <Image

                  source={{

                    uri: profileImage,

                  }}

                  style={styles.profileImage}

                />

                <View style={styles.cameraOverlay}>

                  <Feather name="camera" size={20} color="#fff" />

                </View>

              </TouchableOpacity>

            </View>



            <View style={{ flex: 1 }}>

              <View style={styles.nameRow}>

                <AppText style={styles.name}>Priya Sharma</AppText>



                <View style={styles.badge}>

                  <Ionicons name="star" size={16} color="#c28b00" />

                  <AppText style={styles.badgeText}>Gold Seller</AppText>

                </View>

              </View>



              <View style={styles.infoRow}>

                <Feather name="phone" size={16} color="#666" />

                <AppText style={styles.infoText}>+91 98765 43210</AppText>

              </View>



              <View style={styles.infoRow}>

                <MaterialIcons name="credit-card" size={16} color="#666" />

                <AppText style={styles.infoText}>

                  Seller ID: SEL12345

                </AppText>

              </View>



              <View style={styles.infoRow}>

                <MaterialIcons name="email" size={16} color="#666" />

                <AppText style={styles.infoText}>

                  priyasharma@gmail.com

                </AppText>

              </View>

            </View>

          </View>



          <TouchableOpacity style={styles.editBtn}>

            <View style={styles.editBtnHighlight}>

              <Ionicons name="create-outline" size={20} color="#FF6B35" />

              <AppText style={styles.editBtnText}>Edit Seller Profile</AppText>

            </View>

          </TouchableOpacity>

        </View>



        {/* TOP MENU */}

        <View style={styles.card}>

          <View>

            <AppText style={styles.sellerHubTitle}>Seller Hub</AppText>

            <View style={styles.sellerHubUnderline} />

          </View>

          <ListItem

            icon="shopping-bag"

            color="#ff4d79"

            title="My Store"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="box"

            color="#4caf50"

            title="Products"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="shopping-cart"

            color="#2196f3"

            title="Orders"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="bar-chart-2"

            color="#4caf50"

            title="Earnings"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="credit-card"

            color="#9c27b0"

            title="Payouts"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />

        </View>



        {/* STORE MANAGEMENT */}

        <SectionTitle title="Store Management" />



        <View style={styles.card}>

          <ListItem

            icon="grid"

            color="#2196f3"

            title="Store Dashboard"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="box"

            color="#4caf50"

            title="Manage Products"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="shopping-cart"

            color="#2196f3"

            title="Orders Management"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />





          <ListItem

            icon="bar-chart-2"

            color="#9c27b0"

            title="Store Analytics"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="settings"

            color="#666"

            title="Store Settings"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />

        </View>



        {/* EARNINGS */}

        <SectionTitle title="Earnings & Finance" />



        <View style={styles.card}>

          <ListItem

            icon="dollar-sign"

            color="#4caf50"

            title="Earnings Overview"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="credit-card"

            color="#9c27b0"

            title="Payouts & Withdrawals"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="file-text"

            color="#f5a623"

            title="Transactions History"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="home"

            color="#2196f3"

            title="Payout Settings"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />

        </View>



        {/* GROWTH */}

        <SectionTitle title="Growth & Marketing" />



        <View style={styles.card}>

          <ListItem

            icon="tag"

            color="#ff4d79"

            title="Promotions & Discounts"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="speaker"

            color="#2196f3"

            title="Seller Advertising"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="trending-up"

            color="#f5a623"

            title="Boost Products"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="star"

            color="#4caf50"

            title="Customer Reviews"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />

        </View>



        {/* SUPPORT */}

        <SectionTitle title="Support & Help" />



        <View style={styles.card}>

          <ListItem

            icon="headphones"

            color="#9c27b0"

            title="Help & Support"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="file-text"

            color="#2196f3"

            title="Privacy & Support"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />



          <ListItem

            icon="help-circle"

            color="#f5a623"

            title="FAQs"

            selectedItem={selectedItem}

            setSelectedItem={setSelectedItem}

          />

        </View>



        {/* LOGOUT */}

        <TouchableOpacity style={styles.logoutBtn}>

          <AntDesign name="logout" size={20} color="#FF6B35" />

          <AppText style={styles.logoutText}>Logout</AppText>

        </TouchableOpacity>



        <View style={{ height: 100 }} />

      </ScrollView>



      {/* BOTTOM TAB */}

      {Platform.OS !== 'web' && (
      <View style={styles.bottomTab}>

        <BottomItem icon="home" label="Home" />

        <BottomItem icon="grid" label="Categories" />

        <BottomItem icon="activity" label="Trending" />



        <BottomItem icon="shopping-bag" label="Orders" />



        <BottomItem icon="user" label="Profile" active />

      </View>
      )}

      <ProfileImageModal

        visible={modalVisible}

        onClose={() => setModalVisible(false)}

        onSelectCamera={handleSelectCamera}

        onSelectGallery={handleSelectGallery}

      />

    </View>

  );

}



const MenuIcon = ({ icon, label, badge }: { icon: React.ReactNode, label: string, badge?: string | number }) => (

  <View style={styles.menuItem}>

    <View style={styles.iconBox}>

      {icon}



      {badge && (

        <View style={styles.smallBadge}>

          <AppText style={styles.smallBadgeText}>{badge}</AppText>

        </View>

      )}



      <AppText style={styles.menuLabel}>{label}</AppText>

    </View>

  </View>

);



const SectionTitle = ({ title }: { title: string }) => (

  <View style={styles.sectionTitleContainer}>

    <AppText style={styles.sectionTitle}>{title}</AppText>

    <View style={styles.sectionUnderline}>

      <View style={{

        position: 'absolute',

        left: 0,

        right: 0,

        top: 0,

        bottom: 0,

        height: 6,

        backgroundColor: '#F97316',

        borderRadius: 4,

      }} />

    </View>

  </View>

);



const ListItem = ({ icon, color, title, badge, onPress, selectedItem, setSelectedItem }: { icon: any, color: string, title: string, badge?: string | number, onPress?: () => void, selectedItem: string | null, setSelectedItem: (item: string) => void }) => (

  <TouchableOpacity

    style={[

      styles.listItem,

      selectedItem === title && styles.selectedListItem

    ]}

    onPress={() => {

      setSelectedItem(title);

      if (onPress) onPress();

    }}

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



const BottomItem = ({ icon, label, active }: { icon: any, label: string, active?: boolean }) => (

  <View style={styles.bottomItem}>

    <Feather

      name={icon}

      size={22}

      color={active ? "#1E3A8A" : "#555"}

    />

    <AppText

      style={[

        styles.bottomText,

        active && { color: "#1E3A8A" },

      ]}

    >

      {label}

    </AppText>

  </View>

);



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: "#f8f8f8",

    paddingTop: 55,

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

    textShadowOffset: {

      width: 2,

      height: 2,

    },

    textShadowRadius: 4,

  },



  sellerHubUnderline: {

    width: 80,

    height: 6,

    backgroundColor: "#F97316",

    borderRadius: 4,

    alignSelf: 'center',

    shadowColor: "#F97316",

    shadowOffset: {

      width: 0,

      height: 3,

    },

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

    textShadowOffset: {

      width: 2,

      height: 2,

    },

    textShadowRadius: 4,

  },



  sectionUnderline: {

    width: 80,

    height: 2,

    backgroundColor: "#F97316",

    borderRadius: 4,

    alignSelf: 'center',

    shadowColor: "#F97316",

    shadowOffset: {

      width: 0,

      height: 3,

    },

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

    backgroundColor: "#fff",

    flexDirection: "row",

    justifyContent: "space-around",

    paddingVertical: 12,

    borderTopWidth: 1,

    borderTopColor: "#eee",

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
