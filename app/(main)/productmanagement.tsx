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
    subcategory: string; subSubcategory?: string; color: string; size: string;
    description?: string; material?: string; weight?: string;
    dimensions?: string; returnPolicy?: string; warranty?: string;
};

const INITIAL_PRODUCTS: Product[] = [
    { id:"1",  name:"Running Sports Shoes", sku:"SHOES001", price:1999, image:"https://picsum.photos/seed/shoes1/100/100",      status:"Active",       stock:50,  updated:"20 May 2024", category:"Footwear",    subcategory:"Sneakers",  subSubcategory:"Running",      color:"Red",   size:"42",       description:"High-performance running shoes with advanced cushioning and breathable mesh upper.", material:"Mesh & Rubber", weight:"0.5 kg", dimensions:"30 × 15 × 12 cm", returnPolicy:"30 Days Return", warranty:"6 Months" },
    { id:"2",  name:"Smart Watch Series 5", sku:"WATCH005", price:2999, image:"https://picsum.photos/seed/watch1/100/100",      status:"Active",       stock:30,  updated:"19 May 2024", category:"Electronics", subcategory:"Wearables", subSubcategory:"Smartwatches", color:"Black", size:"Free Size",description:"Feature-rich smartwatch with health tracking, GPS, and 7-day battery life.", material:"Stainless Steel & Silicone", weight:"0.12 kg", dimensions:"4.5 × 3.8 × 1.0 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"3",  name:"Travel Backpack",       sku:"BAG002",   price:1299, image:"https://picsum.photos/seed/backpack1/100/100",  status:"Inactive",     stock:0,   updated:"18 May 2024", category:"Bags",        subcategory:"Backpacks", subSubcategory:"Travel",       color:"Blue",  size:"Free Size",description:"Spacious 40L travel backpack with laptop compartment and anti-theft design.", material:"Nylon", weight:"1.2 kg", dimensions:"55 × 35 × 20 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"4",  name:"Wireless Headphones",   sku:"HEAD004",  price:1799, image:"https://picsum.photos/seed/headphones1/100/100",status:"Out of Stock", stock:0,   updated:"17 May 2024", category:"Electronics", subcategory:"Audio",     subSubcategory:"Headphones",   color:"White", size:"Free Size",description:"Premium wireless headphones with active noise cancellation and 30hr battery.", material:"Plastic & Memory Foam", weight:"0.28 kg", dimensions:"20 × 18 × 8 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"5",  name:"Cotton T-Shirt",        sku:"SHIRT003", price:499,  image:"https://picsum.photos/seed/tshirt1/100/100",    status:"Active",       stock:120, updated:"20 May 2024", category:"Clothing",    subcategory:"T-Shirts",  subSubcategory:"Casual",       color:"White", size:"M",        description:"100% premium cotton t-shirt with relaxed fit and breathable fabric.", material:"Cotton", weight:"0.2 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"6",  name:"Denim Jeans",           sku:"JEAN001",  price:1199, image:"https://picsum.photos/seed/jeans1/100/100",     status:"Active",       stock:85,  updated:"19 May 2024", category:"Clothing",    subcategory:"Jeans",     subSubcategory:"Slim Fit",     color:"Blue",  size:"32",       description:"Classic slim-fit denim jeans with stretch for all-day comfort.", material:"Denim (98% Cotton, 2% Elastane)", weight:"0.6 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"7",  name:"Leather Wallet",        sku:"WALL007",  price:799,  image:"https://picsum.photos/seed/wallet1/100/100",    status:"Active",       stock:8,   updated:"15 May 2024", category:"Accessories", subcategory:"Wallets",   subSubcategory:"Bi-fold",      color:"Brown", size:"Free Size",description:"Genuine leather bi-fold wallet with RFID blocking and multiple card slots.", material:"Genuine Leather", weight:"0.08 kg", dimensions:"11 × 9 × 1 cm", returnPolicy:"7 Days Return", warranty:"6 Months" },
    { id:"8",  name:"Sunglasses UV400",      sku:"SUN008",   price:999,  image:"https://picsum.photos/seed/glasses1/100/100",   status:"Active",       stock:6,   updated:"14 May 2024", category:"Accessories", subcategory:"Eyewear",   subSubcategory:"Polarized",    color:"Black", size:"Free Size",description:"Polarized UV400 sunglasses with lightweight titanium frame.", material:"Titanium & Polycarbonate", weight:"0.03 kg", dimensions:"14 × 5 × 4 cm", returnPolicy:"7 Days Return", warranty:"6 Months" },
    { id:"9",  name:"Yoga Mat Pro",          sku:"MAT009",   price:1499, image:"https://picsum.photos/seed/mat1/100/100",       status:"Inactive",     stock:0,   updated:"13 May 2024", category:"Sports",      subcategory:"Yoga",      subSubcategory:"Mats",         color:"Purple",size:"Free Size",description:"6mm thick non-slip yoga mat with alignment lines and carrying strap.", material:"TPE (Eco-friendly)", weight:"1.0 kg", dimensions:"183 × 61 × 0.6 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"10", name:"Bluetooth Speaker",     sku:"SPK010",   price:2499, image:"https://picsum.photos/seed/speaker1/100/100",   status:"Active",       stock:25,  updated:"12 May 2024", category:"Electronics", subcategory:"Audio",     subSubcategory:"Speakers",     color:"Gray",  size:"Free Size",description:"360° surround sound Bluetooth speaker with IPX7 waterproof rating.", material:"Polycarbonate & Silicone", weight:"0.55 kg", dimensions:"9 × 9 × 8 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"11", name:"Formal Oxford Shoes",   sku:"OXFD011",  price:3499, image:"https://picsum.photos/seed/shoes2/100/100",     status:"Active",       stock:20,  updated:"11 May 2024", category:"Footwear",    subcategory:"Formal",    subSubcategory:"Oxford",       color:"Black", size:"43",       description:"Handcrafted genuine leather Oxford shoes for formal occasions.", material:"Full-Grain Leather", weight:"0.9 kg", dimensions:"32 × 12 × 11 cm", returnPolicy:"14 Days Return", warranty:"6 Months" },
    { id:"12", name:"Polo Shirt",            sku:"POLO012",  price:699,  image:"https://picsum.photos/seed/polo1/100/100",      status:"Out of Stock", stock:0,   updated:"10 May 2024", category:"Clothing",    subcategory:"Shirts",    subSubcategory:"Polo",         color:"Red",   size:"L",        description:"Classic polo shirt in piqué cotton with ribbed collar and cuffs.", material:"100% Piqué Cotton", weight:"0.22 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"13", name:"Running Cap",           sku:"CAP013",   price:349,  image:"https://picsum.photos/seed/cap1/100/100",       status:"Active",       stock:60,  updated:"09 May 2024", category:"Accessories", subcategory:"Headwear",  subSubcategory:"Caps",         color:"Blue",  size:"Free Size",description:"Lightweight moisture-wicking running cap with UV protection.", material:"Polyester", weight:"0.08 kg", dimensions:"N/A", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"14", name:"Gym Gloves",            sku:"GLOVE014", price:449,  image:"https://picsum.photos/seed/gloves1/100/100",    status:"Active",       stock:40,  updated:"08 May 2024", category:"Sports",      subcategory:"Gym",       subSubcategory:"Gloves",       color:"Black", size:"M",        description:"Full-finger gym gloves with wrist support and anti-slip grip.", material:"Leather & Neoprene", weight:"0.15 kg", dimensions:"N/A", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"15", name:"Protein Shaker Bottle", sku:"SHAKE015", price:299,  image:"https://picsum.photos/seed/bottle1/100/100",   status:"Active",       stock:90,  updated:"07 May 2024", category:"Sports",      subcategory:"Gym",       subSubcategory:"Accessories",  color:"Gray",  size:"Free Size",description:"700ml BPA-free protein shaker with mixing ball and leak-proof lid.", material:"BPA-Free Plastic", weight:"0.18 kg", dimensions:"24 × 8 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"16", name:"Ankle Socks Pack",      sku:"SOCK016",  price:199,  image:"https://picsum.photos/seed/socks1/100/100",    status:"Active",       stock:200, updated:"06 May 2024", category:"Clothing",    subcategory:"Innerwear", subSubcategory:"Socks",        color:"White", size:"Free Size",description:"Pack of 6 breathable cotton ankle socks with cushioned sole.", material:"80% Cotton, 20% Lycra", weight:"0.12 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"17", name:"Resistance Bands Set",  sku:"BAND017",  price:599,  image:"https://picsum.photos/seed/bands1/100/100",    status:"Active",       stock:55,  updated:"05 May 2024", category:"Sports",      subcategory:"Gym",       subSubcategory:"Equipment",    color:"Red",   size:"Free Size",description:"Set of 5 latex resistance bands in varying resistance levels.", material:"Natural Latex", weight:"0.3 kg", dimensions:"60 × 5 cm each", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"18", name:"Jump Rope Pro",         sku:"JUMP018",  price:399,  image:"https://picsum.photos/seed/jumprope1/100/100", status:"Inactive",     stock:0,   updated:"04 May 2024", category:"Sports",      subcategory:"Gym",       subSubcategory:"Cardio",       color:"Black", size:"Free Size",description:"Speed jump rope with steel wire cable and ergonomic foam handles.", material:"Steel & Foam", weight:"0.22 kg", dimensions:"Adjustable up to 3m", returnPolicy:"7 Days Return", warranty:"6 Months" },
    { id:"19", name:"Foam Roller",           sku:"FOAM019",  price:799,  image:"https://picsum.photos/seed/foam1/100/100",     status:"Active",       stock:35,  updated:"03 May 2024", category:"Sports",      subcategory:"Yoga",      subSubcategory:"Accessories",  color:"Purple",size:"Free Size",description:"High-density EPP foam roller for muscle recovery and myofascial release.", material:"EPP Foam", weight:"0.5 kg", dimensions:"45 × 15 cm", returnPolicy:"7 Days Return", warranty:"No Warranty" },
    { id:"20", name:"Sports Water Bottle",   sku:"WBOT020",  price:549,  image:"https://picsum.photos/seed/waterbottle1/100/100",status:"Active",      stock:75,  updated:"02 May 2024", category:"Sports",      subcategory:"Gym",       subSubcategory:"Hydration",    color:"Blue",  size:"Free Size",description:"1L insulated stainless steel water bottle keeps drinks cold 24hrs.", material:"Stainless Steel", weight:"0.35 kg", dimensions:"26 × 7 cm", returnPolicy:"14 Days Return", warranty:"1 Year" },
    { id:"21", name:"Training Shorts",       sku:"SHORT021", price:649,  image:"https://picsum.photos/seed/shorts1/100/100",   status:"Active",       stock:45,  updated:"01 May 2024", category:"Clothing",    subcategory:"Shorts",    subSubcategory:"Training",     color:"Black", size:"L",        description:"Quick-dry training shorts with built-in compression liner.", material:"Polyester & Spandex", weight:"0.2 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
    { id:"22", name:"Sports Bra",            sku:"BRA022",   price:799,  image:"https://picsum.photos/seed/sportsbra1/100/100",status:"Out of Stock", stock:0,   updated:"30 Apr 2024", category:"Clothing",    subcategory:"Innerwear", subSubcategory:"Sports",       color:"Pink",  size:"M",        description:"High-impact sports bra with removable cups and cross-back design.", material:"Nylon & Spandex", weight:"0.15 kg", dimensions:"N/A", returnPolicy:"30 Days Return", warranty:"No Warranty" },
];

const CATEGORIES    = ["All","Footwear","Electronics","Bags","Clothing","Accessories","Sports"];

// ── 3-level category tree ──────────────────────────────────────
const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
    Footwear:    {
        Sneakers: ["Running","Casual","Basketball","Training"],
        Formal:   ["Oxford","Derby","Loafers","Monk Strap"],
        Sandals:  ["Flip Flops","Slides","Sport Sandals"],
        Boots:    ["Ankle Boots","Chelsea Boots","Hiking Boots"],
    },
    Electronics: {
        Audio:    ["Headphones","Earbuds","Speakers","Soundbars"],
        Wearables:["Smartwatches","Fitness Bands","Smart Glasses"],
        Cameras:  ["DSLR","Mirrorless","Action Cams","Accessories"],
        Tablets:  ["Android","iPad","Windows","Accessories"],
    },
    Bags:        {
        Backpacks:    ["Travel","Laptop","School","Hiking"],
        Handbags:     ["Tote","Clutch","Shoulder","Crossbody"],
        "Laptop Bags":["Sleeves","Briefcases","Backpacks"],
        "Travel Bags":["Trolley","Duffel","Carry-On"],
        Wallets:      ["Bi-fold","Tri-fold","Card Holders"],
    },
    Clothing:    {
        "T-Shirts": ["Casual","Graphic","Polo","Sleeveless"],
        Shirts:     ["Formal","Casual","Polo","Denim"],
        Jeans:      ["Slim Fit","Straight","Skinny","Bootcut"],
        Shorts:     ["Training","Casual","Denim","Swim"],
        Innerwear:  ["Socks","Sports","Thermal","Briefs"],
        Jackets:    ["Bomber","Denim","Leather","Windbreaker"],
    },
    Accessories: {
        Wallets:   ["Bi-fold","Tri-fold","Card Holders","Travel"],
        Eyewear:   ["Polarized","Photochromic","Blue Light","Sports"],
        Watches:   ["Analog","Digital","Smartwatch","Luxury"],
        Headwear:  ["Caps","Hats","Beanies","Visors"],
        Jewelry:   ["Rings","Necklaces","Bracelets","Earrings"],
    },
    Sports:      {
        Gym:   ["Gloves","Equipment","Accessories","Hydration","Cardio"],
        Yoga:  ["Mats","Accessories","Clothing","Blocks"],
        Cricket:["Bats","Balls","Pads","Helmets","Gloves"],
        Football:["Boots","Balls","Shin Guards","Gloves"],
    },
};

// Flat subcategory list per category (for mobile)
const SUBCATEGORIES: Record<string,string[]> = Object.fromEntries(
    Object.entries(CATEGORY_TREE).map(([cat, subs]) => [cat, ["All", ...Object.keys(subs)]])
);

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
    { pincode:"110001", area:"Baroda House",   city:"New Delhi",  state:"Delhi",       country:"India" },
    { pincode:"110001", area:"Bengali Market", city:"New Delhi",  state:"Delhi",       country:"India" },
    { pincode:"110001", area:"Connaught Place",city:"New Delhi",  state:"Delhi",       country:"India" },
    { pincode:"400001", area:"Fort",           city:"Mumbai",     state:"Maharashtra", country:"India" },
    { pincode:"400001", area:"Churchgate",     city:"Mumbai",     state:"Maharashtra", country:"India" },
    { pincode:"500001", area:"Abids",          city:"Hyderabad",  state:"Telangana",   country:"India" },
    { pincode:"500001", area:"Koti",           city:"Hyderabad",  state:"Telangana",   country:"India" },
    { pincode:"560001", area:"MG Road",        city:"Bengaluru",  state:"Karnataka",   country:"India" },
    { pincode:"600001", area:"George Town",    city:"Chennai",    state:"Tamil Nadu",  country:"India" },
    { pincode:"700001", area:"BBD Bagh",       city:"Kolkata",    state:"West Bengal", country:"India" },
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
        Alert.alert("✅ Delivery Locations Updated",
            `Successfully applied delivery settings for "${product.name}".\n\n${deliverAll ? "📦 Product will be delivered to all locations India-wide." : count > 0 ? `📍 ${count} location${count > 1 ? "s" : ""} selected for delivery.` : "⚠️ No locations selected."}`,
            [{ text: "OK", style: "default", onPress: onClose }], { cancelable: false });
    };

    const isWebPlatform = Platform.OS === "web";

    const ModalContent = () => (
        <View style={isWebPlatform ? dlp.popupCard : dlp.fullCard}>
            <View style={dlp.header}>
                <TouchableOpacity style={dlp.backBtn} onPress={onClose}>
                    <Ionicons name="arrow-back" size={20} color={C.white} />
                </TouchableOpacity>
                <View style={dlp.headerCenter}>
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={C.orange} />
                    <View style={{ flex: 1 }}>
                        <Text style={dlp.headerTitle}>Delivery Locations</Text>
                        <Text style={dlp.headerSub} numberOfLines={1}>{product.name}</Text>
                    </View>
                </View>
                <View style={dlp.headerRight}>
                    <Text style={dlp.deliverAllLabel}>All India</Text>
                    <Switch value={deliverAll} onValueChange={setDeliverAll} trackColor={{ false: "rgba(255,255,255,0.3)", true: C.orange }} thumbColor={C.white} ios_backgroundColor="rgba(255,255,255,0.3)" />
                </View>
            </View>

            <ScrollView style={dlp.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                <View style={dlp.infoBanner}>
                    <MaterialCommunityIcons name="information-outline" size={14} color={C.orange} />
                    <View style={{ flex: 1 }}><Text style={dlp.infoText}><Text style={dlp.infoBold}>ON: </Text>Ships anywhere.<Text style={dlp.infoBold}> OFF: </Text>Only selected pincodes.</Text></View>
                    <TouchableOpacity style={dlp.indiaWideBtn} onPress={() => setDeliverAll(true)}><Text style={dlp.indiaWideBtnTxt}>Set All</Text></TouchableOpacity>
                </View>

                <View style={dlp.dropdownsRow}>
                    <View style={dlp.dropdownWrap}>
                        <Text style={dlp.dropdownLabel}>Country</Text>
                        <TouchableOpacity style={dlp.dropdownInput} onPress={() => openSelector('country', COUNTRIES)}>
                            <Text style={dlp.dropdownText}>{selectedCountry}</Text>
                            <Ionicons name="chevron-down" size={14} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <View style={dlp.dropdownWrap}>
                        <Text style={dlp.dropdownLabel}>State</Text>
                        <TouchableOpacity style={dlp.dropdownInput} onPress={() => openSelector('state', stateOptions)}>
                            <Text style={dlp.dropdownText}>{selectedState}</Text>
                            <Ionicons name="chevron-down" size={14} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <View style={dlp.dropdownWrap}>
                        <Text style={dlp.dropdownLabel}>City</Text>
                        <TouchableOpacity style={dlp.dropdownInput} onPress={() => openSelector('city', cityOptions)}>
                            <Text style={dlp.dropdownText}>{selectedCity}</Text>
                            <Ionicons name="chevron-down" size={14} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={dlp.searchRow}>
                    <View style={dlp.searchIconBox}><Feather name="search" size={13} color={C.white} /></View>
                    <TextInput style={dlp.searchInput} placeholder="Search by pincode or area..." placeholderTextColor={C.textLight} value={pincodeQuery} onChangeText={setPincodeQuery} />
                </View>

                <View style={dlp.tableCard}>
                    <View style={dlp.tableHeader}>
                        <TouchableOpacity style={dlp.checkboxWrap} onPress={toggleSelectAll}>
                            <View style={[dlp.checkbox, selectAll && dlp.checkboxChecked]}>{selectAll && <Ionicons name="checkmark" size={9} color={C.white} />}</View>
                        </TouchableOpacity>
                        <Text style={[dlp.tableHeaderTxt, { flex: 1 }]}>Pincode</Text>
                        <Text style={[dlp.tableHeaderTxt, { flex: 2 }]}>Area</Text>
                        <Text style={[dlp.tableHeaderTxt, { flex: 1.5 }]}>City</Text>
                        <Text style={[dlp.tableHeaderTxt, { flex: 1.2 }]}>State</Text>
                    </View>
                    {filteredData.length === 0 ? (
                        <View style={dlp.emptyTable}>
                            <MaterialCommunityIcons name="map-search-outline" size={32} color={C.textLight} />
                            <Text style={dlp.emptyTableTitle}>No locations found</Text>
                        </View>
                    ) : (
                        filteredData.map((d, i) => {
                            const key = `${d.pincode}-${d.area}`; const isChecked = selectedPincodes.includes(key);
                            return (
                                <TouchableOpacity key={key} style={[dlp.tableRow, isChecked && dlp.tableRowChecked, i % 2 === 1 && dlp.tableRowAlt]} onPress={() => togglePincode(key)} activeOpacity={0.7}>
                                    <View style={dlp.checkboxWrap}><View style={[dlp.checkbox, isChecked && dlp.checkboxChecked]}>{isChecked && <Ionicons name="checkmark" size={9} color={C.white} />}</View></View>
                                    <Text style={[dlp.tableCellTxt, { flex: 1 }]}>{d.pincode}</Text>
                                    <Text style={[dlp.tableCellTxt, { flex: 2 }]} numberOfLines={1}>{d.area}</Text>
                                    <Text style={[dlp.tableCellHighlight, { flex: 1.5 }]}>{d.city}</Text>
                                    <Text style={[dlp.tableCellHighlight, { flex: 1.2 }]}>{d.state}</Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                    {selectedPincodes.length > 0 && (
                        <View style={dlp.selectionBanner}>
                            <MaterialCommunityIcons name="check-circle" size={14} color={C.orange} />
                            <Text style={dlp.selectionBannerTxt}>{selectedPincodes.length} location{selectedPincodes.length > 1 ? "s" : ""} selected</Text>
                            <TouchableOpacity onPress={() => { setSelectedPincodes([]); setSelectAll(false); }}><Text style={dlp.selectionClearTxt}>Clear</Text></TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={dlp.footer}>
                <TouchableOpacity style={dlp.cancelBtn} onPress={onClose}><Text style={dlp.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={dlp.applyBtn} onPress={handleApply}><Text style={dlp.applyBtnTxt}>Apply Selection</Text></TouchableOpacity>
            </View>

            <Modal visible={selectorVisible} transparent animationType="fade">
                <View style={gs.overlay}>
                    <View style={gs.content}>
                        <View style={gs.headerRow}>
                            <Text style={gs.headerTitle}>Select {selectorType === 'country' ? 'Country' : selectorType === 'state' ? 'State' : 'City'}</Text>
                            <TouchableOpacity onPress={() => setSelectorVisible(false)}><Ionicons name="close" size={22} color={C.textDark} /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: SH * 0.45 }}>
                            {selectorOptions.map((opt, idx) => {
                                const isActive = (selectorType === 'country' && opt === selectedCountry) || (selectorType === 'state' && opt === selectedState) || (selectorType === 'city' && opt === selectedCity);
                                return (
                                    <TouchableOpacity key={idx} style={[gs.item, isActive && gs.itemActive]} onPress={() => handleSelectorSelect(opt)}>
                                        <Text style={[gs.itemText, isActive && gs.itemTextActive]}>{opt}</Text>
                                        {isActive && <Ionicons name="checkmark-circle" size={18} color={C.navy} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );

    if (isWebPlatform) {
        return (
            <Modal visible transparent animationType="fade" onRequestClose={onClose}>
                <View style={dlp.webOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
                    <ModalContent />
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={dlp.mobileFullScreen}>
                <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
                <ModalContent />
            </SafeAreaView>
        </Modal>
    );
};

const dlp = StyleSheet.create({
    webOverlay: { flex: 1, backgroundColor: "rgba(10,14,40,0.6)", justifyContent: "center", alignItems: "center" },
    popupCard: { width: 680, maxHeight: "85%" as any, backgroundColor: C.white, borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 30, flexDirection: "column" },
    mobileFullScreen: { flex: 1, backgroundColor: C.navyDeep },
    fullCard: { flex: 1, flexDirection: "column" },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10, backgroundColor: C.navyDeep },
    backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
    headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
    headerSub: { fontFamily: "Outfit_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)" },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    deliverAllLabel: { fontFamily: "Outfit_500Medium", fontSize: 10, color: "rgba(255,255,255,0.8)" },
    body: { flex: 1, backgroundColor: C.bg },
    infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, margin: 12, backgroundColor: C.orangePale, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.orange + "30" },
    infoText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textMid, lineHeight: 17 },
    infoBold: { fontFamily: "Outfit_700Bold", color: C.textDark },
    indiaWideBtn: { backgroundColor: C.orange, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
    indiaWideBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.white },
    dropdownsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 10 },
    dropdownWrap: { flex: 1 },
    dropdownLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.textLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },
    dropdownInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: C.border },
    dropdownText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textDark, flex: 1 },
    searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginBottom: 10, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: C.border },
    searchIconBox: { backgroundColor: C.orange, padding: 9 },
    searchInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textDark, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: C.white },
    tableCard: { backgroundColor: C.white, borderRadius: 12, marginHorizontal: 12, marginBottom: 10, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tableHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 9, backgroundColor: C.navyDeep },
    tableHeaderTxt: { fontFamily: "Outfit_700Bold", fontSize: 10, color: C.white },
    checkboxWrap: { width: 32, alignItems: "center" },
    checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
    checkboxChecked: { backgroundColor: C.orange, borderColor: C.orange },
    tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    tableRowAlt: { backgroundColor: "#FAFAFA" },
    tableRowChecked: { backgroundColor: C.orangePale },
    tableCellTxt: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textDark, paddingHorizontal: 4 },
    tableCellHighlight: { fontFamily: "Outfit_500Medium", fontSize: 11, color: C.orange, paddingHorizontal: 4 },
    emptyTable: { alignItems: "center", paddingVertical: 28, gap: 8 },
    emptyTableTitle: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textMid },
    selectionBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.orangePale, borderTopWidth: 1, borderTopColor: C.orange + "30" },
    selectionBannerTxt: { flex: 1, fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.orange },
    selectionClearTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.red },
    footer: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
    cancelBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.border },
    cancelBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid },
    applyBtn: { flex: 2, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10, backgroundColor: C.orange },
    applyBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.white },
});

const gs = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
    content: { backgroundColor: C.white, width: "100%", borderRadius: 14, maxHeight: SH * 0.55, overflow: "hidden" },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textDark },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.bg },
    itemActive: { backgroundColor: C.bluePale },
    itemText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textDark },
    itemTextActive: { fontFamily: "Outfit_700Bold", color: C.navy },
});

// ─────────────────────────────────────────────────────────────
// PRODUCT ACTION SHEET  — mobile only
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
// WEB PRODUCT ACTION POPUP
// ─────────────────────────────────────────────────────────────
const WebProductActionPopup: React.FC<ActionSheetProps> = ({ product, onClose, onDelete, onUpdateLocation }) => {
    if (!product) return null;
    const router = useRouter();

    const handleAction = (label: string) => {
        if (label === "Delete Product") {
            onClose();
            setTimeout(() => {
                Alert.alert("Delete Product", `Are you sure you want to delete "${product.name}"?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => onDelete(product.id) }], { cancelable: true });
            }, 300);
        } else if (label === "View Product")    { onClose(); router.push("/(main)/Productdetail"); }
        else if (label === "Edit Product")      { onClose(); router.push("/(main)/Editproduct"); }
        else if (label === "Update Location")   { onClose(); setTimeout(() => onUpdateLocation(product.id), 200); }
        else                                    { onClose(); }
    };

    const getStatusBadge = (status: string) => {
        if (status === "Active")       return { bg: "#DCFCE7", color: "#16A34A" };
        if (status === "Inactive")     return { bg: "#FEF9C3", color: "#B45309" };
        if (status === "Out of Stock") return { bg: "#FEE2E2", color: "#DC2626" };
        return { bg: C.orangePale, color: C.orange };
    };
    const sb = getStatusBadge(product.status);

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={wp.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
                <View style={wp.popup}>
                    <View style={wp.popupHeader}>
                        <Image source={{ uri: product.image }} style={wp.popupImg} />
                        <View style={{ flex: 1 }}>
                            <Text style={wp.popupName} numberOfLines={2}>{product.name}</Text>
                            <Text style={wp.popupSku}>SKU: {product.sku}</Text>
                            <View style={wp.popupMeta}>
                                <Text style={wp.popupPrice}>₹{product.price.toLocaleString()}</Text>
                                <View style={[wp.popupStatusBadge, { backgroundColor: sb.bg }]}>
                                    <Text style={[wp.popupStatusTxt, { color: sb.color }]}>{product.status}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={wp.popupCloseBtn} onPress={onClose} activeOpacity={0.75}>
                            <Ionicons name="close" size={16} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <View style={wp.divider} />
                    <View style={wp.stockRow}>
                        <MaterialCommunityIcons name="package-variant" size={13} color={C.textLight} />
                        <Text style={wp.stockTxt}>Stock: </Text>
                        <Text style={[wp.stockVal, product.stock === 0 && { color: C.red }, product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD && { color: C.orange }]}>
                            {product.stock} units{product.stock === 0 ? " · Out of stock" : product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0 ? " · Low ⚠" : ""}
                        </Text>
                    </View>
                    <View style={wp.divider} />
                    <View style={wp.actionsContainer}>
                        {PRODUCT_ACTIONS.map((action, i) => (
                            <TouchableOpacity key={i} style={[wp.actionItem, action.label === "Delete Product" && wp.actionItemDanger, i < PRODUCT_ACTIONS.length - 1 && wp.actionItemBorder]} onPress={() => handleAction(action.label)} activeOpacity={0.75}>
                                <View style={[wp.actionIconBox, { backgroundColor: action.bg }]}>
                                    <MaterialCommunityIcons name={action.icon as any} size={17} color={action.color} />
                                </View>
                                <Text style={[wp.actionLabel, { color: action.label === "Delete Product" ? C.red : C.textDark }]}>{action.label}</Text>
                                <Ionicons name="chevron-forward" size={14} color={action.label === "Delete Product" ? C.redLight : C.textLight} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={wp.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={wp.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const wp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(10,14,40,0.55)", justifyContent: "center", alignItems: "center" },
    popup: { backgroundColor: C.white, borderRadius: 18, width: 320, shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.22, shadowRadius: 36, elevation: 30, overflow: "hidden" },
    popupHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, paddingBottom: 12 },
    popupImg: { width: 54, height: 54, borderRadius: 12, backgroundColor: C.bg },
    popupName: { fontFamily: "Outfit_700Bold", fontSize: 13.5, color: C.textDark, marginBottom: 3, lineHeight: 19 },
    popupSku: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginBottom: 6 },
    popupMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
    popupPrice: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.navyDeep },
    popupStatusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    popupStatusTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
    popupCloseBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    divider: { height: 1, backgroundColor: "#F1F2F6", marginHorizontal: 16 },
    stockRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
    stockTxt: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
    stockVal: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textDark },
    actionsContainer: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 },
    actionItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 10 },
    actionItemDanger: { marginTop: 2 },
    actionItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    actionIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    actionLabel: { flex: 1, fontFamily: "Outfit_600SemiBold", fontSize: 13.5 },
    cancelBtn: { marginHorizontal: 16, marginTop: 4, marginBottom: 14, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 11, alignItems: "center", backgroundColor: C.bg },
    cancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid },
});

// ─────────────────────────────────────────────────────────────
// WEB DESKTOP SCREEN
// ─────────────────────────────────────────────────────────────
const WebProductsScreen: React.FC = () => {
    const router = useRouter();
    const [products, setProducts]               = useState<Product[]>(INITIAL_PRODUCTS);
    const [viewType, setViewType]               = useState<ViewType>("list");
    const [selectedTab, setSelectedTab]         = useState<TabType>("All Products");
    const [sortBy, setSortBy]                   = useState<SortType>("Latest");
    const [searchQuery, setSearchQuery]         = useState("");
    const [visibleCount, setVisibleCount]       = useState(20);
    const [productActionId, setProductActionId] = useState<string | null>(null);
    const [locationProductId, setLocationProductId] = useState<string | null>(null);

    const [filterCategory, setFilterCategory]             = useState("All");
    const [filterSubcategory, setFilterSubcategory]       = useState("All");
    const [filterSubSubcategory, setFilterSubSubcategory] = useState("All");
    const [filterColor, setFilterColor]                   = useState("All");
    // ── WEB CHANGE 1: Size filter state added ──
    const [filterSize, setFilterSize]                     = useState("All");
    const [filterLowPrice, setFilterLowPrice]             = useState<number>(PRICE_MIN);
    const [filterHighPrice, setFilterHighPrice]           = useState<number>(PRICE_MAX);

    // ── WEB CHANGE 2: applied state now includes size ──
    const [applied, setApplied] = useState({
        category: "All", subcategory: "All", subSubcategory: "All",
        color: "All", size: "All", lowPrice: PRICE_MIN, highPrice: PRICE_MAX,
    });

    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedSubcat, setExpandedSubcat]     = useState<string | null>(null);

    const activeActionProduct = products.find(p => p.id === productActionId);
    const locationProduct     = products.find(p => p.id === locationProductId);

    const handleDelete = useCallback((id: string) => setProducts(prev => prev.filter(p => p.id !== id)), []);
    const handleUpdateLocation = useCallback((id: string) => setLocationProductId(id), []);

    const totalCount      = products.length;
    const activeCount     = products.filter(p => p.status === "Active").length;
    const inactiveCount   = products.filter(p => p.status === "Inactive").length;
    const outOfStockCount = products.filter(p => p.status === "Out of Stock").length;
    const lowStockCount   = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;

    // ── WEB CHANGE 3: processedProducts now filters by size ──
    const processedProducts = useMemo(() => {
        let list = [...products];
        if (selectedTab === "Low Stock") list = list.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
        else if (selectedTab !== "All Products") list = list.filter(p => p.status === selectedTab);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        }
        if (applied.category !== "All")        list = list.filter(p => p.category        === applied.category);
        if (applied.subcategory !== "All")     list = list.filter(p => p.subcategory     === applied.subcategory);
        if (applied.subSubcategory !== "All")  list = list.filter(p => p.subSubcategory  === applied.subSubcategory);
        if (applied.color !== "All")           list = list.filter(p => p.color           === applied.color);
        // ── Size filter applied ──
        if (applied.size !== "All")            list = list.filter(p => p.size            === applied.size);
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

    // ── WEB CHANGE 4: applyFilters now includes size ──
    const applyFilters = () => {
        setApplied({
            category: filterCategory, subcategory: filterSubcategory,
            subSubcategory: filterSubSubcategory,
            color: filterColor, size: filterSize,
            lowPrice: filterLowPrice, highPrice: filterHighPrice,
        });
        setVisibleCount(20);
    };

    // ── WEB CHANGE 5: clearFilters now resets size ──
    const clearFilters = () => {
        setFilterCategory("All"); setFilterSubcategory("All"); setFilterSubSubcategory("All");
        setFilterColor("All"); setFilterSize("All");
        setFilterLowPrice(PRICE_MIN); setFilterHighPrice(PRICE_MAX);
        setExpandedCategory(null); setExpandedSubcat(null);
        setApplied({
            category: "All", subcategory: "All", subSubcategory: "All",
            color: "All", size: "All", lowPrice: PRICE_MIN, highPrice: PRICE_MAX,
        });
        setVisibleCount(20);
    };

    // ── WEB CHANGE 6: activeFilterCount now includes size ──
    const activeFilterCount = [
        applied.category !== "All", applied.subcategory !== "All", applied.subSubcategory !== "All",
        applied.color !== "All", applied.size !== "All",
        applied.lowPrice > PRICE_MIN, applied.highPrice < PRICE_MAX,
    ].filter(Boolean).length;

    const catTree      = filterCategory !== "All" ? (CATEGORY_TREE[filterCategory] ?? {}) : {};
    const subcatKeys   = Object.keys(catTree);
    const subSubOptions = filterSubcategory !== "All" ? (catTree[filterSubcategory] ?? []) : [];

    return (
        <View style={wst.root}>
            {/* NAVBAR */}
            <View style={wst.navbar}>
                <View style={wst.navbarInner}>
                    <View style={wst.navLeft}>
                        <View style={wst.navTitleIcon}>
                            <MaterialCommunityIcons name="package-variant-closed" size={16} color={C.white} />
                        </View>
                        <Text style={wst.navTitleText}>Product Management</Text>
                    </View>
                    <View style={wst.navRight}>
                        <View style={wst.navSearch}>
                            <Feather name="search" size={14} color="rgba(255,255,255,0.5)" />
                            <TextInput
                                style={wst.navSearchInput}
                                placeholder="Search products, SKU..."
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity style={wst.navAddBtn} onPress={() => router.push("/(main)/Addnewproduct")} activeOpacity={0.85}>
                            <MaterialCommunityIcons name="plus" size={16} color={C.white} />
                            <Text style={wst.navAddBtnTxt}>Add Product</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={wst.navBulkBtn} onPress={() => router.push("/(main)/bulkupload")} activeOpacity={0.85}>
                            <MaterialCommunityIcons name="cloud-upload-outline" size={14} color={C.green} />
                            <Text style={wst.navBulkBtnTxt}>Bulk Upload</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView style={wst.pageScroll} showsVerticalScrollIndicator={false} contentContainerStyle={wst.pageContent}>
                {/* Page header */}
                <View style={wst.pageHeader}>
                    <View>
                        <View style={wst.breadcrumb}>
                            <Text style={wst.breadcrumbDim}>Dashboard</Text>
                            <Ionicons name="chevron-forward" size={13} color={C.textLight} />
                            <Text style={wst.breadcrumbActive}>Products</Text>
                        </View>
                        <Text style={wst.pageTitle}>Product Management</Text>
                    </View>
                    <Text style={wst.pageSubtitle}>{totalCount} products total</Text>
                </View>

                {/* STATS ROW */}
                <View style={wst.statsRow}>
                    {[
                        { label: "Total Products", value: totalCount,      icon: "package-variant-closed", color: C.navy,    bg: "#EEF1FF",    trend: "+3 this week"  },
                        { label: "Active",          value: activeCount,     icon: "check-circle",           color: "#16A34A", bg: "#DCFCE7",    trend: "selling well"  },
                        { label: "Inactive",        value: inactiveCount,   icon: "pause-circle",           color: "#B45309", bg: "#FEF9C3",    trend: "needs review"  },
                        { label: "Out of Stock",    value: outOfStockCount, icon: "close-circle-outline",   color: "#DC2626", bg: "#FEE2E2",    trend: "restock soon"  },
                        { label: "Low Stock",       value: lowStockCount,   icon: "alert-circle-outline",   color: C.orange,  bg: C.orangePale, trend: "≤10 units"     },
                    ].map((stat, i) => (
                        <View key={i} style={wst.statCard}>
                            <View style={wst.statCardTop}>
                                <View style={[wst.statCardIcon, { backgroundColor: stat.bg }]}>
                                    <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
                                </View>
                                <Text style={[wst.statCardVal, { color: stat.color }]}>{stat.value}</Text>
                            </View>
                            <Text style={wst.statCardLabel}>{stat.label}</Text>
                            <Text style={wst.statCardTrend}>{stat.trend}</Text>
                        </View>
                    ))}
                </View>

                {/* MAIN AREA */}
                <View style={wst.contentArea}>

                    {/* ── LEFT FILTER PANEL ── */}
                    <View style={wst.filterPanel}>
                        <View style={wst.filterPanelHeader}>
                            <View style={wst.filterPanelHeaderLeft}>
                                <Feather name="sliders" size={14} color={C.navy} />
                                <Text style={wst.filterPanelTitle}>Filters</Text>
                                {activeFilterCount > 0 && (
                                    <View style={wst.filterCountBadge}>
                                        <Text style={wst.filterCountBadgeTxt}>{activeFilterCount}</Text>
                                    </View>
                                )}
                            </View>
                            {activeFilterCount > 0 && (
                                <TouchableOpacity onPress={clearFilters}>
                                    <Text style={wst.filterClearAll}>Clear all</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>

                            {/* ── STATUS ── */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Status</Text>
                                {TABS.map(tab => {
                                    const isActive = selectedTab === tab.label;
                                    return (
                                        <TouchableOpacity key={tab.label} style={[wst.filterTabItem, isActive && { backgroundColor: tab.bg }]} onPress={() => { setSelectedTab(tab.label); setVisibleCount(20); }} activeOpacity={0.75}>
                                            <View style={[wst.filterTabDot, { backgroundColor: tab.color }]} />
                                            <Text style={[wst.filterTabLabel, isActive && { color: tab.color, fontFamily: "Outfit_600SemiBold" }]}>{tab.label}</Text>
                                            {tab.label === "Low Stock" && (
                                                <View style={[wst.filterTabBadge, { backgroundColor: tab.color }]}>
                                                    <Text style={wst.filterTabBadgeTxt}>{lowStockCount}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={wst.filterDivider} />

                            {/* ── SORT IN SIDEBAR ── */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Sort By</Text>
                                {SORT_OPTIONS.map(opt => {
                                    const isActive = sortBy === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[wst.sortSidebarItem, isActive && wst.sortSidebarItemActive]}
                                            onPress={() => { setSortBy(opt.value); setVisibleCount(20); }}
                                            activeOpacity={0.75}
                                        >
                                            <View style={[wst.sortSidebarIconBox, { backgroundColor: isActive ? C.navy : C.bg }]}>
                                                <MaterialCommunityIcons name={opt.icon as any} size={13} color={isActive ? C.white : C.textMid} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[wst.sortSidebarLabel, isActive && { color: C.navy, fontFamily: "Outfit_600SemiBold" }]}>{opt.value}</Text>
                                                <Text style={wst.sortSidebarDesc}>{opt.desc}</Text>
                                            </View>
                                            {isActive && <Ionicons name="checkmark-circle" size={15} color={C.navy} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={wst.filterDivider} />

                            {/* ── 3-LEVEL CATEGORY TREE ── */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Category</Text>

                                <TouchableOpacity
                                    style={[wst.catMainItem, filterCategory === "All" && wst.catMainItemActive]}
                                    onPress={() => { setFilterCategory("All"); setFilterSubcategory("All"); setFilterSubSubcategory("All"); setExpandedCategory(null); setExpandedSubcat(null); }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[wst.catRadio, filterCategory === "All" && wst.catRadioFilled]}>
                                        {filterCategory === "All" && <View style={wst.catRadioInner} />}
                                    </View>
                                    <Text style={[wst.catMainLabel, filterCategory === "All" && { color: C.navy, fontFamily: "Outfit_600SemiBold" }]}>All</Text>
                                </TouchableOpacity>

                                {CATEGORIES.filter(c => c !== "All").map(cat => {
                                    const isSelected = filterCategory === cat;
                                    const isExpanded = expandedCategory === cat;
                                    const subKeys = Object.keys(CATEGORY_TREE[cat] ?? {});

                                    return (
                                        <View key={cat}>
                                            <TouchableOpacity
                                                style={[wst.catMainItem, isSelected && wst.catMainItemActive]}
                                                onPress={() => {
                                                    if (isSelected && isExpanded) {
                                                        setExpandedCategory(null);
                                                    } else {
                                                        setFilterCategory(cat);
                                                        setFilterSubcategory("All");
                                                        setFilterSubSubcategory("All");
                                                        setExpandedCategory(cat);
                                                        setExpandedSubcat(null);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[wst.catRadio, isSelected && wst.catRadioFilled]}>
                                                    {isSelected && <View style={wst.catRadioInner} />}
                                                </View>
                                                <Text style={[wst.catMainLabel, isSelected && { color: C.navy, fontFamily: "Outfit_600SemiBold" }]}>{cat}</Text>
                                                {subKeys.length > 0 && (
                                                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color={isSelected ? C.navy : C.textLight} />
                                                )}
                                            </TouchableOpacity>

                                            {isExpanded && subKeys.map(sub => {
                                                const isSubSelected = filterSubcategory === sub;
                                                const isSubExpanded = expandedSubcat === sub;
                                                const subSubList = CATEGORY_TREE?.[cat]?.[sub] ?? [];

                                                return (
                                                    <TouchableOpacity
                                                        key={sub}
                                                        style={[wst.catSubItem, isSubSelected && wst.catSubItemActive]}
                                                        onPress={() => {
                                                            if (isSubSelected && isSubExpanded) {
                                                                setExpandedSubcat(null);
                                                            } else {
                                                                setFilterSubcategory(sub);
                                                                setFilterSubSubcategory("All");
                                                                setExpandedSubcat(sub);
                                                            }
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={wst.catSubIndent} />
                                                        <View style={[wst.catSubRadio, isSubSelected && wst.catSubRadioFilled]}>
                                                            {isSubSelected && <View style={wst.catSubRadioInner} />}
                                                        </View>
                                                        <Text style={[wst.catSubLabel, isSubSelected && { color: C.purple, fontFamily: "Outfit_600SemiBold" }]}>{sub}</Text>
                                                        {subSubList.length > 0 && (
                                                            <Ionicons name={isSubExpanded ? "chevron-up" : "chevron-down"} size={11} color={isSubSelected ? C.purple : C.textLight} />
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    );
                                })}
                            </View>

                            {subSubOptions.length > 0 && (
                                <View style={{ marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                                    <Text style={[wst.filterSectionLabel, { marginBottom: 6 }]}>Last Subcategory</Text>
                                    <View style={{ gap: 6 }}>
                                        {subSubOptions.map(subSub => {
                                            const isSubSubSelected = filterSubSubcategory === subSub;
                                            return (
                                                <TouchableOpacity
                                                    key={subSub}
                                                    style={[wst.catSubSubItem, isSubSubSelected && wst.catSubSubItemActive]}
                                                    onPress={() => setFilterSubSubcategory(isSubSubSelected ? "All" : subSub)}
                                                    activeOpacity={0.75}
                                                >
                                                    <View style={[wst.catSubSubDot, isSubSubSelected && wst.catSubSubDotActive]} />
                                                    <Text style={[wst.catSubSubLabel, isSubSubSelected && { color: C.teal, fontFamily: "Outfit_600SemiBold" }]}>{subSub}</Text>
                                                    {isSubSubSelected && <Ionicons name="checkmark" size={11} color={C.teal} />}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            <View style={wst.filterDivider} />

                            {/* Price Range */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Price Range</Text>
                                <View style={wst.priceRangeInputs}>
                                    <View style={wst.priceInput}>
                                        <Text style={wst.priceInputLabel}>Min (₹)</Text>
                                        <TextInput
                                            style={wst.priceInputField}
                                            value={String(filterLowPrice)}
                                            onChangeText={v => { const n = parseInt(v) || 0; setFilterLowPrice(Math.min(n, filterHighPrice)); }}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={wst.priceDash} />
                                    <View style={wst.priceInput}>
                                        <Text style={wst.priceInputLabel}>Max (₹)</Text>
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
                            </View>

                            <View style={wst.filterDivider} />

                            {/* Color */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Color</Text>
                                <View style={wst.colorGrid}>
                                    {COLOR_OPTIONS.filter(c => c !== "All").map(col => (
                                        <TouchableOpacity
                                            key={col}
                                            style={[wst.colorDot, {
                                                backgroundColor: DOT_COLORS[col] ?? "#ccc",
                                                borderWidth: filterColor === col ? 3 : 1.5,
                                                borderColor: filterColor === col ? C.navy : "rgba(0,0,0,0.12)",
                                            }]}
                                            onPress={() => setFilterColor(filterColor === col ? "All" : col)}
                                        >
                                            {filterColor === col && (
                                                <Ionicons name="checkmark" size={10} color={col === "White" || col === "Yellow" ? C.textDark : C.white} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={wst.filterDivider} />

                            {/* ── WEB CHANGE 7: SIZE FILTER SECTION ── */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Size</Text>
                                <View style={wst.sizeGrid}>
                                    {SIZE_OPTIONS.map(sz => {
                                        const isActive = filterSize === sz;
                                        return (
                                            <TouchableOpacity
                                                key={sz}
                                                style={[wst.sizeChip, isActive && wst.sizeChipActive]}
                                                onPress={() => setFilterSize(isActive ? "All" : sz)}
                                                activeOpacity={0.75}
                                            >
                                                <Text style={[wst.sizeChipTxt, isActive && wst.sizeChipTxtActive]}>{sz}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <TouchableOpacity style={wst.applyFilterBtn} onPress={applyFilters} activeOpacity={0.85}>
                                <Feather name="check" size={13} color={C.white} />
                                <Text style={wst.applyFilterBtnTxt}>
                                    Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* RIGHT TABLE AREA */}
                    <View style={wst.tableArea}>
                        <View style={wst.tableToolbar}>
                            <View style={wst.tableToolbarLeft}>
                                <Text style={wst.tableResultCount}>
                                    <Text style={{ fontFamily: "Outfit_700Bold", color: C.navy }}>{processedProducts.length}</Text>
                                    {" "}products
                                </Text>
                                {(searchQuery || activeFilterCount > 0) && (
                                    <TouchableOpacity style={wst.clearChip} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                                        <Text style={wst.clearChipTxt}>Clear filters</Text>
                                        <Ionicons name="close" size={11} color={C.navy} />
                                    </TouchableOpacity>
                                )}
                                <View style={wst.activeSortIndicator}>
                                    <MaterialCommunityIcons name={SORT_OPTIONS.find(o=>o.value===sortBy)?.icon as any ?? "sort-variant"} size={12} color={C.purple} />
                                    <Text style={wst.activeSortTxt}>{sortBy}</Text>
                                </View>
                            </View>
                            <View style={wst.tableToolbarRight}>
                                <View style={wst.viewToggle}>
                                    <TouchableOpacity style={[wst.viewBtn, viewType === "list" && wst.viewBtnActive]} onPress={() => setViewType("list")}>
                                        <MaterialCommunityIcons name="format-list-bulleted" size={15} color={viewType === "list" ? C.white : C.textMid} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[wst.viewBtn, viewType === "grid" && wst.viewBtnActive]} onPress={() => setViewType("grid")}>
                                        <MaterialCommunityIcons name="grid" size={15} color={viewType === "grid" ? C.white : C.textMid} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* LIST VIEW */}
                        {viewType === "list" && (
                            <ScrollView style={wst.tableScroll} showsVerticalScrollIndicator={false}>
                                {/* ── WEB CHANGE 8: Table header now has Size + Category split into two cols ── */}
                                <View style={wst.tableHead}>
                                    <Text style={[wst.tableHeadCell, { flex: 3 }]}>Product</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1.2 }]}>SKU</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1 }]}>Category</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1 }]}>Sub-Type</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.6 }]}>Size</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.8 }]}>Price</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.7 }]}>Stock</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.9 }]}>Status</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.7, textAlign: "right" }]}>Actions</Text>
                                </View>
                                {visibleProducts.length === 0 ? (
                                    <View style={wst.emptyState}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={C.textLight} />
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
                                            <TouchableOpacity key={product.id} style={[wst.tableRow, idx % 2 === 1 && wst.tableRowAlt]} onPress={() => router.push("/(main)/Productdetail")} activeOpacity={0.7}>
                                                {/* Product */}
                                                <View style={[wst.tableCell, { flex: 3 }]}>
                                                    <Image source={{ uri: product.image }} style={wst.tableProductImg} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={wst.tableProductName} numberOfLines={1}>{product.name}</Text>
                                                        <Text style={wst.tableProductSub}>{product.color}</Text>
                                                        <Text style={wst.tableProductUpdated}>Updated {product.updated}</Text>
                                                    </View>
                                                </View>
                                                {/* SKU */}
                                                <View style={[wst.tableCell, { flex: 1.2 }]}>
                                                    <Text style={wst.tableCellSku}>{product.sku}</Text>
                                                </View>
                                                {/* ── WEB CHANGE 8a: Category col — only category + subcategory ── */}
                                                <View style={[wst.tableCell, { flex: 1, flexDirection: "column", alignItems: "flex-start", gap: 3 }]}>
                                                    <View style={wst.categoryTag}>
                                                        <Text style={wst.categoryTagTxt} numberOfLines={1}>{product.category}</Text>
                                                    </View>
                                                    <Text style={wst.subcategoryTxt}>{product.subcategory}</Text>
                                                </View>
                                                {/* ── WEB CHANGE 8b: Sub-Type col — subSubcategory as its own distinct teal pill ── */}
                                                <View style={[wst.tableCell, { flex: 1, flexDirection: "column", alignItems: "flex-start" }]}>
                                                    {product.subSubcategory ? (
                                                        <View style={wst.subSubPill}>
                                                            <MaterialCommunityIcons name="tag-outline" size={9} color={C.teal} />
                                                            <Text style={wst.subSubPillTxt}>{product.subSubcategory}</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={wst.subSubEmpty}>—</Text>
                                                    )}
                                                </View>
                                                {/* ── WEB CHANGE 8c: Size col — its own column ── */}
                                                <View style={[wst.tableCell, { flex: 0.6, flexDirection: "column", alignItems: "flex-start" }]}>
                                                    <View style={wst.sizePill}>
                                                        <Text style={wst.sizePillTxt}>{product.size}</Text>
                                                    </View>
                                                </View>
                                                {/* Price */}
                                                <View style={[wst.tableCell, { flex: 0.8 }]}>
                                                    <Text style={wst.tablePriceVal}>₹{product.price.toLocaleString()}</Text>
                                                </View>
                                                {/* Stock */}
                                                <View style={[wst.tableCell, { flex: 0.7, flexDirection: "column", alignItems: "flex-start", gap: 2 }]}>
                                                    <Text style={[wst.tableStockVal, isLow && { color: C.orange }]}>{product.stock}</Text>
                                                    {isLow && <Text style={wst.lowStockHint}>Low ⚠</Text>}
                                                    {product.stock === 0 && <Text style={wst.outStockHint}>Out</Text>}
                                                </View>
                                                {/* Status */}
                                                <View style={[wst.tableCell, { flex: 0.9 }]}>
                                                    <View style={[wst.statusPill, { backgroundColor: st.bg }]}>
                                                        <View style={[wst.statusDot, { backgroundColor: st.dot }]} />
                                                        <Text style={[wst.statusPillTxt, { color: st.color }]} numberOfLines={1}>{product.status}</Text>
                                                    </View>
                                                </View>
                                                {/* Actions */}
                                                <View style={[wst.tableCell, { flex: 0.7, justifyContent: "flex-end" }]}>
                                                    <TouchableOpacity style={wst.actionBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }} activeOpacity={0.75}>
                                                        <MaterialCommunityIcons name="dots-horizontal" size={16} color={C.textMid} />
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                                {hasMore && (
                                    <TouchableOpacity style={wst.loadMoreBtn} onPress={() => setVisibleCount(c => c + 20)} activeOpacity={0.8}>
                                        <MaterialCommunityIcons name="chevron-down-circle-outline" size={15} color={C.navy} />
                                        <Text style={wst.loadMoreTxt}>Load more ({processedProducts.length - visibleCount} remaining)</Text>
                                    </TouchableOpacity>
                                )}
                                {visibleProducts.length > 0 && (
                                    <Text style={wst.pageInfo}>Showing {visibleProducts.length} of {processedProducts.length}</Text>
                                )}
                            </ScrollView>
                        )}

                        {/* GRID VIEW */}
                        {viewType === "grid" && (
                            <ScrollView style={wst.tableScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                {visibleProducts.length === 0 ? (
                                    <View style={wst.emptyState}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={C.textLight} />
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
                                                <TouchableOpacity key={product.id} style={wst.webGridCard} onPress={() => router.push("/(main)/Productdetail")} activeOpacity={0.75}>
                                                    <View style={wst.webGridImgWrap}>
                                                        <Image source={{ uri: product.image }} style={wst.webGridImg} />
                                                        <View style={[wst.webGridStatusBadge, { backgroundColor: st.bg }]}>
                                                            <View style={[wst.statusDot, { backgroundColor: st.dot }]} />
                                                            <Text style={[wst.webGridStatusTxt, { color: st.color }]}>{product.status}</Text>
                                                        </View>
                                                        <TouchableOpacity style={wst.webGridMoreBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}>
                                                            <MaterialCommunityIcons name="dots-horizontal" size={15} color={C.textMid} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={wst.webGridInfo}>
                                                        <Text style={wst.webGridName} numberOfLines={2}>{product.name}</Text>
                                                        <Text style={wst.webGridSku}>{product.sku}</Text>
                                                        <View style={wst.webGridMeta}>
                                                            <Text style={wst.webGridPrice}>₹{product.price.toLocaleString()}</Text>
                                                            <Text style={wst.webGridStock}>Stock: {product.stock}</Text>
                                                        </View>
                                                        {/* ── WEB CHANGE 8d: Grid card shows category + subSubcategory pill separately ── */}
                                                        <View style={wst.webGridCatRow}>
                                                            <View style={wst.categoryTag}>
                                                                <Text style={wst.categoryTagTxt}>{product.category}</Text>
                                                            </View>
                                                            {product.subSubcategory && (
                                                                <View style={wst.subSubPill}>
                                                                    <Text style={wst.subSubPillTxt}>{product.subSubcategory}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {/* Size badge in grid */}
                                                        <View style={wst.webGridSizeRow}>
                                                            <MaterialCommunityIcons name="ruler" size={10} color={C.textLight} />
                                                            <Text style={wst.webGridSizeTxt}>Size: {product.size}</Text>
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
            </ScrollView>

            {/* MODALS */}
            {productActionId && (
                <WebProductActionPopup product={activeActionProduct} onClose={() => setProductActionId(null)} onDelete={handleDelete} onUpdateLocation={handleUpdateLocation} />
            )}
            {locationProductId && (
                <DeliveryLocationsModal product={locationProduct} onClose={() => setLocationProductId(null)} />
            )}
        </View>
    );
};

// ─────────────────────────────────────────────────────────────
// WEB DESKTOP STYLES
// ─────────────────────────────────────────────────────────────
const wst = StyleSheet.create({
    root: { flex: 1, flexDirection: "column", backgroundColor: "#F4F5FA", minHeight: "100%" as any },
    navbar: { backgroundColor: C.navyDeep, borderBottomWidth: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6, zIndex: 100 },
    navbarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, height: 58 },
    navLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    navTitleIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
    navTitleText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.white, letterSpacing: 0.2 },
    navRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    navSearch: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", width: 260 },
    navSearchInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.white, outlineStyle: "none" as any },
    navAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.purple, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, shadowColor: C.purple, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
    navAddBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },
    navBulkBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: "rgba(34,197,94,0.3)" },
    navBulkBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.green },
    pageScroll: { flex: 1 },
    pageContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    pageHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 },
    breadcrumb: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
    breadcrumbDim: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
    breadcrumbActive: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.navy },
    pageTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: C.navyDeep, letterSpacing: -0.4 },
    pageSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textLight },
    statsRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
    statCard: { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    statCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    statCardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    statCardVal: { fontFamily: "Outfit_800ExtraBold", fontSize: 26 },
    statCardLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textMid, marginBottom: 3 },
    statCardTrend: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },
    contentArea: { flexDirection: "row", gap: 14, flex: 1, minHeight: 600 },

    // ── FILTER PANEL ──
    filterPanel: { width: 240, backgroundColor: C.white, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    filterPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    filterPanelHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    filterPanelTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.navyDeep },
    filterCountBadge: { backgroundColor: C.navy, borderRadius: 8, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    filterCountBadgeTxt: { fontFamily: "Outfit_700Bold", fontSize: 10, color: C.white },
    filterClearAll: { fontFamily: "Outfit_600SemiBold", fontSize: 11.5, color: C.purple },
    filterSection: { marginBottom: 12 },
    filterSectionLabel: { fontFamily: "Outfit_700Bold", fontSize: 10.5, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 },
    filterDivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },
    filterTabItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, marginBottom: 2 },
    filterTabDot: { width: 6, height: 6, borderRadius: 3 },
    filterTabLabel: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: C.textMid },
    filterTabBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 7 },
    filterTabBadgeTxt: { fontFamily: "Outfit_700Bold", fontSize: 9.5, color: C.white },

    // Sort in sidebar
    sortSidebarItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8, marginBottom: 3 },
    sortSidebarItemActive: { backgroundColor: "#EEF1FF" },
    sortSidebarIconBox: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    sortSidebarLabel: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textMid },
    sortSidebarDesc: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight },

    // 3-level category tree
    catMainItem: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 7, marginBottom: 1 },
    catMainItemActive: { backgroundColor: "#EEF1FF" },
    catRadio: { width: 15, height: 15, borderRadius: 7.5, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    catRadioFilled: { borderColor: C.navy },
    catRadioInner: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.navy },
    catMainLabel: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: C.textMid },

    catSubItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 6, marginBottom: 1 },
    catSubItemActive: { backgroundColor: C.purplePale },
    catSubIndent: { width: 14 },
    catSubRadio: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    catSubRadioFilled: { borderColor: C.purple },
    catSubRadioInner: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.purple },
    catSubLabel: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 11.5, color: C.textMid },

    catSubSubItem: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 5, marginBottom: 1 },
    catSubSubItemActive: { backgroundColor: "#F0FDF8" },
    catSubSubIndent: { width: 26 },
    catSubSubDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
    catSubSubDotActive: { backgroundColor: C.teal },
    catSubSubLabel: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },

    // Price
    priceRangeInputs: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
    priceInput: { flex: 1 },
    priceInputLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight, marginBottom: 3 },
    priceInputField: { backgroundColor: C.bg, borderRadius: 7, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 6, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: C.textDark, outlineStyle: "none" as any },
    priceDash: { width: 10, height: 1.5, backgroundColor: C.border, marginTop: 12 },
    priceSliderTrack: { height: 3, backgroundColor: C.border, borderRadius: 2, position: "relative" },
    priceSliderFill: { position: "absolute", height: 3, backgroundColor: C.navy, borderRadius: 2 },

    // Color
    colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    colorDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },

    // ── WEB CHANGE 9: Size filter styles ──
    sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
    sizeChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, minWidth: 36, alignItems: "center" },
    sizeChipActive: { backgroundColor: C.navy, borderColor: C.navy },
    sizeChipTxt: { fontFamily: "Outfit_500Medium", fontSize: 11, color: C.textMid },
    sizeChipTxtActive: { color: C.white, fontFamily: "Outfit_600SemiBold" },

    applyFilterBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.navy, borderRadius: 9, paddingVertical: 10, marginTop: 8 },
    applyFilterBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.white },

    // TABLE
    tableArea: { flex: 1, backgroundColor: C.white, borderRadius: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: "hidden", flexDirection: "column" },
    tableToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "#FAFBFF" },
    tableToolbarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    tableResultCount: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    clearChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF1FF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    clearChipTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.navy },
    activeSortIndicator: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.purplePale, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
    activeSortTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.purple },
    tableToolbarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    viewToggle: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 7, padding: 2, borderWidth: 1, borderColor: C.border },
    viewBtn: { width: 28, height: 28, borderRadius: 5, alignItems: "center", justifyContent: "center" },
    viewBtnActive: { backgroundColor: C.navy },
    tableScroll: { flex: 1 },
    tableHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 11, backgroundColor: "#F8F9FC", borderBottomWidth: 1.5, borderBottomColor: C.border },
    tableHeadCell: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 },
    tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    tableRowAlt: { backgroundColor: "#FAFBFF" },
    tableCell: { flexDirection: "row", alignItems: "center", paddingRight: 8, gap: 10 },
    tableProductImg: { width: 44, height: 44, borderRadius: 9, backgroundColor: C.bg },
    tableProductName: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textDark, marginBottom: 2 },
    tableProductSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginBottom: 1 },
    tableProductUpdated: { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight },
    tableCellSku: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.purple, backgroundColor: C.purplePale, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },

    // Category column
    categoryTag: { backgroundColor: "#EEF1FF", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" },
    categoryTagTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10.5, color: C.navy },
    subcategoryTxt: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight },

    // ── WEB CHANGE 9: SubSubcategory as its own separate teal pill ──
    subSubPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F0FDF8", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "#CCFBEF", alignSelf: "flex-start" },
    subSubPillTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10.5, color: C.teal },
    subSubEmpty: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },

    // ── WEB CHANGE 9: Size pill in table ──
    sizePill: { backgroundColor: "#F3F4F6", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: C.border, alignSelf: "flex-start" },
    sizePillTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10.5, color: C.textMid },

    tablePriceVal: { fontFamily: "Outfit_700Bold", fontSize: 13.5, color: C.navyDeep },
    tableStockVal: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textDark },
    lowStockHint: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.orange },
    outStockHint: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.red },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusPillTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
    actionBtn: { width: 30, height: 30, borderRadius: 7, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },

    // Grid
    webGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 16 },
    webGridCard: { width: "22%" as any, minWidth: 180, backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    webGridImgWrap: { position: "relative" },
    webGridImg: { width: "100%", height: 140, backgroundColor: C.bg },
    webGridStatusBadge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
    webGridStatusTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
    webGridMoreBtn: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.93)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    webGridInfo: { padding: 12, gap: 4 },
    webGridName: { fontFamily: "Outfit_700Bold", fontSize: 12.5, color: C.textDark, lineHeight: 17 },
    webGridSku: { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight },
    webGridMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    webGridPrice: { fontFamily: "Outfit_700Bold", fontSize: 13.5, color: C.navy },
    webGridStock: { fontFamily: "Outfit_500Medium", fontSize: 10.5, color: C.textLight },
    // ── WEB CHANGE 9: Grid cat row and size row ──
    webGridCatRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 2 },
    webGridSizeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    webGridSizeTxt: { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight },

    loadMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginHorizontal: 18, marginVertical: 14, paddingVertical: 10, borderRadius: 9, borderWidth: 1.5, borderColor: C.navy, backgroundColor: "#EEF1FF" },
    loadMoreTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.navy },
    pageInfo: { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: C.textLight, textAlign: "center", paddingBottom: 14 },
    emptyState: { alignItems: "center", paddingVertical: 60 },
    emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textMid, marginTop: 12 },
    emptyDesc: { fontFamily: "Outfit_400Regular", fontSize: 12.5, color: C.textLight, marginTop: 4 },
    emptyBtn: { marginTop: 14, backgroundColor: C.navy, borderRadius: 9, paddingHorizontal: 22, paddingVertical: 9 },
    emptyBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },
});

// ─────────────────────────────────────────────────────────────
// MOBILE SCREEN — COMPLETELY UNCHANGED
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

            {/* Mobile filter sheet */}
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
// MOBILE STYLES — COMPLETELY UNCHANGED
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
// ROOT EXPORT
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