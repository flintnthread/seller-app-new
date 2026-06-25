/** Loads .env and exposes API settings to Expo (required for physical device). */
const fs = require("fs");
const path = require("path");
const appJson = require("./app.json");

function readEnvFile(name) {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) {
        return process.env[name] || "";
    }
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        if (
            trimmed.startsWith("<<<<<<<") ||
            trimmed.startsWith("=======") ||
            trimmed.startsWith(">>>>>>>")
        ) {
            continue;
        }
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (key === name) return val;
    }
    return process.env[name] || "";
}

const apiBaseUrl = readEnvFile("EXPO_PUBLIC_API_BASE_URL").replace(/\/$/, "");
const devSellerId = readEnvFile("EXPO_PUBLIC_DEV_SELLER_ID") || "1";
const androidEmulatorApi = readEnvFile("EXPO_PUBLIC_API_ANDROID_EMULATOR") === "true";

if (!apiBaseUrl) {
    console.warn(
        "[app.config] EXPO_PUBLIC_API_BASE_URL is missing in .env — physical devices will fail to reach the API."
    );
} else {
    console.log("[app.config] API base URL:", apiBaseUrl);
}

module.exports = {
    expo: {
        ...appJson.expo,
        extra: {
            apiBaseUrl,
            devSellerId,
            androidEmulatorApi,
        },
    },
};
