/** Loads .env (EXPO_PUBLIC_*) and exposes API settings to the app. */
const appJson = require("./app.json");

module.exports = {
    expo: {
        ...appJson.expo,
        extra: {
            apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "",
            devSellerId: process.env.EXPO_PUBLIC_DEV_SELLER_ID || "1",
            androidEmulatorApi: process.env.EXPO_PUBLIC_API_ANDROID_EMULATOR === "true",
        },
    },
};
