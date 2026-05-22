import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, StatusBar, SafeAreaView, Image, Modal,
    TextInput, Platform, PanResponder, Alert, Switch,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import {
    useFonts, Outfit_400Regular, Outfit_500Medium,
    Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useRouter } from "expo-router";

const { width: SW, height: SH } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// ─── Color Palette ────────────────────────────────────────────
const C = {
    navy: "#1E2B6B", navyDeep: "#151D4F", navyMid: "#1A2B5E", navyLight: "#2D3E8A",
    purple: "#6C63FF", purpleLight: "#A89CFF", purplePale: "#F0EEFF",
    green: "#22C55E", greenLight: "#86EFAC", greenPale: "#F0FDF4",
    red: "#EF4444", redLight: "#FCA5A5", redPale: "#FEF2F2",
    yellow: "#F59E0B", yellowPale: "#FFFBEB",
    blue: "#3B82F6", bluePale: "#EFF6FF",
    orange: "#F97316", orangePale: "#FFF7ED",
    teal: "#14B8A6", cyan: "#06B6D4",
    white: "#FFFFFF", bg: "#F7F8FC", card: "#FFFFFF",
    border: "#E5E7EB", textDark: "#111827", textMid: "#374151", textLight: "#9CA3AF",
};

type ViewType = "list" | "grid";
type TabType = "All Products" | "Active" | "Inactive" | "Out of Stock" | "Low Stock";
type SortType = "Latest" | "Oldest" | "Price: Low-High" | "Price: High-Low" | "Name A-Z";

const PRICE_MIN = 0;
const PRICE_MAX = 5000;
const SLIDER_W  = SW - 80;
const THUMB_S   = 24;

const TABS: { label: TabType; icon: string; color: string; bg: string }[] = [
    { label: "All Products", icon: "package-variant",      color: C.navy,   bg: "#EEF1FF"    },
    { label: "Active",       icon: "check-circle-outline", color: C.green,  bg: C.greenPale  },
    { label: "Inactive",     icon: "pause-circle-outline", color: C.yellow, bg: C.yellowPale },
    { label: "Out of Stock", icon: "close-circle-outline", color: C.red,    bg: C.redPale    },
    { label: "Low Stock",    icon: "alert-circle-outline", color: C.orange, bg: C.orangePale },
];

type Product = {
    id: string; name: string; sku: string; price: number; image: string;
    status: string; stock: number; updated: string; category: string;
    subcategory: string; color: string; size: string;
    description?: string; material?: string; weight?: string;
    dimensions?: string; returnPolicy?: string; warranty?: string;
};

const INITIAL_PRODUCTS: Product[] = [
    { id:"1",  name:"Running Sports Shoes", sku:"SHOES001", price:1999, image:"https://picsum.photos/seed/shoes1/100/100",      status:"Active",       stock:50,  updated:"20 May 2024", category:"Footwear",    subcategory:"Sneakers", color:"Red",   size:"42",       description:"High-performance running shoes with advanced cushioning and breathable mesh upper.", material:"Mesh & Rubber", weight:"0.5 kg", dimensions:"30 × 15 × 12 cm", returnPolicy:"30 Days Return", warranty:"6 Months" },
    { id:"2",  name:"Smart Watch Series 5", sku:"WATCH005", price:2999, image:"https://picsum.photos/seed/watch1/100/100",      status:"Active",       stock:30,  updated:"19 May 2024", category:"Electronics", subcategory:"Wearables",color:"Black", size:"Free Size",description:"Feature-rich smartwatch with health tracking, GPS, and 7-day battery life.", material:"Stainless Steel & Silicone", weight:"0.12 kg", dimensions:"4.5 × 3.8 × 1.0 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"3",  name:"Travel Backpack",       sku:"BAG002",   price:1299, image:"https://picsum.photos/seed/backpack1/100/100",  status:"Inactive",     stock:0,   updated:"18 May 2024", category:"Bags",        subcategory:"Backpacks",color:"Blue",  size:"Free Size",description:"Spacious 40L travel backpack with laptop compartment and anti-theft design.", material:"Nylon", weight:"1.2 kg", dimensions:"55 × 35 × 20 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"4",  name:"Wireless Headphones",   sku:"HEAD004",  price:1799, image:"https://picsum.photos/seed/headphones1/100/100",status:"Out of Stock", stock:0,   updated:"17 May 2024", category:"Electronics", subcategory:"Audio",    color:"White", size:"Free Size",description:"Premium wireless headphones with active noise cancellation and 30hr battery.", material:"Plastic & Memory Foam", weight:"0.28 kg", dimensions:"20 × 18 × 8 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"5",  name:"Cotton T-Shirt",        sku:"SHIRT003", price:499,  image:"https://picsum.photos/seed/tshirt1/100/100",    status:"Active",       stock:120, updated:"20 May 2024", category:"Clothing",    subcategory:"T-Shirts", color:"White", size:"M",        description:"100% premium cotton t-shirt with relaxed fit and breathable fabric.", material:"Cotton", weight:"0.2 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"6",  name:"Denim Jeans",           sku:"JEAN001",  price:1199, image:"https://picsum.photos/seed/jeans1/100/100",     status:"Active",       stock:85,  updated:"19 May 2024", category:"Clothing",    subcategory:"Jeans",    color:"Blue",  size:"32",       description:"Classic slim-fit denim jeans with stretch for all-day comfort.", material:"Denim (98% Cotton, 2% Elastane)", weight:"0.6 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"7",  name:"Leather Wallet",        sku:"WALL007",  price:799,  image:"https://picsum.photos/seed/wallet1/100/100",    status:"Active",       stock:8,   updated:"15 May 2024", category:"Accessories", subcategory:"Wallets",  color:"Brown", size:"Free Size",description:"Genuine leather bi-fold wallet with RFID blocking and multiple card slots.", material:"Genuine Leather", weight:"0.08 kg", dimensions:"11 × 9 × 1 cm", returnPolicy:"7 Days Return", warranty:"6 Months" },
    { id:"8",  name:"Sunglasses UV400",      sku:"SUN008",   price:999,  image:"https://picsum.photos/seed/glasses1/100/100",   status:"Active",       stock:6,   updated:"14 May 2024", category:"Accessories", subcategory:"Eyewear",  color:"Black", size:"Free Size",description:"Polarized UV400 sunglasses with lightweight titanium frame.", material:"Titanium & Polycarbonate", weight:"0.03 kg", dimensions:"14 × 5 × 4 cm", returnPolicy:"7 Days Return", warranty:"6 Months" },
    { id:"9",  name:"Yoga Mat Pro",          sku:"MAT009",   price:1499, image:"https://picsum.photos/seed/mat1/100/100",       status:"Inactive",     stock:0,   updated:"13 May 2024", category:"Sports",      subcategory:"Yoga",     color:"Purple",size:"Free Size",description:"6mm thick non-slip yoga mat with alignment lines and carrying strap.", material:"TPE (Eco-friendly)", weight:"1.0 kg", dimensions:"183 × 61 × 0.6 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"10", name:"Bluetooth Speaker",     sku:"SPK010",   price:2499, image:"https://picsum.photos/seed/speaker1/100/100",   status:"Active",       stock:25,  updated:"12 May 2024", category:"Electronics", subcategory:"Audio",    color:"Gray",  size:"Free Size",description:"360° surround sound Bluetooth speaker with IPX7 waterproof rating.", material:"Polycarbonate & Silicone", weight:"0.55 kg", dimensions:"9 × 9 × 8 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"11", name:"Formal Oxford Shoes",   sku:"OXFD011",  price:3499, image:"https://picsum.photos/seed/shoes2/100/100",     status:"Active",       stock:20,  updated:"11 May 2024", category:"Footwear",    subcategory:"Formal",   color:"Black", size:"43",       description:"Handcrafted genuine leather Oxford shoes for formal occasions.", material:"Full-Grain Leather", weight:"0.9 kg", dimensions:"32 × 12 × 11 cm", returnPolicy:"14 Days Return", warranty:"6 Months" },
    { id:"12", name:"Polo Shirt",            sku:"POLO012",  price:699,  image:"https://picsum.photos/seed/polo1/100/100",      status:"Out of Stock", stock:0,   updated:"10 May 2024", category:"Clothing",    subcategory:"Shirts",   color:"Red",   size:"L",        description:"Classic polo shirt in piqué cotton with ribbed collar and cuffs.", material:"100% Piqué Cotton", weight:"0.22 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"13", name:"Running Cap",           sku:"CAP013",   price:349,  image:"https://picsum.photos/seed/cap1/100/100",       status:"Active",       stock:60,  updated:"09 May 2024", category:"Accessories", subcategory:"Headwear", color:"Blue",  size:"Free Size",description:"Lightweight moisture-wicking running cap with UV protection.", material:"Polyester", weight:"0.08 kg", dimensions:"N/A", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"14", name:"Gym Gloves",            sku:"GLOVE014", price:449,  image:"https://picsum.photos/seed/gloves1/100/100",    status:"Active",       stock:40,  updated:"08 May 2024", category:"Sports",      subcategory:"Gym",      color:"Black", size:"M",        description:"Full-finger gym gloves with wrist support and anti-slip grip.", material:"Leather & Neoprene", weight:"0.15 kg", dimensions:"N/A", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"15", name:"Protein Shaker Bottle", sku:"SHAKE015", price:299,  image:"https://picsum.photos/seed/bottle1/100/100",   status:"Active",       stock:90,  updated:"07 May 2024", category:"Sports",      subcategory:"Gym",      color:"Gray",  size:"Free Size",description:"700ml BPA-free protein shaker with mixing ball and leak-proof lid.", material:"BPA-Free Plastic", weight:"0.18 kg", dimensions:"24 × 8 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"16", name:"Ankle Socks Pack",      sku:"SOCK016",  price:199,  image:"https://picsum.photos/seed/socks1/100/100",    status:"Active",       stock:200, updated:"06 May 2024", category:"Clothing",    subcategory:"Innerwear",color:"White", size:"Free Size",description:"Pack of 6 breathable cotton ankle socks with cushioned sole.", material:"80% Cotton, 20% Lycra", weight:"0.12 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"17", name:"Resistance Bands Set",  sku:"BAND017",  price:599,  image:"https://picsum.photos/seed/bands1/100/100",    status:"Active",       stock:55,  updated:"05 May 2024", category:"Sports",      subcategory:"Gym",      color:"Red",   size:"Free Size",description:"Set of 5 latex resistance bands in varying resistance levels.", material:"Natural Latex", weight:"0.3 kg", dimensions:"60 × 5 cm each", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"18", name:"Jump Rope Pro",         sku:"JUMP018",  price:399,  image:"https://picsum.photos/seed/jumprope1/100/100", status:"Inactive",     stock:0,   updated:"04 May 2024", category:"Sports",      subcategory:"Gym",      color:"Black", size:"Free Size",description:"Speed jump rope with steel wire cable and ergonomic foam handles.", material:"Steel & Foam", weight:"0.22 kg", dimensions:"Adjustable up to 3m", returnPolicy:"7 Days Return", warranty:"6 Months" },
    { id:"19", name:"Foam Roller",           sku:"FOAM019",  price:799,  image:"https://picsum.photos/seed/foam1/100/100",     status:"Active",       stock:35,  updated:"03 May 2024", category:"Sports",      subcategory:"Yoga",     color:"Purple",size:"Free Size",description:"High-density EPP foam roller for muscle recovery and myofascial release.", material:"EPP Foam", weight:"0.5 kg", dimensions:"45 × 15 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"20", name:"Sports Water Bottle",   sku:"WBOT020",  price:549,  image:"https://picsum.photos/seed/waterbottle1/100/100",status:"Active",      stock:75,  updated:"02 May 2024", category:"Sports",      subcategory:"Gym",      color:"Blue",  size:"Free Size",description:"1L insulated stainless steel water bottle keeps drinks cold 24hrs.", material:"Stainless Steel", weight:"0.35 kg", dimensions:"26 × 7 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"21", name:"Training Shorts",       sku:"SHORT021", price:649,  image:"https://picsum.photos/seed/shorts1/100/100",   status:"Active",       stock:45,  updated:"01 May 2024", category:"Clothing",    subcategory:"Shorts",   color:"Black", size:"L",        description:"Quick-dry training shorts with built-in compression liner.", material:"Polyester & Spandex", weight:"0.2 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"22", name:"Sports Bra",            sku:"BRA022",   price:799,  image:"https://picsum.photos/seed/sportsbra1/100/100",status:"Out of Stock", stock:0,   updated:"30 Apr 2024", category:"Clothing",    subcategory:"Innerwear",color:"Pink",  size:"M",        description:"High-impact sports bra with removable cups and cross-back design.", material:"Nylon & Spandex", weight:"0.15 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
];

const CATEGORIES    = ["All","Footwear","Electronics","Bags","Clothing","Accessories","Sports"];
const SUBCATEGORIES: Record<string,string[]> = {
    Footwear:    ["All","Sneakers","Formal","Sports","Boots"],
    Electronics: ["All","Audio","Wearables","Cameras","Tablets"],
    Bags:        ["All","Backpacks","Handbags","Wallets","Travel Bags"],
    Clothing:    ["All","T-Shirts","Shirts","Jeans","Dresses","Jackets","Shorts","Innerwear"],
    Accessories: ["All","Wallets","Eyewear","Watches","Jewelry","Headwear"],
    Sports:      ["All","Cricket","Football","Yoga","Gym"],
};
const COLOR_OPTIONS  = ["All","Red","Blue","Green","Black","White","Yellow","Pink","Purple","Orange","Gray","Brown"];
const SIZE_OPTIONS   = ["All","XS","S","M","L","XL","XXL","Free Size","28","30","32","34","36","38","40","42","43"];
const SORT_OPTIONS: { value: SortType; icon: string; desc: string }[] = [
    { value: "Latest",          icon: "clock-outline",               desc: "Newest first"       },
    { value: "Oldest",          icon: "clock-time-eight-outline",    desc: "Oldest first"       },
    { value: "Price: Low-High", icon: "trending-up",                 desc: "Cheapest first"     },
    { value: "Price: High-Low", icon: "trending-down",               desc: "Priciest first"     },
    { value: "Name A-Z",        icon: "sort-alphabetical-ascending", desc: "Alphabetical order" },
];
const VIEW_RANGE_OPTIONS = [20, 30, 50] as const;
const LOW_STOCK_THRESHOLD = 10;

const DOT_COLORS: Record<string,string> = {
    Red:"#EF4444", Blue:"#3B82F6", Green:"#22C55E", Black:"#1F2937",
    White:"#F9FAFB", Yellow:"#F59E0B", Pink:"#EC4899", Purple:"#8B5CF6",
    Orange:"#F97316", Gray:"#6B7280", Brown:"#92400E", All:C.navy,
};

const PINCODE_DATA = [
    { pincode:"110001", area:"Baroda House",        city:"New Delhi",  state:"Delhi",       country:"India" },
    { pincode:"110001", area:"Bengali Market",       city:"New Delhi",  state:"Delhi",       country:"India" },
    { pincode:"110001", area:"Connaught Place",      city:"New Delhi",  state:"Delhi",       country:"India" },
    { pincode:"400001", area:"Fort",                 city:"Mumbai",     state:"Maharashtra", country:"India" },
    { pincode:"400001", area:"Churchgate",           city:"Mumbai",     state:"Maharashtra", country:"India" },
    { pincode:"500001", area:"Abids",                city:"Hyderabad",  state:"Telangana",   country:"India" },
    { pincode:"500001", area:"Koti",                 city:"Hyderabad",  state:"Telangana",   country:"India" },
    { pincode:"560001", area:"MG Road",              city:"Bengaluru",  state:"Karnataka",   country:"India" },
    { pincode:"600001", area:"George Town",          city:"Chennai",    state:"Tamil Nadu",  country:"India" },
    { pincode:"700001", area:"BBD Bagh",             city:"Kolkata",    state:"West Bengal", country:"India" },
];

const COUNTRIES = ["India"];
const STATES_BY_COUNTRY: Record<string, string[]> = {
    "India": ["All States","Delhi","Maharashtra","Telangana","Karnataka","Tamil Nadu","West Bengal","Gujarat","Rajasthan","Uttar Pradesh"],
};
const CITIES_BY_STATE: Record<string, string[]> = {
    "All States":    ["All Cities"],
    "Delhi":         ["All Cities","New Delhi"],
    "Maharashtra":   ["All Cities","Mumbai","Pune","Nagpur"],
    "Telangana":     ["All Cities","Hyderabad","Warangal"],
    "Karnataka":     ["All Cities","Bengaluru","Mysuru"],
    "Tamil Nadu":    ["All Cities","Chennai","Coimbatore"],
    "West Bengal":   ["All Cities","Kolkata","Siliguri"],
    "Gujarat":       ["All Cities","Ahmedabad","Surat","Vadodara"],
    "Rajasthan":     ["All Cities","Jaipur","Jodhpur","Udaipur"],
    "Uttar Pradesh": ["All Cities","Lucknow","Agra","Varanasi"],
};

// ─────────────────────────────────────────────────────────────
// RANGE SLIDER (mobile)
// ─────────────────────────────────────────────────────────────
interface RangeSliderProps {
    low: number; high: number; min?: number; max?: number; step?: number;
    onLowChange: (v: number) => void; onHighChange: (v: number) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ low, high, min = PRICE_MIN, max = PRICE_MAX, step = 100, onLowChange, onHighChange }) => {
    const lowRef  = useRef(low);
    const highRef = useRef(high);
    lowRef.current  = low;
    highRef.current = high;

    const valToPos = useCallback((v: number) => ((v - min) / (max - min)) * SLIDER_W, [min, max]);
    const posToVal = useCallback((pos: number) => {
        const raw = (pos / SLIDER_W) * (max - min) + min;
        return Math.max(min, Math.min(max, Math.round(raw / step) * step));
    }, [min, max, step]);

    const lowStartX  = useRef(0);
    const highStartX = useRef(0);

    const lowPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { lowStartX.current = valToPos(lowRef.current); },
        onPanResponderMove: (_, gs) => {
            const newPos = Math.max(0, Math.min(lowStartX.current + gs.dx, valToPos(highRef.current) - THUMB_S));
            onLowChange(posToVal(newPos));
        },
    })).current;

    const highPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { highStartX.current = valToPos(highRef.current); },
        onPanResponderMove: (_, gs) => {
            const newPos = Math.max(valToPos(lowRef.current) + THUMB_S, Math.min(highStartX.current + gs.dx, SLIDER_W));
            onHighChange(posToVal(newPos));
        },
    })).current;

    const lowX  = valToPos(low);
    const highX = valToPos(high);

    return (
        <View style={rs.container}>
            <View style={rs.track}>
                <View style={[rs.fill, { left: lowX, width: Math.max(0, highX - lowX) }]} />
                <View {...lowPan.panHandlers} style={[rs.thumb, { left: lowX - THUMB_S / 2 }]}>
                    <View style={rs.thumbInner} />
                </View>
                <View {...highPan.panHandlers} style={[rs.thumb, { left: highX - THUMB_S / 2 }]}>
                    <View style={rs.thumbInner} />
                </View>
            </View>
            <View style={rs.labelRow}>
                <View style={rs.labelPill}><Text style={rs.labelTxt}>₹{low.toLocaleString()}</Text></View>
                <View style={rs.dash} />
                <View style={rs.labelPill}><Text style={rs.labelTxt}>₹{high.toLocaleString()}</Text></View>
            </View>
        </View>
    );
};

const rs = StyleSheet.create({
    container: { paddingTop: 8, paddingBottom: 12 },
    track: { height: 4, backgroundColor: C.border, borderRadius: 2, position: "relative", marginHorizontal: THUMB_S / 2, marginTop: 16 },
    fill: { position: "absolute", height: 4, backgroundColor: C.navy, borderRadius: 2 },
    thumb: { position: "absolute", top: -(THUMB_S / 2 - 2), width: THUMB_S, height: THUMB_S, borderRadius: THUMB_S / 2, backgroundColor: C.white, borderWidth: 2.5, borderColor: C.navy, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 6 },
    thumbInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navy },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 8 },
    labelPill: { flex: 1, backgroundColor: C.bg, borderRadius: 9, borderWidth: 1, borderColor: C.border, paddingVertical: 8, alignItems: "center" },
    labelTxt: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.navy },
    dash: { width: 16, height: 1.5, backgroundColor: C.border, borderRadius: 1 },
});

const WrapChipGroup = ({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        {options.map(opt => (
            <TouchableOpacity key={opt} style={[fs.chip, selected === opt && fs.chipActive]} onPress={() => onSelect(opt)}>
                <Text style={[fs.chipText, selected === opt && fs.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

const WrapColorGroup = ({ selected, onSelect }: { selected: string; onSelect: (v: string) => void }) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        {COLOR_OPTIONS.map(col => {
            const isSelected = selected === col;
            return (
                <TouchableOpacity key={col} style={[fs.colorChip, isSelected && { borderColor: DOT_COLORS[col] ?? C.navy, borderWidth: 2.5 }]} onPress={() => onSelect(col)}>
                    {col !== "All" && <View style={[fs.colorDot, { backgroundColor: DOT_COLORS[col] ?? "#ccc", borderWidth: col === "White" ? 1 : 0, borderColor: C.border }]} />}
                    <Text style={[fs.chipText, isSelected && { color: C.navy, fontFamily: "Outfit_600SemiBold" }]}>{col}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

// ─────────────────────────────────────────────────────────────
// DELIVERY LOCATIONS MODAL
// ─────────────────────────────────────────────────────────────
interface DeliveryLocationsModalProps {
    product: Product | undefined;
    onClose: () => void;
}

const DeliveryLocationsModal: React.FC<DeliveryLocationsModalProps> = ({ product, onClose }) => {
    if (!product) return null;
    const [deliverAll, setDeliverAll]             = useState(true);
    const [addressQuery, setAddressQuery]         = useState("");
    const [pincodeQuery, setPincodeQuery]         = useState("");
    const [selectedCountry, setSelectedCountry]   = useState("India");
    const [selectedState, setSelectedState]       = useState("All States");
    const [selectedCity, setSelectedCity]         = useState("All Cities");
    const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
    const [selectAll, setSelectAll]               = useState(false);
    type SelectorType = 'country' | 'state' | 'city' | null;
    const [selectorVisible, setSelectorVisible]   = useState(false);
    const [selectorType, setSelectorType]         = useState<SelectorType>(null);
    const [selectorOptions, setSelectorOptions]   = useState<string[]>([]);

    const stateOptions = STATES_BY_COUNTRY[selectedCountry] ?? ["All States"];
    const cityOptions  = CITIES_BY_STATE[selectedState]     ?? ["All Cities"];

    const openSelector = (type: SelectorType, options: string[]) => {
        setSelectorType(type); setSelectorOptions(options); setSelectorVisible(true);
    };

    const handleSelectorSelect = (val: string) => {
        if (selectorType === 'country') { setSelectedCountry(val); setSelectedState("All States"); setSelectedCity("All Cities"); }
        else if (selectorType === 'state') { setSelectedState(val); setSelectedCity("All Cities"); }
        else if (selectorType === 'city') { setSelectedCity(val); }
        setSelectorVisible(false);
    };

    const filteredData = useMemo(() => {
        let data = PINCODE_DATA.filter(d => d.country === selectedCountry);
        if (pincodeQuery.trim()) {
            const q = pincodeQuery.toLowerCase();
            data = data.filter(d => d.pincode.includes(q) || d.area.toLowerCase().includes(q) || d.city.toLowerCase().includes(q));
        }
        if (selectedState !== "All States") data = data.filter(d => d.state === selectedState);
        if (selectedCity  !== "All Cities") data = data.filter(d => d.city  === selectedCity);
        return data;
    }, [pincodeQuery, selectedCountry, selectedState, selectedCity]);

    const togglePincode = (key: string) => {
        setSelectedPincodes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };
    const toggleSelectAll = () => {
        if (selectAll) { setSelectedPincodes([]); } else { setSelectedPincodes(filteredData.map(d => `${d.pincode}-${d.area}`)); }
        setSelectAll(!selectAll);
    };
    const handleApply = () => {
        const count = selectedPincodes.length;
        Alert.alert("✅ Delivery Locations Updated", `Successfully applied delivery settings for "${product.name}".\n\n${deliverAll ? "📦 Product will be delivered to all locations India-wide." : count > 0 ? `📍 ${count} location${count > 1 ? "s" : ""} selected for delivery.` : "⚠️ No locations selected."}`, [{ text: "OK", style: "default", onPress: onClose }], { cancelable: false });
    };

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={dl.fullScreen}>
                <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
                <View style={dl.header}>
                    <TouchableOpacity style={dl.backBtn} onPress={onClose}>
                        <Ionicons name="arrow-back" size={22} color={C.white} />
                    </TouchableOpacity>
                    <View style={dl.headerCenter}>
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={C.orange} />
                        <View><Text style={dl.headerTitle}>Delivery Locations</Text><Text style={dl.headerSub} numberOfLines={1}>{product.name}</Text></View>
                    </View>
                    <View style={dl.headerRight}>
                        <Text style={dl.deliverAllLabel}>All India</Text>
                        <Switch value={deliverAll} onValueChange={setDeliverAll} trackColor={{ false: "rgba(255,255,255,0.3)", true: C.orange }} thumbColor={C.white} ios_backgroundColor="rgba(255,255,255,0.3)" />
                    </View>
                </View>
                <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={dl.infoBanner}>
                        <MaterialCommunityIcons name="information-outline" size={16} color={C.orange} />
                        <View style={{ flex: 1 }}><Text style={dl.infoText}><Text style={dl.infoBold}>ON: </Text>Ships anywhere.<Text style={dl.infoBold}> OFF: </Text>Only selected pincodes.</Text></View>
                        <TouchableOpacity style={dl.indiaWideBtn} onPress={() => setDeliverAll(true)}><Text style={dl.indiaWideBtnTxt}>Set All</Text></TouchableOpacity>
                    </View>
                    <View style={dl.sectionCard}>
                        <View style={dl.sectionHeader}><Text style={dl.sectionTitle}>Country</Text></View>
                        <TouchableOpacity style={dl.dropdownInput} onPress={() => openSelector('country', COUNTRIES)}>
                            <Text style={dl.dropdownText}>{selectedCountry}</Text><Ionicons name="chevron-down" size={18} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <View style={dl.sectionCard}>
                        <View style={dl.sectionHeader}><Text style={dl.sectionTitle}>State</Text></View>
                        <TouchableOpacity style={dl.dropdownInput} onPress={() => openSelector('state', stateOptions)}>
                            <Text style={dl.dropdownText}>{selectedState}</Text><Ionicons name="chevron-down" size={18} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <View style={dl.sectionCard}>
                        <View style={dl.sectionHeader}><Text style={dl.sectionTitle}>City</Text></View>
                        <TouchableOpacity style={dl.dropdownInput} onPress={() => openSelector('city', cityOptions)}>
                            <Text style={dl.dropdownText}>{selectedCity}</Text><Ionicons name="chevron-down" size={18} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <View style={dl.sectionCard}>
                        <View style={dl.sectionHeader}><Text style={dl.sectionTitle}>Search Pincode / Area</Text></View>
                        <View style={dl.searchPincodeRow}>
                            <View style={dl.searchIconBox}><Feather name="search" size={15} color={C.white} /></View>
                            <TextInput style={dl.searchPincodeInput} placeholder="Search by pincode or area..." placeholderTextColor={C.textLight} value={pincodeQuery} onChangeText={setPincodeQuery} />
                        </View>
                    </View>
                    <View style={dl.tableCard}>
                        <View style={dl.tableHeader}>
                            <TouchableOpacity style={dl.checkboxWrap} onPress={toggleSelectAll}>
                                <View style={[dl.checkbox, selectAll && dl.checkboxChecked]}>{selectAll && <Ionicons name="checkmark" size={10} color={C.white} />}</View>
                            </TouchableOpacity>
                            <Text style={[dl.tableHeaderTxt, { flex: 1 }]}>Pincode</Text>
                            <Text style={[dl.tableHeaderTxt, { flex: 2 }]}>Area</Text>
                            <Text style={[dl.tableHeaderTxt, { flex: 1.5 }]}>City</Text>
                            <Text style={[dl.tableHeaderTxt, { flex: 1.2 }]}>State</Text>
                        </View>
                        {filteredData.length === 0 ? (
                            <View style={dl.emptyTable}><MaterialCommunityIcons name="map-search-outline" size={40} color={C.textLight} /><Text style={dl.emptyTableTitle}>No locations found</Text></View>
                        ) : (
                            filteredData.map((d, i) => {
                                const key = `${d.pincode}-${d.area}`; const isChecked = selectedPincodes.includes(key);
                                return (
                                    <TouchableOpacity key={key} style={[dl.tableRow, isChecked && dl.tableRowChecked, i % 2 === 1 && dl.tableRowAlt]} onPress={() => togglePincode(key)} activeOpacity={0.7}>
                                        <View style={dl.checkboxWrap}><View style={[dl.checkbox, isChecked && dl.checkboxChecked]}>{isChecked && <Ionicons name="checkmark" size={10} color={C.white} />}</View></View>
                                        <Text style={[dl.tableCellTxt, { flex: 1 }]}>{d.pincode}</Text>
                                        <Text style={[dl.tableCellTxt, { flex: 2 }]} numberOfLines={1}>{d.area}</Text>
                                        <Text style={[dl.tableCellHighlight, { flex: 1.5 }]}>{d.city}</Text>
                                        <Text style={[dl.tableCellHighlight, { flex: 1.2 }]}>{d.state}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                        {selectedPincodes.length > 0 && (
                            <View style={dl.selectionBanner}>
                                <MaterialCommunityIcons name="check-circle" size={16} color={C.orange} />
                                <Text style={dl.selectionBannerTxt}>{selectedPincodes.length} location{selectedPincodes.length > 1 ? "s" : ""} selected</Text>
                                <TouchableOpacity onPress={() => { setSelectedPincodes([]); setSelectAll(false); }}><Text style={dl.selectionClearTxt}>Clear</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
                <Modal visible={selectorVisible} transparent animationType="fade">
                    <View style={gs.overlay}>
                        <View style={gs.content}>
                            <View style={gs.headerRow}>
                                <Text style={gs.headerTitle}>Select {selectorType === 'country' ? 'Country' : selectorType === 'state' ? 'State' : 'City'}</Text>
                                <TouchableOpacity onPress={() => setSelectorVisible(false)}><Ionicons name="close" size={24} color={C.textDark} /></TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: SH * 0.5 }}>
                                {selectorOptions.map((opt, idx) => {
                                    const isActive = (selectorType === 'country' && opt === selectedCountry) || (selectorType === 'state' && opt === selectedState) || (selectorType === 'city' && opt === selectedCity);
                                    return (
                                        <TouchableOpacity key={idx} style={[gs.item, isActive && gs.itemActive]} onPress={() => handleSelectorSelect(opt)}>
                                            <Text style={[gs.itemText, isActive && gs.itemTextActive]}>{opt}</Text>
                                            {isActive && <Ionicons name="checkmark-circle" size={20} color={C.navy} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
                <View style={dl.footer}>
                    <TouchableOpacity style={dl.cancelBtn} onPress={onClose}><Text style={dl.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={dl.applyBtn} onPress={handleApply}><Text style={dl.applyBtnTxt}>Apply Selection</Text></TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const dl = StyleSheet.create({
    fullScreen: { flex: 1, backgroundColor: C.navyDeep },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10, backgroundColor: C.navyDeep, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 12 : 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
    headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
    headerSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)", maxWidth: SW * 0.45 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    deliverAllLabel: { fontFamily: "Outfit_500Medium", fontSize: 10, color: "rgba(255,255,255,0.8)" },
    infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, margin: 14, backgroundColor: C.orangePale, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.orange + "30" },
    infoText: { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: C.textMid, lineHeight: 18, flex: 1 },
    infoBold: { fontFamily: "Outfit_700Bold", color: C.textDark },
    indiaWideBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.orange, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
    indiaWideBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.white },
    sectionCard: { backgroundColor: C.white, borderRadius: 14, marginHorizontal: 14, marginBottom: 10, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark },
    dropdownInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
    dropdownText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textDark },
    searchPincodeRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: C.border },
    searchIconBox: { backgroundColor: C.orange, padding: 10 },
    searchPincodeInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.white },
    tableCard: { backgroundColor: C.white, borderRadius: 14, marginHorizontal: 14, marginBottom: 10, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tableHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, backgroundColor: C.navyDeep },
    tableHeaderTxt: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.white },
    checkboxWrap: { width: 36, alignItems: "center" },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
    checkboxChecked: { backgroundColor: C.orange, borderColor: C.orange },
    tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
    tableRowAlt: { backgroundColor: "#FAFAFA" },
    tableRowChecked: { backgroundColor: C.orangePale },
    tableCellTxt: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textDark, paddingHorizontal: 4 },
    tableCellHighlight: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.orange, paddingHorizontal: 4 },
    emptyTable: { alignItems: "center", paddingVertical: 36, gap: 10 },
    emptyTableTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.textMid },
    selectionBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.orangePale, borderTopWidth: 1, borderTopColor: C.orange + "30" },
    selectionBannerTxt: { flex: 1, fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.orange },
    selectionClearTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.red },
    footer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
    cancelBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
    cancelBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
    applyBtn: { flex: 2, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, backgroundColor: C.orange },
    applyBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
});

const gs = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
    content: { backgroundColor: C.white, width: "100%", borderRadius: 16, maxHeight: SH * 0.6, overflow: "hidden" },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
    itemActive: { backgroundColor: C.bluePale },
    itemText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textDark },
    itemTextActive: { fontFamily: "Outfit_700Bold", color: C.navy },
});

// ─────────────────────────────────────────────────────────────
// PRODUCT ACTION SHEET
// ─────────────────────────────────────────────────────────────
interface ActionSheetProps {
    product: Product | undefined; onClose: () => void;
    onDelete: (id: string) => void; onUpdateLocation: (id: string) => void;
}

const PRODUCT_ACTIONS = [
    { icon: "eye-outline",        label: "View Product",    color: C.blue,   bg: C.bluePale   },
    { icon: "pencil-outline",     label: "Edit Product",    color: C.purple, bg: C.purplePale },
    { icon: "map-marker-outline", label: "Update Location", color: C.teal,   bg: "#F0FDFA"    },
    { icon: "trash-can-outline",  label: "Delete Product",  color: C.red,    bg: C.redPale    },
];

const ProductActionSheet: React.FC<ActionSheetProps> = ({ product, onClose, onDelete, onUpdateLocation }) => {
    if (!product) return null;
    const router = useRouter();

    const handleAction = (label: string) => {
        if (label === "Delete Product") {
            onClose();
            setTimeout(() => {
                Alert.alert("Delete Product", `Are you sure you want to delete "${product.name}"?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => onDelete(product.id) }], { cancelable: true });
            }, 300);
        } else if (label === "View Product") { onClose(); router.push("/(main)/Productdetail");
        } else if (label === "Edit Product") { onClose(); router.push("/(main)/Editproduct");
        } else if (label === "Update Location") { onClose(); setTimeout(() => onUpdateLocation(product.id), 200);
        } else { onClose(); }
    };

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={as.root}>
                <TouchableOpacity style={as.overlay} activeOpacity={1} onPress={onClose} />
                <View style={as.sheet}>
                    <View style={as.drag} />
                    <View style={as.productRow}>
                        <Image source={{ uri: product.image }} style={as.productThumb} />
                        <View style={{ flex: 1 }}>
                            <Text style={as.productName} numberOfLines={1}>{product.name}</Text>
                            <Text style={as.productSku}>SKU: {product.sku}</Text>
                            <Text style={as.productPrice}>₹{product.price.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={as.divider} />
                    {PRODUCT_ACTIONS.map((action, i) => (
                        <TouchableOpacity key={i} style={[as.actionItem, action.label === "Delete Product" && as.actionItemDanger]} onPress={() => handleAction(action.label)} activeOpacity={0.75}>
                            <View style={[as.actionIcon, { backgroundColor: action.bg }]}><MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} /></View>
                            <Text style={[as.actionLabel, { color: action.label === "Delete Product" ? C.red : C.textDark }]}>{action.label}</Text>
                            <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={as.cancelBtn} onPress={onClose} activeOpacity={0.8}><Text style={as.cancelTxt}>Cancel</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const as = StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet: { backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 36, paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 28 },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 14, marginBottom: 18 },
    productRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 16 },
    productThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: C.bg },
    productName: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.textDark, marginBottom: 3 },
    productSku: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginBottom: 4 },
    productPrice: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.navy },
    divider: { height: 1, backgroundColor: C.border, marginBottom: 8 },
    actionItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, borderRadius: 12 },
    actionItemDanger: { marginTop: 4 },
    actionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    actionLabel: { flex: 1, fontFamily: "Outfit_600SemiBold", fontSize: 14 },
    cancelBtn: { marginTop: 10, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    cancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
});

// ─────────────────────────────────────────────────────────────
// WEB DESKTOP SCREEN — completely redesigned, web-only
// ─────────────────────────────────────────────────────────────
const WebProductsScreen: React.FC = () => {
    const router = useRouter();
    const [products, setProducts]               = useState<Product[]>(INITIAL_PRODUCTS);
    const [viewType, setViewType]               = useState<ViewType>("list");
    const [selectedTab, setSelectedTab]         = useState<TabType>("All Products");
    const [sortBy, setSortBy]                   = useState<SortType>("Latest");
    const [showFilter, setShowFilter]           = useState(false);
    const [searchQuery, setSearchQuery]         = useState("");
    const [visibleCount, setVisibleCount]       = useState(20);
    const [productActionId, setProductActionId] = useState<string | null>(null);
    const [locationProductId, setLocationProductId] = useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [filterCategory, setFilterCategory]       = useState("All");
    const [filterSubcategory, setFilterSubcategory] = useState("All");
    const [filterColor, setFilterColor]             = useState("All");
    const [filterSize, setFilterSize]               = useState("All");
    const [filterLowPrice, setFilterLowPrice]       = useState<number>(PRICE_MIN);
    const [filterHighPrice, setFilterHighPrice]     = useState<number>(PRICE_MAX);
    const [applied, setApplied] = useState({
        category: "All", subcategory: "All", color: "All", size: "All",
        lowPrice: PRICE_MIN, highPrice: PRICE_MAX,
    });

    const activeActionProduct = products.find(p => p.id === productActionId);
    const locationProduct     = products.find(p => p.id === locationProductId);

    const handleDelete = useCallback((id: string) => setProducts(prev => prev.filter(p => p.id !== id)), []);
    const handleUpdateLocation = useCallback((id: string) => setLocationProductId(id), []);

    const totalCount      = products.length;
    const activeCount     = products.filter(p => p.status === "Active").length;
    const inactiveCount   = products.filter(p => p.status === "Inactive").length;
    const outOfStockCount = products.filter(p => p.status === "Out of Stock").length;
    const lowStockCount   = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;

    const processedProducts = useMemo(() => {
        let list = [...products];
        if (selectedTab === "Low Stock") list = list.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
        else if (selectedTab !== "All Products") list = list.filter(p => p.status === selectedTab);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        }
        if (applied.category !== "All")    list = list.filter(p => p.category    === applied.category);
        if (applied.subcategory !== "All") list = list.filter(p => p.subcategory === applied.subcategory);
        if (applied.color !== "All")       list = list.filter(p => p.color       === applied.color);
        if (applied.size !== "All")        list = list.filter(p => p.size        === applied.size);
        list = list.filter(p => p.price >= applied.lowPrice && p.price <= applied.highPrice);
        switch (sortBy) {
            case "Price: Low-High": list.sort((a, b) => a.price - b.price); break;
            case "Price: High-Low": list.sort((a, b) => b.price - a.price); break;
            case "Name A-Z":        list.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "Oldest":          list.sort((a, b) => parseInt(a.id) - parseInt(b.id)); break;
            default:                list.sort((a, b) => parseInt(b.id) - parseInt(a.id)); break;
        }
        return list;
    }, [products, selectedTab, searchQuery, applied, sortBy]);

    const visibleProducts = processedProducts.slice(0, visibleCount);
    const hasMore         = visibleCount < processedProducts.length;

    const getStatusStyle = (status: string) => {
        if (status === "Active")       return { bg: "#DCFCE7", color: "#16A34A", dot: "#16A34A" };
        if (status === "Inactive")     return { bg: "#FEF9C3", color: "#B45309", dot: "#F59E0B" };
        if (status === "Out of Stock") return { bg: "#FEE2E2", color: "#DC2626", dot: "#EF4444" };
        return { bg: "#FEF3C7", color: "#D97706", dot: "#F97316" };
    };

    const applyFilters = () => {
        setApplied({ category: filterCategory, subcategory: filterSubcategory, color: filterColor, size: filterSize, lowPrice: filterLowPrice, highPrice: filterHighPrice });
        setVisibleCount(20);
        setShowFilter(false);
    };

    const clearFilters = () => {
        setFilterCategory("All"); setFilterSubcategory("All"); setFilterColor("All"); setFilterSize("All");
        setFilterLowPrice(PRICE_MIN); setFilterHighPrice(PRICE_MAX);
        setApplied({ category: "All", subcategory: "All", color: "All", size: "All", lowPrice: PRICE_MIN, highPrice: PRICE_MAX });
        setVisibleCount(20);
    };

    const activeFilterCount = [applied.category !== "All", applied.subcategory !== "All", applied.color !== "All", applied.size !== "All", applied.lowPrice > PRICE_MIN, applied.highPrice < PRICE_MAX].filter(Boolean).length;
    const subcatOptions = filterCategory !== "All" ? (SUBCATEGORIES[filterCategory] ?? ["All"]) : ["All"];

    // Web inline price range slider
    const [webLowPrice, setWebLowPrice] = useState(filterLowPrice);
    const [webHighPrice, setWebHighPrice] = useState(filterHighPrice);

    const webNavItems = [
        { icon: "home-outline", label: "Dashboard", route: "/(main)/dashboard" },
        { icon: "shopping-outline", label: "Products", route: "/(main)/productmanagement", active: true },
        { icon: "clipboard-list-outline", label: "Orders", route: "/(main)/Ordersscreen", badge: 12 },
        { icon: "message-outline", label: "Messages", route: "/messages" },
        { icon: "account-outline", label: "Profile", route: "/(main)/Profile" },
        { icon: "chart-bar", label: "Analytics", route: "/analytics" },
        { icon: "cog-outline", label: "Settings", route: "/settings" },
    ];

    return (
        <View style={wst.root}>
            {/* ── SIDEBAR ── */}
            <View style={[wst.sidebar, sidebarCollapsed && wst.sidebarCollapsed]}>
                {/* Logo */}
                <View style={wst.sidebarLogo}>
                    <View style={wst.logoIcon}>
                        <MaterialCommunityIcons name="shopping" size={20} color={C.white} />
                    </View>
                    {!sidebarCollapsed && <Text style={wst.logoText}>StoreHub</Text>}
                </View>

                {/* Nav */}
                <ScrollView style={wst.sidebarNav} showsVerticalScrollIndicator={false}>
                    {webNavItems.map((item, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[wst.navItem, item.active && wst.navItemActive]}
                            onPress={() => { if (!item.active) router.push(item.route as any); }}
                            activeOpacity={0.75}
                        >
                            <View style={{ position: "relative" }}>
                                <MaterialCommunityIcons name={item.icon as any} size={20} color={item.active ? C.white : "rgba(255,255,255,0.55)"} />
                                {item.badge && (
                                    <View style={wst.navBadge}><Text style={wst.navBadgeText}>{item.badge}</Text></View>
                                )}
                            </View>
                            {!sidebarCollapsed && <Text style={[wst.navLabel, item.active && wst.navLabelActive]}>{item.label}</Text>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Collapse toggle */}
                <TouchableOpacity style={wst.collapseBtn} onPress={() => setSidebarCollapsed(!sidebarCollapsed)}>
                    <Ionicons name={sidebarCollapsed ? "chevron-forward" : "chevron-back"} size={18} color="rgba(255,255,255,0.6)" />
                    {!sidebarCollapsed && <Text style={wst.collapseTxt}>Collapse</Text>}
                </TouchableOpacity>
            </View>

            {/* ── MAIN CONTENT ── */}
            <View style={wst.main}>
                {/* ── TOP BAR ── */}
                <View style={wst.topBar}>
                    <View style={wst.topBarLeft}>
                        <View style={wst.breadcrumb}>
                            <Text style={wst.breadcrumbDim}>Dashboard</Text>
                            <Ionicons name="chevron-forward" size={14} color={C.textLight} />
                            <Text style={wst.breadcrumbActive}>Products</Text>
                        </View>
                        <Text style={wst.topBarTitle}>Product Management</Text>
                    </View>
                    <View style={wst.topBarRight}>
                        {/* Search */}
                        <View style={wst.topSearch}>
                            <Feather name="search" size={15} color={C.textLight} />
                            <TextInput
                                style={wst.topSearchInput}
                                placeholder="Search products, SKU..."
                                placeholderTextColor={C.textLight}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <Ionicons name="close-circle" size={16} color={C.textLight} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {/* Add Product */}
                        <TouchableOpacity style={wst.addBtn} onPress={() => router.push("/(main)/Addnewproduct")} activeOpacity={0.85}>
                            <MaterialCommunityIcons name="plus" size={18} color={C.white} />
                            <Text style={wst.addBtnTxt}>Add Product</Text>
                        </TouchableOpacity>
                        {/* Bulk Upload */}
                        <TouchableOpacity style={wst.bulkBtn} onPress={() => router.push("/(main)/bulkupload")} activeOpacity={0.85}>
                            <MaterialCommunityIcons name="cloud-upload-outline" size={16} color={C.green} />
                            <Text style={wst.bulkBtnTxt}>Bulk Upload</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── STATS ROW ── */}
                <View style={wst.statsRow}>
                    {[
                        { label: "Total Products", value: totalCount, icon: "package-variant-closed", color: C.navy, bg: "#EEF1FF", trend: "+3 this week" },
                        { label: "Active",          value: activeCount,     icon: "check-circle",         color: "#16A34A", bg: "#DCFCE7", trend: "selling well" },
                        { label: "Inactive",        value: inactiveCount,   icon: "pause-circle",         color: "#B45309", bg: "#FEF9C3", trend: "needs review" },
                        { label: "Out of Stock",    value: outOfStockCount, icon: "close-circle-outline", color: "#DC2626", bg: "#FEE2E2", trend: "restock soon" },
                        { label: "Low Stock",       value: lowStockCount,   icon: "alert-circle-outline", color: C.orange,  bg: C.orangePale, trend: "≤10 units" },
                    ].map((stat, i) => (
                        <View key={i} style={wst.statCard}>
                            <View style={wst.statCardTop}>
                                <View style={[wst.statCardIcon, { backgroundColor: stat.bg }]}>
                                    <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
                                </View>
                                <Text style={[wst.statCardVal, { color: stat.color }]}>{stat.value}</Text>
                            </View>
                            <Text style={wst.statCardLabel}>{stat.label}</Text>
                            <Text style={wst.statCardTrend}>{stat.trend}</Text>
                        </View>
                    ))}
                </View>

                {/* ── CONTENT AREA: FILTER PANEL + TABLE ── */}
                <View style={wst.contentArea}>
                    {/* LEFT FILTER PANEL */}
                    <View style={wst.filterPanel}>
                        <View style={wst.filterPanelHeader}>
                            <View style={wst.filterPanelHeaderLeft}>
                                <Feather name="sliders" size={15} color={C.navy} />
                                <Text style={wst.filterPanelTitle}>Filters</Text>
                            </View>
                            {activeFilterCount > 0 && (
                                <TouchableOpacity onPress={clearFilters}>
                                    <Text style={wst.filterClearAll}>Clear all</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                            {/* Status tabs as filter */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Status</Text>
                                {TABS.map(tab => {
                                    const isActive = selectedTab === tab.label;
                                    return (
                                        <TouchableOpacity
                                            key={tab.label}
                                            style={[wst.filterTabItem, isActive && { backgroundColor: tab.bg }]}
                                            onPress={() => { setSelectedTab(tab.label); setVisibleCount(20); }}
                                            activeOpacity={0.75}
                                        >
                                            <View style={[wst.filterTabDot, { backgroundColor: tab.color }]} />
                                            <Text style={[wst.filterTabLabel, isActive && { color: tab.color, fontFamily: "Outfit_600SemiBold" }]}>{tab.label}</Text>
                                            {tab.label === "Low Stock" && <View style={[wst.filterTabBadge, { backgroundColor: tab.color }]}><Text style={wst.filterTabBadgeTxt}>{lowStockCount}</Text></View>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Category */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Category</Text>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[wst.filterRadioItem, filterCategory === cat && wst.filterRadioItemActive]}
                                        onPress={() => { setFilterCategory(cat); setFilterSubcategory("All"); }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[wst.filterRadio, filterCategory === cat && wst.filterRadioFilled]}>
                                            {filterCategory === cat && <View style={wst.filterRadioInner} />}
                                        </View>
                                        <Text style={[wst.filterRadioLabel, filterCategory === cat && { color: C.navy, fontFamily: "Outfit_600SemiBold" }]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Price Range */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Price Range</Text>
                                <View style={wst.priceRangeInputs}>
                                    <View style={wst.priceInput}>
                                        <Text style={wst.priceInputLabel}>Min</Text>
                                        <TextInput
                                            style={wst.priceInputField}
                                            value={String(filterLowPrice)}
                                            onChangeText={v => { const n = parseInt(v) || 0; setFilterLowPrice(Math.min(n, filterHighPrice)); }}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={wst.priceDash} />
                                    <View style={wst.priceInput}>
                                        <Text style={wst.priceInputLabel}>Max</Text>
                                        <TextInput
                                            style={wst.priceInputField}
                                            value={String(filterHighPrice)}
                                            onChangeText={v => { const n = parseInt(v) || PRICE_MAX; setFilterHighPrice(Math.max(n, filterLowPrice)); }}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                                <View style={wst.priceSliderTrack}>
                                    <View style={[wst.priceSliderFill, {
                                        left: `${(filterLowPrice / PRICE_MAX) * 100}%` as any,
                                        width: `${((filterHighPrice - filterLowPrice) / PRICE_MAX) * 100}%` as any,
                                    }]} />
                                </View>
                                <View style={wst.priceLabels}>
                                    <Text style={wst.priceLabel}>₹{filterLowPrice.toLocaleString()}</Text>
                                    <Text style={wst.priceLabel}>₹{filterHighPrice.toLocaleString()}</Text>
                                </View>
                            </View>

                            {/* Color */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Color</Text>
                                <View style={wst.colorGrid}>
                                    {COLOR_OPTIONS.filter(c => c !== "All").map(col => (
                                        <TouchableOpacity
                                            key={col}
                                            style={[wst.colorDot, { backgroundColor: DOT_COLORS[col] ?? "#ccc", borderWidth: filterColor === col ? 3 : 1.5, borderColor: filterColor === col ? C.navy : "rgba(0,0,0,0.1)" }]}
                                            onPress={() => setFilterColor(filterColor === col ? "All" : col)}
                                        >
                                            {filterColor === col && <Ionicons name="checkmark" size={10} color={col === "White" || col === "Yellow" ? C.textDark : C.white} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity style={wst.applyFilterBtn} onPress={applyFilters} activeOpacity={0.85}>
                                <Feather name="check" size={14} color={C.white} />
                                <Text style={wst.applyFilterBtnTxt}>Apply Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* RIGHT: TABLE AREA */}
                    <View style={wst.tableArea}>
                        {/* Table toolbar */}
                        <View style={wst.tableToolbar}>
                            <View style={wst.tableToolbarLeft}>
                                <Text style={wst.tableResultCount}>
                                    <Text style={{ fontFamily: "Outfit_700Bold", color: C.navy }}>{processedProducts.length}</Text>
                                    {" "}products
                                </Text>
                                {(searchQuery || activeFilterCount > 0) && (
                                    <TouchableOpacity style={wst.clearChip} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                                        <Text style={wst.clearChipTxt}>Clear filters</Text>
                                        <Ionicons name="close" size={12} color={C.navy} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={wst.tableToolbarRight}>
                                {/* Sort */}
                                <View style={wst.sortSelect}>
                                    <MaterialCommunityIcons name="sort-variant" size={15} color={C.textMid} />
                                    <Text style={wst.sortSelectLabel}>Sort:</Text>
                                    {SORT_OPTIONS.map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[wst.sortChip, sortBy === opt.value && wst.sortChipActive]}
                                            onPress={() => { setSortBy(opt.value); setVisibleCount(20); }}
                                        >
                                            <Text style={[wst.sortChipTxt, sortBy === opt.value && wst.sortChipTxtActive]}>{opt.value}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {/* View toggle */}
                                <View style={wst.viewToggle}>
                                    <TouchableOpacity style={[wst.viewBtn, viewType === "list" && wst.viewBtnActive]} onPress={() => setViewType("list")}>
                                        <MaterialCommunityIcons name="format-list-bulleted" size={16} color={viewType === "list" ? C.white : C.textMid} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[wst.viewBtn, viewType === "grid" && wst.viewBtnActive]} onPress={() => setViewType("grid")}>
                                        <MaterialCommunityIcons name="grid" size={16} color={viewType === "grid" ? C.white : C.textMid} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* ── LIST VIEW (table) ── */}
                        {viewType === "list" && (
                            <ScrollView style={wst.tableScroll} showsVerticalScrollIndicator={false}>
                                {/* Table header */}
                                <View style={wst.tableHead}>
                                    <Text style={[wst.tableHeadCell, { flex: 3 }]}>Product</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1.2 }]}>SKU</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1 }]}>Category</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.8 }]}>Price</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.7 }]}>Stock</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.9 }]}>Status</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.8, textAlign: "right" }]}>Actions</Text>
                                </View>
                                {visibleProducts.length === 0 ? (
                                    <View style={wst.emptyState}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={52} color={C.textLight} />
                                        <Text style={wst.emptyTitle}>No products found</Text>
                                        <Text style={wst.emptyDesc}>Try adjusting your search or filters</Text>
                                        <TouchableOpacity style={wst.emptyBtn} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                                            <Text style={wst.emptyBtnTxt}>Clear Filters</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    visibleProducts.map((product, idx) => {
                                        const st = getStatusStyle(product.status);
                                        const isLow = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
                                        return (
                                            <TouchableOpacity
                                                key={product.id}
                                                style={[wst.tableRow, idx % 2 === 1 && wst.tableRowAlt]}
                                                onPress={() => router.push("/(main)/Productdetail")}
                                                activeOpacity={0.7}
                                            >
                                                {/* Product col */}
                                                <View style={[wst.tableCell, { flex: 3 }]}>
                                                    <Image source={{ uri: product.image }} style={wst.tableProductImg} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={wst.tableProductName} numberOfLines={1}>{product.name}</Text>
                                                        <Text style={wst.tableProductSub}>{product.color} · {product.size}</Text>
                                                        <Text style={wst.tableProductUpdated}>Updated {product.updated}</Text>
                                                    </View>
                                                </View>
                                                <View style={[wst.tableCell, { flex: 1.2 }]}>
                                                    <Text style={wst.tableCellSku}>{product.sku}</Text>
                                                </View>
                                                <View style={[wst.tableCell, { flex: 1 }]}>
                                                    <View style={wst.categoryTag}>
                                                        <Text style={wst.categoryTagTxt} numberOfLines={1}>{product.category}</Text>
                                                    </View>
                                                    <Text style={wst.subcategoryTxt}>{product.subcategory}</Text>
                                                </View>
                                                <View style={[wst.tableCell, { flex: 0.8 }]}>
                                                    <Text style={wst.tablePriceVal}>₹{product.price.toLocaleString()}</Text>
                                                </View>
                                                <View style={[wst.tableCell, { flex: 0.7 }]}>
                                                    <Text style={[wst.tableStockVal, isLow && { color: C.orange }]}>{product.stock}</Text>
                                                    {isLow && <Text style={wst.lowStockHint}>Low ⚠</Text>}
                                                    {product.stock === 0 && <Text style={wst.outStockHint}>Out</Text>}
                                                </View>
                                                <View style={[wst.tableCell, { flex: 0.9 }]}>
                                                    <View style={[wst.statusPill, { backgroundColor: st.bg }]}>
                                                        <View style={[wst.statusDot, { backgroundColor: st.dot }]} />
                                                        <Text style={[wst.statusPillTxt, { color: st.color }]} numberOfLines={1}>{product.status}</Text>
                                                    </View>
                                                </View>
                                                <View style={[wst.tableCell, { flex: 0.8, justifyContent: "flex-end" }]}>
                                                    <TouchableOpacity
                                                        style={wst.actionBtn}
                                                        onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <MaterialCommunityIcons name="dots-horizontal" size={16} color={C.textMid} />
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                                {hasMore && (
                                    <TouchableOpacity style={wst.loadMoreBtn} onPress={() => setVisibleCount(c => c + 20)} activeOpacity={0.8}>
                                        <MaterialCommunityIcons name="chevron-down-circle-outline" size={16} color={C.navy} />
                                        <Text style={wst.loadMoreTxt}>Load more ({processedProducts.length - visibleCount} remaining)</Text>
                                    </TouchableOpacity>
                                )}
                                {visibleProducts.length > 0 && (
                                    <Text style={wst.pageInfo}>Showing {visibleProducts.length} of {processedProducts.length}</Text>
                                )}
                            </ScrollView>
                        )}

                        {/* ── GRID VIEW ── */}
                        {viewType === "grid" && (
                            <ScrollView style={wst.tableScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                {visibleProducts.length === 0 ? (
                                    <View style={wst.emptyState}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={52} color={C.textLight} />
                                        <Text style={wst.emptyTitle}>No products found</Text>
                                        <TouchableOpacity style={wst.emptyBtn} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                                            <Text style={wst.emptyBtnTxt}>Clear Filters</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={wst.webGridContainer}>
                                        {visibleProducts.map(product => {
                                            const st = getStatusStyle(product.status);
                                            return (
                                                <TouchableOpacity
                                                    key={product.id}
                                                    style={wst.webGridCard}
                                                    onPress={() => router.push("/(main)/Productdetail")}
                                                    activeOpacity={0.75}
                                                >
                                                    <View style={wst.webGridImgWrap}>
                                                        <Image source={{ uri: product.image }} style={wst.webGridImg} />
                                                        <View style={[wst.webGridStatusBadge, { backgroundColor: st.bg }]}>
                                                            <View style={[wst.statusDot, { backgroundColor: st.dot }]} />
                                                            <Text style={[wst.webGridStatusTxt, { color: st.color }]}>{product.status}</Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={wst.webGridMoreBtn}
                                                            onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}
                                                        >
                                                            <MaterialCommunityIcons name="dots-horizontal" size={16} color={C.textMid} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={wst.webGridInfo}>
                                                        <Text style={wst.webGridName} numberOfLines={2}>{product.name}</Text>
                                                        <Text style={wst.webGridSku}>{product.sku}</Text>
                                                        <View style={wst.webGridMeta}>
                                                            <Text style={wst.webGridPrice}>₹{product.price.toLocaleString()}</Text>
                                                            <Text style={wst.webGridStock}>Stock: {product.stock}</Text>
                                                        </View>
                                                        <View style={wst.categoryTag}>
                                                            <Text style={wst.categoryTagTxt}>{product.category}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                                {hasMore && (
                                    <TouchableOpacity style={wst.loadMoreBtn} onPress={() => setVisibleCount(c => c + 20)} activeOpacity={0.8}>
                                        <Text style={wst.loadMoreTxt}>Load more ({processedProducts.length - visibleCount} remaining)</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </View>

            {/* ── MODALS ── */}
            {productActionId && (
                <ProductActionSheet
                    product={activeActionProduct}
                    onClose={() => setProductActionId(null)}
                    onDelete={handleDelete}
                    onUpdateLocation={handleUpdateLocation}
                />
            )}
            {locationProductId && (
                <DeliveryLocationsModal
                    product={locationProduct}
                    onClose={() => setLocationProductId(null)}
                />
            )}
        </View>
    );
};

// ─────────────────────────────────────────────────────────────
// WEB DESKTOP STYLES
// ─────────────────────────────────────────────────────────────
const wst = StyleSheet.create({
    root: { flex: 1, flexDirection: "row", backgroundColor: "#F0F2F8", minHeight: "100%" as any },

    // SIDEBAR
    sidebar: { width: 220, backgroundColor: C.navyDeep, flexDirection: "column", paddingTop: 0 },
    sidebarCollapsed: { width: 64 },
    sidebarLogo: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
    logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" },
    logoText: { fontFamily: "Outfit_800ExtraBold", fontSize: 18, color: C.white, letterSpacing: 0.5 },
    sidebarNav: { flex: 1, paddingTop: 10 },
    navItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, marginHorizontal: 8, marginVertical: 2, borderRadius: 10 },
    navItemActive: { backgroundColor: "rgba(108,99,255,0.25)", borderLeftWidth: 3, borderLeftColor: C.purple, paddingLeft: 11 },
    navLabel: { fontFamily: "Outfit_500Medium", fontSize: 13.5, color: "rgba(255,255,255,0.55)" },
    navLabelActive: { fontFamily: "Outfit_600SemiBold", color: C.white },
    navBadge: { position: "absolute", top: -5, right: -8, backgroundColor: C.orange, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
    navBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: C.white },
    collapseBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
    collapseTxt: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "rgba(255,255,255,0.4)" },

    // MAIN
    main: { flex: 1, flexDirection: "column" },

    // TOP BAR
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, paddingHorizontal: 28, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
    topBarLeft: {},
    breadcrumb: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
    breadcrumbDim: { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: C.textLight },
    breadcrumbActive: { fontFamily: "Outfit_500Medium", fontSize: 11.5, color: C.navy },
    topBarTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: C.navyDeep, letterSpacing: -0.3 },
    topBarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    topSearch: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: C.border, width: 260 },
    topSearchInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13.5, color: C.textDark, outlineStyle: "none" as any },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
    addBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13.5, color: C.white },
    bulkBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.greenPale, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: C.green + "40" },
    bulkBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13.5, color: C.green },

    // STATS
    statsRow: { flexDirection: "row", gap: 14, paddingHorizontal: 24, paddingVertical: 18 },
    statCard: { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    statCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    statCardIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    statCardVal: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: C.textDark },
    statCardLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid, marginBottom: 4 },
    statCardTrend: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },

    // CONTENT AREA
    contentArea: { flex: 1, flexDirection: "row", gap: 0, paddingHorizontal: 24, paddingBottom: 24 },

    // FILTER PANEL
    filterPanel: { width: 230, backgroundColor: C.white, borderRadius: 16, marginRight: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    filterPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    filterPanelHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
    filterPanelTitle: { fontFamily: "Outfit_700Bold", fontSize: 14.5, color: C.navyDeep },
    filterClearAll: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.purple },
    filterSection: { marginBottom: 18 },
    filterSectionLabel: { fontFamily: "Outfit_700Bold", fontSize: 11.5, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
    filterTabItem: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, marginBottom: 3 },
    filterTabDot: { width: 7, height: 7, borderRadius: 3.5 },
    filterTabLabel: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    filterTabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
    filterTabBadgeTxt: { fontFamily: "Outfit_700Bold", fontSize: 10, color: C.white },
    filterRadioItem: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8 },
    filterRadioItemActive: { backgroundColor: "#EEF1FF" },
    filterRadio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    filterRadioFilled: { borderColor: C.navy },
    filterRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navy },
    filterRadioLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    priceRangeInputs: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    priceInput: { flex: 1 },
    priceInputLabel: { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight, marginBottom: 4 },
    priceInputField: { backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 7, fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textDark, outlineStyle: "none" as any },
    priceDash: { width: 12, height: 1.5, backgroundColor: C.border, marginTop: 14 },
    priceSliderTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 6, position: "relative" },
    priceSliderFill: { position: "absolute", height: 4, backgroundColor: C.navy, borderRadius: 2 },
    priceLabels: { flexDirection: "row", justifyContent: "space-between" },
    priceLabel: { fontFamily: "Outfit_500Medium", fontSize: 11, color: C.textMid },
    colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    colorDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    applyFilterBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: C.navy, borderRadius: 10, paddingVertical: 11, marginTop: 4 },
    applyFilterBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },

    // TABLE AREA
    tableArea: { flex: 1, backgroundColor: C.white, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: "hidden", flexDirection: "column" },

    // TOOLBAR
    tableToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
    tableToolbarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    tableResultCount: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    clearChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF1FF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    clearChipTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11.5, color: C.navy },
    tableToolbarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    sortSelect: { flexDirection: "row", alignItems: "center", gap: 6 },
    sortSelectLabel: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textLight, marginRight: 2 },
    sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    sortChipActive: { backgroundColor: C.navy, borderColor: C.navy },
    sortChipTxt: { fontFamily: "Outfit_500Medium", fontSize: 11.5, color: C.textMid },
    sortChipTxtActive: { color: C.white, fontFamily: "Outfit_600SemiBold" },
    viewToggle: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 8, padding: 3, borderWidth: 1, borderColor: C.border },
    viewBtn: { width: 30, height: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
    viewBtnActive: { backgroundColor: C.navy },

    // TABLE
    tableScroll: { flex: 1 },
    tableHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#F8F9FC", borderBottomWidth: 1.5, borderBottomColor: C.border },
    tableHeadCell: { fontFamily: "Outfit_700Bold", fontSize: 11.5, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 },
    tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    tableRowAlt: { backgroundColor: "#FAFBFF" },
    tableCell: { flexDirection: "row", alignItems: "center", paddingRight: 12, gap: 10 },
    tableProductImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: C.bg },
    tableProductName: { fontFamily: "Outfit_600SemiBold", fontSize: 13.5, color: C.textDark, marginBottom: 2 },
    tableProductSub: { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: C.textLight, marginBottom: 2 },
    tableProductUpdated: { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight },
    tableCellSku: { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: C.purple, backgroundColor: C.purplePale, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    categoryTag: { backgroundColor: "#EEF1FF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
    categoryTagTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.navy },
    subcategoryTxt: { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight, marginTop: 3 },
    tablePriceVal: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.navyDeep },
    tableStockVal: { fontFamily: "Outfit_600SemiBold", fontSize: 13.5, color: C.textDark },
    lowStockHint: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.orange, marginTop: 2 },
    outStockHint: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.red, marginTop: 2 },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "flex-start" },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11.5 },
    actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },

    // GRID
    webGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 16, padding: 20 },
    webGridCard: { width: "22%" as any, minWidth: 180, backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    webGridImgWrap: { position: "relative" },
    webGridImg: { width: "100%", height: 150, backgroundColor: C.bg },
    webGridStatusBadge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    webGridStatusTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10.5 },
    webGridMoreBtn: { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    webGridInfo: { padding: 12, gap: 5 },
    webGridName: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark, lineHeight: 18 },
    webGridSku: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },
    webGridMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    webGridPrice: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.navy },
    webGridStock: { fontFamily: "Outfit_500Medium", fontSize: 11, color: C.textLight },

    // MISC
    loadMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginVertical: 16, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.navy, backgroundColor: "#EEF1FF" },
    loadMoreTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.navy },
    pageInfo: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, textAlign: "center", paddingBottom: 16 },
    emptyState: { alignItems: "center", paddingVertical: 64 },
    emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textMid, marginTop: 14 },
    emptyDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textLight, marginTop: 4 },
    emptyBtn: { marginTop: 16, backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
    emptyBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },
});

// ─────────────────────────────────────────────────────────────
// ORIGINAL MOBILE SCREEN — unchanged
// ─────────────────────────────────────────────────────────────
const MobileProductsScreen: React.FC = () => {
    const router = useRouter();

    const [products, setProducts]               = useState<Product[]>(INITIAL_PRODUCTS);
    const [viewType, setViewType]               = useState<ViewType>("list");
    const [selectedTab, setSelectedTab]         = useState<TabType>("All Products");
    const [sortBy, setSortBy]                   = useState<SortType>("Latest");
    const [showSortMenu, setShowSortMenu]       = useState(false);
    const [showFilter, setShowFilter]           = useState(false);
    const [showSearch, setShowSearch]           = useState(false);
    const [searchQuery, setSearchQuery]         = useState("");
    const [viewRange, setViewRange]             = useState<number>(20);
    const [visibleCount, setVisibleCount]       = useState(20);
    const [productActionId, setProductActionId] = useState<string | null>(null);
    const [locationProductId, setLocationProductId] = useState<string | null>(null);

    const activeActionProduct = products.find(p => p.id === productActionId);
    const locationProduct     = products.find(p => p.id === locationProductId);

    const [filterCategory, setFilterCategory]       = useState("All");
    const [filterSubcategory, setFilterSubcategory] = useState("All");
    const [filterColor, setFilterColor]             = useState("All");
    const [filterSize, setFilterSize]               = useState("All");
    const [filterLowPrice, setFilterLowPrice]       = useState<number>(PRICE_MIN);
    const [filterHighPrice, setFilterHighPrice]     = useState<number>(PRICE_MAX);
    const [applied, setApplied] = useState({
        category: "All", subcategory: "All", color: "All", size: "All",
        lowPrice: PRICE_MIN, highPrice: PRICE_MAX,
    });

    const handleDelete = useCallback((id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    }, []);

    const handleUpdateLocation = useCallback((id: string) => {
        setLocationProductId(id);
    }, []);

    const totalCount      = products.length;
    const activeCount     = products.filter(p => p.status === "Active").length;
    const inactiveCount   = products.filter(p => p.status === "Inactive").length;
    const outOfStockCount = products.filter(p => p.status === "Out of Stock").length;
    const lowStockCount   = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;

    const PRODUCT_STATS = [
        { icon:"shopping-outline",     label:"Total",        value:String(totalCount),      color:C.navy,   bg:"rgba(30,43,107,0.10)" },
        { icon:"check-circle",         label:"Active",       value:String(activeCount),     color:C.green,  bg:C.greenPale            },
        { icon:"pause-circle",         label:"Inactive",     value:String(inactiveCount),   color:C.yellow, bg:C.yellowPale           },
        { icon:"close-circle-outline", label:"Out of Stock", value:String(outOfStockCount), color:C.red,    bg:C.redPale              },
    ];

    const processedProducts = useMemo(() => {
        let list = [...products];
        if (selectedTab === "Low Stock") {
            list = list.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
        } else if (selectedTab !== "All Products") {
            list = list.filter(p => p.status === selectedTab);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q)
            );
        }
        if (applied.category !== "All")    list = list.filter(p => p.category    === applied.category);
        if (applied.subcategory !== "All") list = list.filter(p => p.subcategory === applied.subcategory);
        if (applied.color !== "All")       list = list.filter(p => p.color       === applied.color);
        if (applied.size !== "All")        list = list.filter(p => p.size        === applied.size);
        list = list.filter(p => p.price >= applied.lowPrice && p.price <= applied.highPrice);

        switch (sortBy) {
            case "Price: Low-High": list.sort((a, b) => a.price - b.price); break;
            case "Price: High-Low": list.sort((a, b) => b.price - a.price); break;
            case "Name A-Z":        list.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "Oldest":          list.sort((a, b) => parseInt(a.id) - parseInt(b.id)); break;
            default:                list.sort((a, b) => parseInt(b.id) - parseInt(a.id)); break;
        }
        return list;
    }, [products, selectedTab, searchQuery, applied, sortBy]);

    const visibleProducts = processedProducts.slice(0, visibleCount);
    const hasMore         = visibleCount < processedProducts.length;

    const getStatusColor = (status: string) => {
        if (status === "Active")   return { bg: C.greenPale,  color: C.green  };
        if (status === "Inactive") return { bg: C.yellowPale, color: C.yellow };
        return                            { bg: C.redPale,    color: C.red    };
    };

    const applyFilters = () => {
        setApplied({ category: filterCategory, subcategory: filterSubcategory, color: filterColor, size: filterSize, lowPrice: filterLowPrice, highPrice: filterHighPrice });
        setVisibleCount(viewRange);
        setShowFilter(false);
    };

    const clearFilters = () => {
        setFilterCategory("All"); setFilterSubcategory("All");
        setFilterColor("All");    setFilterSize("All");
        setFilterLowPrice(PRICE_MIN); setFilterHighPrice(PRICE_MAX);
        setApplied({ category:"All", subcategory:"All", color:"All", size:"All", lowPrice:PRICE_MIN, highPrice:PRICE_MAX });
        setVisibleCount(viewRange);
    };

    const activeFilterCount = [
        applied.category !== "All", applied.subcategory !== "All",
        applied.color !== "All",    applied.size !== "All",
        applied.lowPrice > PRICE_MIN, applied.highPrice < PRICE_MAX,
    ].filter(Boolean).length;

    const handleTabChange       = (tab: TabType) => { setSelectedTab(tab); setVisibleCount(viewRange); };
    const handleSortSelect      = (opt: SortType) => { setSortBy(opt); setShowSortMenu(false); setVisibleCount(viewRange); };
    const handleViewRangeChange = (vr: number)   => { setViewRange(vr); setVisibleCount(vr); };

    const subcatOptions = filterCategory !== "All" ? (SUBCATEGORIES[filterCategory] ?? ["All"]) : ["All"];
    const currentSortOption = SORT_OPTIONS.find(o => o.value === sortBy);

    return (
        <SafeAreaView style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
            <View style={s.headerWrapper}>
                {showSearch ? (
                    <View style={s.searchBarRow}>
                        <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(""); setVisibleCount(viewRange); }} style={s.backBtn}>
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <TextInput style={s.searchInput} placeholder="Search products, SKU, category..." placeholderTextColor="rgba(255,255,255,0.5)" value={searchQuery} onChangeText={t => { setSearchQuery(t); setVisibleCount(viewRange); }} autoFocus />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(""); setVisibleCount(viewRange); }}>
                                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <View style={s.headerContent}>
                            <Text style={s.headerTitle}>Products</Text>
                            <Text style={s.headerSub}>Manage and view your products</Text>
                        </View>
                        <TouchableOpacity style={s.headerIcon} onPress={() => setShowSearch(true)}>
                            <Feather name="search" size={21} color={C.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.headerIcon} onPress={() => setShowFilter(true)}>
                            <View>
                                <Feather name="filter" size={21} color={C.white} />
                                {activeFilterCount > 0 && (
                                    <View style={s.filterBadge}><Text style={s.filterBadgeText}>{activeFilterCount}</Text></View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={s.actionRow}>
                    <TouchableOpacity style={s.actionCard} activeOpacity={0.75} onPress={() => router.push("/(main)/Addnewproduct")}>
                        <View style={[s.actionIconBox, { backgroundColor: "rgba(30,43,107,0.10)" }]}>
                            <MaterialCommunityIcons name="plus-box-outline" size={28} color={C.navy} />
                        </View>
                        <Text style={s.actionTitle}>Add New Product</Text>
                        <Text style={s.actionDesc}>Create and add a new product</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionCard} activeOpacity={0.75} onPress={() => router.push("/(main)/bulkupload")}>
                        <View style={[s.actionIconBox, { backgroundColor: C.greenPale }]}>
                            <MaterialCommunityIcons name="cloud-upload-outline" size={28} color={C.green} />
                        </View>
                        <Text style={[s.actionTitle, { color: C.green }]}>Bulk Upload</Text>
                        <Text style={s.actionDesc}>Upload products via CSV</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.statsCard}>
                    {PRODUCT_STATS.map((stat, i) => (
                        <React.Fragment key={i}>
                            <View style={s.statItem}>
                                <View style={[s.statIconBox, { backgroundColor: stat.bg }]}>
                                    <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
                                </View>
                                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                                <Text style={s.statLabel}>{stat.label}</Text>
                            </View>
                            {i < PRODUCT_STATS.length - 1 && <View style={s.statDivider} />}
                        </React.Fragment>
                    ))}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScrollContent} style={s.tabScrollWrapper}>
                    {TABS.map(tab => {
                        const isActive = selectedTab === tab.label;
                        return (
                            <TouchableOpacity key={tab.label} style={[s.tabBtn, isActive && { backgroundColor: tab.color, borderColor: tab.color }, !isActive && { borderColor: C.border }]} onPress={() => handleTabChange(tab.label)} activeOpacity={0.75}>
                                <MaterialCommunityIcons name={tab.icon as any} size={14} color={isActive ? C.white : tab.color} />
                                <Text style={[s.tabBtnText, { color: isActive ? C.white : C.textMid }, isActive && { fontFamily: "Outfit_700Bold" }]}>{tab.label}</Text>
                                {tab.label === "Low Stock" && (
                                    <View style={[s.tabBadgePill, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : C.orangePale }]}>
                                        <Text style={[s.tabBadgePillTxt, { color: isActive ? C.white : C.orange }]}>{lowStockCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View>
                    <View style={s.controlsRow}>
                        <TouchableOpacity style={s.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)} activeOpacity={0.8}>
                            <View style={s.sortBtnLeft}>
                                <View style={s.sortIconWrap}>
                                    <MaterialCommunityIcons name={currentSortOption?.icon as any ?? "sort-variant"} size={14} color={C.white} />
                                </View>
                                <View>
                                    <Text style={s.sortBtnLabel}>Sort by</Text>
                                    <Text style={s.sortBtnValue} numberOfLines={1}>{sortBy}</Text>
                                </View>
                            </View>
                            <View style={s.sortBtnRight}>
                                <View style={s.viewRangePill}>
                                    <Text style={s.viewRangePillTxt}>{viewRange >= processedProducts.length ? "All" : viewRange}</Text>
                                </View>
                                <Ionicons name={showSortMenu ? "chevron-up" : "chevron-down"} size={14} color={C.navy} />
                            </View>
                        </TouchableOpacity>
                        <View style={s.viewToggle}>
                            <TouchableOpacity style={[s.viewBtn, viewType === "list" && s.viewBtnActive]} onPress={() => setViewType("list")}>
                                <MaterialCommunityIcons name="format-list-bulleted" size={17} color={viewType === "list" ? C.white : C.textLight} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.viewBtn, viewType === "grid" && s.viewBtnActive]} onPress={() => setViewType("grid")}>
                                <MaterialCommunityIcons name="grid" size={17} color={viewType === "grid" ? C.white : C.textLight} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showSortMenu && (
                        <View style={s.sortMenuWrapper}>
                            <View style={s.sortMenu}>
                                <View style={s.sortMenuHeader}>
                                    <MaterialCommunityIcons name="sort-variant" size={14} color={C.navy} />
                                    <Text style={s.sortMenuTitle}>Sort By</Text>
                                </View>
                                {SORT_OPTIONS.map((opt, idx) => {
                                    const isActive = sortBy === opt.value;
                                    return (
                                        <TouchableOpacity key={opt.value} style={[s.sortRow, isActive && s.sortRowActive, idx < SORT_OPTIONS.length - 1 && s.sortRowBorder]} onPress={() => handleSortSelect(opt.value)} activeOpacity={0.75}>
                                            <View style={[s.sortRowIconWrap, { backgroundColor: isActive ? C.navy : C.bg }]}>
                                                <MaterialCommunityIcons name={opt.icon as any} size={16} color={isActive ? C.white : C.textMid} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.sortRowLabel, isActive && s.sortRowLabelActive]}>{opt.value}</Text>
                                                <Text style={[s.sortRowDesc, isActive && s.sortRowDescActive]}>{opt.desc}</Text>
                                            </View>
                                            {isActive ? <Ionicons name="checkmark-circle" size={20} color={C.navy} /> : <Ionicons name="radio-button-off" size={20} color={C.border} />}
                                        </TouchableOpacity>
                                    );
                                })}
                                <View style={s.sortMenuDivider} />
                                <View style={s.viewRangeSection}>
                                    <View style={s.viewRangeLabelRow}>
                                        <View style={s.viewRangeIconWrap}><MaterialCommunityIcons name="eye-outline" size={14} color={C.navy} /></View>
                                        <Text style={s.viewRangeLabel}>Show per page</Text>
                                    </View>
                                    <View style={s.viewRangeChips}>
                                        {VIEW_RANGE_OPTIONS.map(vr => (
                                            <TouchableOpacity key={vr} style={[s.viewRangeChip, viewRange === vr && s.viewRangeChipActive]} onPress={() => handleViewRangeChange(vr)} activeOpacity={0.75}>
                                                <Text style={[s.viewRangeChipTxt, viewRange === vr && s.viewRangeChipTxtActive]}>{vr}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity style={[s.viewRangeChip, viewRange >= products.length && s.viewRangeChipActive]} onPress={() => handleViewRangeChange(products.length)} activeOpacity={0.75}>
                                            <Text style={[s.viewRangeChipTxt, viewRange >= products.length && s.viewRangeChipTxtActive]}>All</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                <View style={s.resultCountRow}>
                    <Text style={s.resultCountText}>{processedProducts.length} product{processedProducts.length !== 1 ? "s" : ""} found</Text>
                    {(searchQuery || activeFilterCount > 0) && (
                        <TouchableOpacity onPress={() => { setSearchQuery(""); clearFilters(); }}>
                            <Text style={s.clearAllText}>Clear all</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {visibleProducts.length === 0 && (
                    <View style={s.emptyState}>
                        <MaterialCommunityIcons name="package-variant-closed" size={52} color={C.textLight} />
                        <Text style={s.emptyTitle}>No products found</Text>
                        <Text style={s.emptyDesc}>Try adjusting your search or filters</Text>
                        <TouchableOpacity style={s.clearBtn} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                            <Text style={s.clearBtnText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {viewType === "list" && visibleProducts.length > 0 && (
                    <View style={s.listContainer}>
                        {visibleProducts.map(product => {
                            const st    = getStatusColor(product.status);
                            const isLow = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
                            return (
                                <TouchableOpacity key={product.id} style={s.productRow} activeOpacity={0.7} onPress={() => router.push("/(main)/Productdetail")}>
                                    <Image source={{ uri: product.image }} style={s.productImage} />
                                    <View style={s.productInfo}>
                                        <Text style={s.productName} numberOfLines={1}>{product.name}</Text>
                                        <Text style={s.productSku}>SKU: {product.sku}</Text>
                                        <Text style={s.productCategory}>{product.category} · {product.subcategory}</Text>
                                        <Text style={s.productUpdated}>Updated: {product.updated}</Text>
                                        <Text style={s.productPrice}>₹{product.price.toLocaleString()}</Text>
                                    </View>
                                    <View style={s.productRight}>
                                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                                            <Text style={[s.statusText, { color: st.color }]}>{product.status}</Text>
                                        </View>
                                        <Text style={[s.stockText, isLow && { color: C.orange }]}>Stock: {product.stock}{isLow ? " ⚠" : ""}</Text>
                                        <TouchableOpacity style={s.moreBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}>
                                            <MaterialCommunityIcons name="dots-vertical" size={18} color={C.textMid} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {viewType === "grid" && visibleProducts.length > 0 && (
                    <View style={s.gridContainer}>
                        {visibleProducts.map(product => {
                            const st = getStatusColor(product.status);
                            return (
                                <TouchableOpacity key={product.id} style={s.gridCard} activeOpacity={0.7} onPress={() => router.push("/(main)/Productdetail")}>
                                    <Image source={{ uri: product.image }} style={s.gridImage} />
                                    <View style={[s.statusBadgeSmall, { backgroundColor: st.bg }]}>
                                        <Text style={[s.statusTextSmall, { color: st.color }]}>{product.status}</Text>
                                    </View>
                                    <Text style={s.gridName} numberOfLines={2}>{product.name}</Text>
                                    <Text style={s.gridPrice}>₹{product.price.toLocaleString()}</Text>
                                    <Text style={s.gridStock}>Stock: {product.stock}</Text>
                                    <TouchableOpacity style={s.gridMoreBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}>
                                        <MaterialCommunityIcons name="dots-horizontal" size={18} color={C.textLight} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {hasMore && processedProducts.length > 0 && (
                    <TouchableOpacity style={s.viewMoreBtn} onPress={() => setVisibleCount(c => c + viewRange)} activeOpacity={0.75}>
                        <MaterialCommunityIcons name="chevron-down-circle-outline" size={18} color={C.navy} />
                        <Text style={s.viewMoreTxt}>View More ({processedProducts.length - visibleCount} remaining)</Text>
                    </TouchableOpacity>
                )}
                {visibleProducts.length > 0 && (
                    <Text style={s.pageInfo}>Showing {visibleProducts.length} of {processedProducts.length} products</Text>
                )}
            </ScrollView>

            <View style={s.bottomTabBar}>
                {[
                    { icon:"home-outline",          label:"Dashboard", route:"/(main)/dashboard"                      },
                    { icon:"shopping-outline",       label:"Products",  route:"/(main)/productmanagement", active:true  },
                    { icon:"clipboard-list-outline", label:"Orders",    route:"/(main)/Ordersscreen",      badge:12     },
                    { icon:"message-outline",        label:"Messages",  route:"/messages"                              },
                    { icon:"account-outline",        label:"Profile",   route:"/(main)/Profile"                        },
                ].map((tab, i) => (
                    <TouchableOpacity key={i} style={s.tabItem} activeOpacity={0.7} onPress={() => { if (!tab.active) router.push(tab.route as any); }}>
                        <View style={{ position:"relative" }}>
                            <MaterialCommunityIcons name={tab.icon as any} size={26} color={tab.active ? C.navy : C.textLight} />
                            {tab.badge && <View style={s.tabBadge}><Text style={s.tabBadgeText}>{tab.badge}</Text></View>}
                        </View>
                        <Text style={[s.tabLabel, tab.active && { color:C.navy, fontFamily:"Outfit_600SemiBold" }]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Modal visible={showFilter} animationType="slide" transparent onRequestClose={() => setShowFilter(false)}>
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFilter(false)} />
                <View style={s.filterSheet}>
                    <View style={s.filterHeader}>
                        <Text style={s.filterTitle}>Filter Products</Text>
                        <TouchableOpacity onPress={() => setShowFilter(false)}><Ionicons name="close" size={24} color={C.textDark} /></TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                        <Text style={fs.sectionLabel}>Category</Text>
                        <WrapChipGroup options={CATEGORIES} selected={filterCategory} onSelect={v => { setFilterCategory(v); setFilterSubcategory("All"); }} />
                        {filterCategory !== "All" && (
                            <><Text style={fs.sectionLabel}>Subcategory</Text><WrapChipGroup options={subcatOptions} selected={filterSubcategory} onSelect={setFilterSubcategory} /></>
                        )}
                        <Text style={fs.sectionLabel}>Color</Text>
                        <WrapColorGroup selected={filterColor} onSelect={setFilterColor} />
                        <Text style={fs.sectionLabel}>Size</Text>
                        <View style={fs.sizeGrid}>
                            {SIZE_OPTIONS.map(sz => (
                                <TouchableOpacity key={sz} style={[fs.sizeChip, filterSize === sz && fs.sizeChipActive]} onPress={() => setFilterSize(sz)}>
                                    <Text style={[fs.sizeChipTxt, filterSize === sz && fs.sizeChipTxtActive]}>{sz}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={fs.sectionLabel}>Price Range</Text>
                        <View style={s.sliderWrap}>
                            <RangeSlider low={filterLowPrice} high={filterHighPrice} min={PRICE_MIN} max={PRICE_MAX} step={100} onLowChange={setFilterLowPrice} onHighChange={setFilterHighPrice} />
                        </View>
                    </ScrollView>
                    <View style={s.filterActions}>
                        <TouchableOpacity style={s.clearFilterBtn} onPress={clearFilters}><Text style={s.clearFilterText}>Clear All</Text></TouchableOpacity>
                        <TouchableOpacity style={s.applyFilterBtn} onPress={applyFilters}><Text style={s.applyFilterText}>Apply Filters</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {productActionId && (
                <ProductActionSheet product={activeActionProduct} onClose={() => setProductActionId(null)} onDelete={handleDelete} onUpdateLocation={handleUpdateLocation} />
            )}
            {locationProductId && (
                <DeliveryLocationsModal product={locationProduct} onClose={() => setLocationProductId(null)} />
            )}
        </SafeAreaView>
    );
};

// ─────────────────────────────────────────────────────────────
// MOBILE STYLES (unchanged from original)
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex:1, backgroundColor:C.bg },
    headerWrapper:   { backgroundColor:C.navyDeep, paddingTop:Platform.OS==="android"?(StatusBar.currentHeight??0)+4:0, paddingBottom:4 },
    headerRow:       { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10, gap:8 },
    searchBarRow:    { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10, gap:10 },
    backBtn:         { width:38, height:38, borderRadius:19, alignItems:"center", justifyContent:"center" },
    headerContent:   { flex:1 },
    headerTitle:     { fontFamily:"Outfit_700Bold",    fontSize:19, color:C.white, marginBottom:1 },
    headerSub:       { fontFamily:"Outfit_400Regular", fontSize:12, color:"rgba(255,255,255,0.65)" },
    headerIcon:      { width:38, height:38, borderRadius:19, alignItems:"center", justifyContent:"center" },
    searchInput:     { flex:1, fontFamily:"Outfit_400Regular", fontSize:14, color:C.white, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.4)", paddingVertical:4 },
    filterBadge:     { position:"absolute", top:-4, right:-4, backgroundColor:C.orange, width:16, height:16, borderRadius:8, alignItems:"center", justifyContent:"center" },
    filterBadgeText: { fontFamily:"Outfit_700Bold", fontSize:9, color:C.white },
    actionRow:    { flexDirection:"row", paddingHorizontal:16, paddingTop:14, paddingBottom:6, gap:12 },
    actionCard:   { flex:1, backgroundColor:C.card, borderRadius:16, padding:12, alignItems:"flex-start", shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:3, position:"relative", height:130 },
    actionIconBox:{ width:48, height:48, borderRadius:13, alignItems:"center", justifyContent:"center", marginBottom:10 },
    actionTitle:  { fontFamily:"Outfit_700Bold",    fontSize:13, color:C.navy, marginBottom:3 },
    actionDesc:   { fontFamily:"Outfit_400Regular", fontSize:11, color:C.textLight, lineHeight:15, marginBottom:10 },
    statsCard:   { flexDirection:"row", alignItems:"center", backgroundColor:C.card, borderRadius:16, marginHorizontal:16, marginTop:4, marginBottom:10, paddingVertical:16, paddingHorizontal:8, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:3 },
    statItem:    { flex:1, alignItems:"center", gap:4 },
    statIconBox: { width:40, height:40, borderRadius:11, alignItems:"center", justifyContent:"center", marginBottom:4 },
    statValue:   { fontFamily:"Outfit_800ExtraBold", fontSize:18, color:C.textDark },
    statLabel:   { fontFamily:"Outfit_400Regular", fontSize:9.5, color:C.textLight, textAlign:"center" },
    statDivider: { width:1, height:52, backgroundColor:C.border, marginHorizontal:2 },
    tabScrollWrapper: { marginBottom:8 },
    tabScrollContent: { paddingHorizontal:16, gap:8, paddingVertical:4 },
    tabBtn:      { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:12, paddingVertical:9, borderRadius:22, borderWidth:1.5, backgroundColor:C.card },
    tabBtnText:  { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.textMid },
    tabBadgePill:    { paddingHorizontal:6, paddingVertical:1, borderRadius:10 },
    tabBadgePillTxt: { fontFamily:"Outfit_700Bold", fontSize:10 },
    controlsRow:  { flexDirection:"row", alignItems:"center", paddingHorizontal:16, gap:8, marginBottom:0 },
    sortBtn: { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"space-between", backgroundColor:C.card, borderRadius:12, paddingLeft:6, paddingRight:12, paddingVertical:6, borderWidth:1, borderColor:C.border, shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:4, elevation:2 },
    sortBtnLeft: { flexDirection:"row", alignItems:"center", gap:10 },
    sortIconWrap: { width:34, height:34, borderRadius:10, backgroundColor:C.navy, alignItems:"center", justifyContent:"center" },
    sortBtnLabel: { fontFamily:"Outfit_400Regular", fontSize:10, color:C.textLight },
    sortBtnValue: { fontFamily:"Outfit_700Bold", fontSize:12, color:C.navy, maxWidth:SW * 0.3 },
    sortBtnRight: { flexDirection:"row", alignItems:"center", gap:6 },
    viewRangePill: { backgroundColor:C.navyDeep+"12", borderRadius:6, paddingHorizontal:8, paddingVertical:3 },
    viewRangePillTxt: { fontFamily:"Outfit_700Bold", fontSize:11, color:C.navy },
    viewToggle:   { flexDirection:"row", backgroundColor:C.card, borderRadius:10, padding:3, borderWidth:1, borderColor:C.border },
    viewBtn:      { width:34, height:34, borderRadius:8, alignItems:"center", justifyContent:"center" },
    viewBtnActive:{ backgroundColor:C.navy },
    sortMenuWrapper: { paddingHorizontal:18, paddingTop:4, marginBottom:6, width:320 },
    sortMenu: { marginHorizontal:0, marginBottom:0, backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, overflow:"hidden", elevation:8, shadowColor:"#000", shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:14 },
    sortMenuHeader: { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:16, paddingTop:14, paddingBottom:10 },
    sortMenuTitle: { fontFamily:"Outfit_700Bold", fontSize:14, color:C.navy },
    sortRow: { flexDirection:"row", alignItems:"center", gap:12, paddingHorizontal:16, paddingVertical:12 },
    sortRowActive: { backgroundColor:"#F0F2FF" },
    sortRowBorder: { borderBottomWidth:1, borderBottomColor:C.border },
    sortRowIconWrap: { width:36, height:36, borderRadius:10, alignItems:"center", justifyContent:"center" },
    sortRowLabel: { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.textDark, marginBottom:1 },
    sortRowLabelActive: { color:C.navy, fontFamily:"Outfit_700Bold" },
    sortRowDesc: { fontFamily:"Outfit_400Regular", fontSize:11, color:C.textLight },
    sortRowDescActive: { color:C.navyLight },
    sortMenuDivider: { height:1, backgroundColor:C.border, marginVertical:4, marginHorizontal:16 },
    viewRangeSection: { paddingHorizontal:16, paddingBottom:14, paddingTop:6 },
    viewRangeLabelRow:{ flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 },
    viewRangeIconWrap: { width:26, height:26, borderRadius:8, backgroundColor:"rgba(30,43,107,0.10)", alignItems:"center", justifyContent:"center" },
    viewRangeLabel:   { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.textMid },
    viewRangeChips:   { flexDirection:"row", gap:8, flexWrap:"wrap" },
    viewRangeChip:    { paddingHorizontal:16, paddingVertical:8, borderRadius:9, backgroundColor:C.bg, borderWidth:1.5, borderColor:C.border, minWidth:48, alignItems:"center" },
    viewRangeChipActive:    { backgroundColor:C.navy, borderColor:C.navy },
    viewRangeChipTxt:       { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.textMid },
    viewRangeChipTxtActive: { color:C.white },
    resultCountRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, marginTop:8, marginBottom:8 },
    resultCountText:{ fontFamily:"Outfit_500Medium", fontSize:12, color:C.textLight },
    clearAllText:   { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.navy },
    emptyState:  { alignItems:"center", paddingVertical:48, paddingHorizontal:32 },
    emptyTitle:  { fontFamily:"Outfit_700Bold",    fontSize:16, color:C.textMid,   marginTop:12 },
    emptyDesc:   { fontFamily:"Outfit_400Regular", fontSize:13, color:C.textLight, marginTop:4, textAlign:"center" },
    clearBtn:    { marginTop:16, backgroundColor:C.navy, borderRadius:10, paddingHorizontal:24, paddingVertical:10 },
    clearBtnText:{ fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.white },
    listContainer: { paddingHorizontal:16, gap:12, marginBottom:10 },
    productRow:    { flexDirection:"row", alignItems:"center", backgroundColor:C.card, borderRadius:16, padding:14, gap:12, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:6, elevation:2 },
    productImage:  { width:90, height:90, borderRadius:12, backgroundColor:C.bg },
    productInfo:   { flex:1 },
    productName:   { fontFamily:"Outfit_700Bold",    fontSize:14, color:C.textDark, marginBottom:3 },
    productSku:    { fontFamily:"Outfit_400Regular", fontSize:11, color:C.textLight, marginBottom:2 },
    productCategory:{ fontFamily:"Outfit_500Medium", fontSize:11, color:C.purple,   marginBottom:2 },
    productUpdated:{ fontFamily:"Outfit_400Regular", fontSize:11, color:C.textLight, marginBottom:6 },
    productPrice:  { fontFamily:"Outfit_700Bold",    fontSize:15, color:C.navy },
    productRight:  { alignItems:"flex-end", gap:6 },
    statusBadge:   { paddingHorizontal:9, paddingVertical:4, borderRadius:7 },
    statusText:    { fontFamily:"Outfit_600SemiBold", fontSize:10 },
    stockText:     { fontFamily:"Outfit_600SemiBold", fontSize:11, color:C.textMid },
    moreBtn:       { width:32, height:32, borderRadius:9, backgroundColor:C.bg, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:C.border },
    gridContainer: { flexDirection:"row", flexWrap:"wrap", paddingHorizontal:12, gap:10, marginBottom:10 },
    gridCard:      { width:(SW-52)/2, backgroundColor:C.card, borderRadius:14, overflow:"hidden", shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:6, elevation:2 },
    gridImage:     { width:"100%", height:130, backgroundColor:C.bg },
    statusBadgeSmall: { position:"absolute", top:8, right:8, paddingHorizontal:6, paddingVertical:3, borderRadius:5 },
    statusTextSmall:  { fontFamily:"Outfit_600SemiBold", fontSize:10 },
    gridName:  { fontFamily:"Outfit_700Bold",   fontSize:12, color:C.textDark, paddingHorizontal:10, paddingTop:10, paddingBottom:2 },
    gridPrice: { fontFamily:"Outfit_700Bold",   fontSize:13, color:C.navy,     paddingHorizontal:10, marginBottom:2 },
    gridStock: { fontFamily:"Outfit_500Medium", fontSize:11, color:C.textLight, paddingHorizontal:10, paddingBottom:10 },
    gridMoreBtn: { position:"absolute", bottom:8, right:8, width:28, height:28, borderRadius:8, backgroundColor:C.bg, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:C.border },
    viewMoreBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, marginHorizontal:16, marginTop:4, marginBottom:4, paddingVertical:13, borderRadius:12, borderWidth:1.5, borderColor:C.navy, backgroundColor:C.card },
    viewMoreTxt: { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.navy },
    pageInfo:    { fontFamily:"Outfit_400Regular", fontSize:12, color:C.textLight, textAlign:"center", paddingBottom:8, marginTop:4 },
    bottomTabBar: { flexDirection:"row", backgroundColor:C.white, borderTopWidth:1, borderTopColor:C.border, paddingBottom:8, paddingTop:8, shadowColor:"#000", shadowOffset:{width:0,height:-4}, shadowOpacity:0.06, shadowRadius:12, elevation:10 },
    tabItem:      { flex:1, alignItems:"center", gap:3 },
    tabLabel:     { fontFamily:"Outfit_500Medium", fontSize:11, color:C.textLight },
    tabBadge:     { position:"absolute", top:-4, right:-9, backgroundColor:C.orange, minWidth:17, height:17, borderRadius:8.5, alignItems:"center", justifyContent:"center", paddingHorizontal:3 },
    tabBadgeText: { fontFamily:"Outfit_700Bold", fontSize:9, color:"#fff" },
    modalOverlay:   { flex:1, backgroundColor:"rgba(0,0,0,0.4)" },
    filterSheet:    { backgroundColor:C.white, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingBottom:32, maxHeight:"85%", position:"absolute", bottom:0, left:0, right:0 },
    filterHeader:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingVertical:18 },
    filterTitle:    { fontFamily:"Outfit_700Bold", fontSize:18, color:C.textDark },
    sliderWrap:     { paddingHorizontal:4 },
    filterActions:  { flexDirection:"row", gap:12, paddingTop:8 },
    clearFilterBtn: { flex:1, paddingVertical:13, borderRadius:12, borderWidth:1.5, borderColor:C.navy, alignItems:"center" },
    clearFilterText:{ fontFamily:"Outfit_600SemiBold", fontSize:14, color:C.navy },
    applyFilterBtn: { flex:2, paddingVertical:13, borderRadius:12, backgroundColor:C.navy, alignItems:"center" },
    applyFilterText:{ fontFamily:"Outfit_600SemiBold", fontSize:14, color:C.white },
});

const fs = StyleSheet.create({
    sectionLabel:     { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.textMid, marginBottom:10, marginTop:14 },
    chip:             { paddingHorizontal:14, paddingVertical:7, borderRadius:20, backgroundColor:C.bg, borderWidth:1, borderColor:C.border },
    chipActive:       { backgroundColor:C.navy, borderColor:C.navy },
    chipText:         { fontFamily:"Outfit_500Medium", fontSize:12, color:C.textMid },
    chipTextActive:   { color:C.white },
    colorChip:        { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:12, paddingVertical:7, borderRadius:20, backgroundColor:C.bg, borderWidth:1, borderColor:C.border },
    colorDot:         { width:14, height:14, borderRadius:7 },
    sizeGrid:         { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:4 },
    sizeChip:         { paddingHorizontal:12, paddingVertical:7, borderRadius:8, backgroundColor:C.bg, borderWidth:1, borderColor:C.border, minWidth:48, alignItems:"center" },
    sizeChipActive:   { backgroundColor:C.navy, borderColor:C.navy },
    sizeChipTxt:      { fontFamily:"Outfit_500Medium", fontSize:12, color:C.textMid },
    sizeChipTxtActive:{ color:C.white, fontFamily:"Outfit_600SemiBold" },
});

// ─────────────────────────────────────────────────────────────
// ROOT EXPORT — switches between web desktop and mobile
// ─────────────────────────────────────────────────────────────
const ProductsScreen: React.FC = () => {
    const [fontsLoaded] = useFonts({
        Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
        Outfit_700Bold, Outfit_800ExtraBold,
    });
    if (!fontsLoaded) return null;

    if (Platform.OS === "web") {
        return <WebProductsScreen />;
    }
    return <MobileProductsScreen />;
};

export default ProductsScreen;