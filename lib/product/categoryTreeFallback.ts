/** Main category → middle category → leaf subcategories (offline / API-unavailable fallback). */
export type CategoryTreeFallback = Record<string, Record<string, string[]>>;

export const CATEGORY_TREE_FALLBACK: CategoryTreeFallback = {
    Accessories: {
        Bags: [
            "Backpacks",
            "Handbags",
            "Laptop Bags",
            "Lunch Carry Bags",
            "Sling Bags",
            "Travel Bags",
            "Trolley Bags",
            "Wallets & Clutches",
        ],
        "Belts & Caps": ["Belts", "Caps", "Gloves", "Goggles", "Hats", "Sunglasses"],
        "Gadgets Accessories": ["Clothing Accessories"],
        Jewellery: [
            "Anklets",
            "Anti Tarnish Chains",
            "Bangles",
            "Bracelet",
            "Bridal Necklace",
            "Chains",
            "Couple Bracelets",
            "Customized Name Pendants",
            "Earrings",
            "Jewellery Set",
            "Key-lock Couple Sets",
            "Necklaces",
            "Nose Pins",
            "Pearl Necklace Set",
            "Pendants",
            "Rings",
            "Vaddanam",
        ],
        "Other Accessories": ["Brooches", "Cufflinks", "Hair Accessories", "Mufflers", "Scarves"],
        Watches: ["Fitness Bands", "Men's Watches", "Women's Watches"],
    },
    "Beauty & Personal Care": {
        "Skincare Tools & Devices": ["Facial Devices"],
    },
    Clothing: {
        "Top Wear": [
            "Casual Shirts",
            "Coats",
            "Couple Wear",
            "Hoodies & Sweatshirts",
            "Jackets",
            "Polo Shirts",
            "Rain Jackets",
            "Shirts",
            "Sweaters",
            "T-Shirts",
        ],
        "Bottom Wear": [
            "Cargo Pants",
            "Casual Trousers",
            "Jeans",
            "Joggers",
            "Shorts / Bermudas",
            "Track Pants / Lower Wear",
            "Trousers (Formal / Regular)",
        ],
        "Western Wear": [
            "Dresses",
            "Jeans",
            "Jeggings",
            "Jumpsuits",
            "Skirts & Shorts",
            "T-Shirts",
            "Tops",
            "Trousers",
        ],
        "Ethnic Wear": [
            "Dress Material",
            "Embroidery Work Blouse",
            "JUMPSUITS",
            "Kurtas & Kurtis",
            "Kurtha Set With Duppatta",
            "Lehenga Cholis",
            "Long Frock",
            "Salwar Suits",
            "Sarees",
            "Slik-Dupattas",
        ],
        "Formal Wear": ["Formal Shirts", "Suits & Blazers", "Ties"],
        "Winter Wear": ["Cardigans", "Coats", "Jackets", "Shawls", "Sweaters"],
        "Innerwear & Nightwear": ["Briefs & Boxers", "Loungewear", "Sleepwear", "Thermals", "Trunks", "Vests"],
        "Lingerie & Sleepwear": [
            "Bottom Wear Inners",
            "Bras",
            "Camisoles",
            "Nightwear",
            "Panties",
            "Shapewear",
            "Swimwear",
            "Top Wear Inners",
        ],
        "Women's Clothing": ["Leggings", "Poplin", "Saree Fall"],
        "Women's Sportswear": [
            "Gym Wear",
            "Leggings",
            "Shorts",
            "Sports Bras",
            "Sports Tops",
            "Tracksuits",
            "Yoga Pants",
        ],
        "Men's Sportswear": ["Compression Wear", "Jerseys", "Shorts", "T-Shirts", "Track Pants"],
        "Girls Clothing": [
            "Capris",
            "Clothing Set",
            "Dresses",
            "Dungarees & Jumpsuits",
            "Ethnic Wear",
            "Jackets",
            "Kurta Set",
            "Leggings",
            "Lehenga-Cholis",
            "Shorts",
            "Skirts & Jeans",
            "Tops & T-Shirts",
            "Track Pants",
        ],
        "Boys Clothing": [
            "Clothing Set",
            "Ethnic Wear",
            "Jackets",
            "Jeans",
            "Nightwear",
            "Pyjamas",
            "Shorts",
            "Sweaters",
            "Sweatshirts",
            "T-Shirts",
            "Trousers",
        ],
    },
    Electronics: {
        Electronics: ["Mobiles", "Laptops", "Headphones", "Cameras", "Tablets", "Audio", "Wearables"],
    },
    Footwear: {
        "Kids' Footwear": [
            "Booties",
            "Casual Shoes",
            "Flats Shoes",
            "Flip Flops",
            "Heels",
            "Sandals",
            "School Shoes",
            "Socks",
        ],
        "Men's Footwear": ["Casual Shoes", "Flip Flops", "Formal Shoes", "Loafers", "Sandals", "Sneakers"],
        "Women's Footwear": ["Ballet Flats", "Boots", "Casual Shoes", "Flats", "Heels", "Wedges"],
        "Sports Footwear": [
            "Cleats",
            "Cycling Shoes",
            "Hiking Shoes",
            "Running Shoes",
            "Sports Sandals",
            "Training Shoes",
        ],
    },
    "Homely Hub": {
        "Art & Creative Gifts": ["Canvas Painting Prints", "Minimalist Line Art", "Pencil Sketches"],
        Chairs: [],
        "Corporate & Promotional Gifts": [
            "Company Logo Frames",
            "Diaries",
            "Medal",
            "Pens",
            "Trophies",
            "Welcome Combo Kits",
        ],
        "Everyday Utility": [
            "Cushion Covers",
            "Customized Mugs",
            "Desk Name Plates",
            "Keychains",
            "Printed Cushions",
            "Water Bottle",
        ],
        "Home Decor Gifts": [
            "Artificial Flower Frames",
            "Canva Prints",
            "Digital Clock",
            "Name Plates",
            "Photo Wall Collages",
            "Table Decor Showpieces",
            "Wall Clock",
        ],
        "Kids & Baby Gifts": [
            "Baby Name Frames",
            "Cartoon-Theme Photo Frames",
            "Growth Charts",
            "Soft Toys with Name",
        ],
        "Preschool Furniture": ["Chairs", "Dustbins"],
        "Spiritual & Festival Gifts": [
            "Customized Temple Frames",
            "Festival Hampers",
            "God Photo Frames",
        ],
        "Gifts for Couples": ["Explosion Gift Boxes", "Gift Items Novelties", "Love Scrapbooks"],
        "Event-Based Gifts": ["Birthday Combo Hampers", "Gift Hampers"],
        "Wearable & Personal Gifts": [
            "Caps",
            "Customized T-Shirts",
            "Hoodies",
            "Mask",
            "Personalized Towels & Handkerchiefs",
        ],
        "School Essentials": ["Bags", "Lunch Boxes", "School Uniforms", "Water Bottles"],
        "Pre Indoor Play Items": ["Rocking Toys", "Slides"],
        "Educational Materials": [
            "Building Blocks/Block Construction Set",
            "Lacing & Threading Toys",
            "Linking Toys",
            "Shape Sorter & Stacking Toys",
        ],
    },
    "Home & Living": {
        "Home & Living": ["Furniture", "Decor", "Kitchen", "Bedding"],
    },
    Books: {
        Books: ["Fiction", "Non-Fiction", "Academic", "Comics"],
    },
    Sports: {
        Sports: ["Cricket", "Football", "Tennis", "Yoga", "Gym"],
    },
    "Food & Sweets": {
        "Milk Sweets": ["Gulab Jamun", "Kalakand"],
        "Dry Sweets": ["Boondhi Laddu", "Dryfruit Laddu", "Sununda"],
    },
};

export function allLeafSubcategoriesFromTree(tree: CategoryTreeFallback): string[] {
    const leaves = new Set<string>();
    for (const mids of Object.values(tree)) {
        for (const [mid, leafList] of Object.entries(mids)) {
            if (leafList.length === 0) {
                leaves.add(mid);
            } else {
                for (const leaf of leafList) {
                    leaves.add(leaf);
                }
            }
        }
    }
    return [...leaves].sort((a, b) => a.localeCompare(b));
}
