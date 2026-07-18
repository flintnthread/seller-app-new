/** Expo config — API host is auto-detected from Metro (no ipconfig / .env IP needed). */
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

const devSellerId = readEnvFile("EXPO_PUBLIC_DEV_SELLER_ID") || "1";
const androidEmulatorApi = readEnvFile("EXPO_PUBLIC_API_ANDROID_EMULATOR") === "true";
const webBasePath =
    process.env.EXPO_PUBLIC_WEB_BASE_PATH !== undefined
        ? process.env.EXPO_PUBLIC_WEB_BASE_PATH
        : readEnvFile("EXPO_PUBLIC_WEB_BASE_PATH") || "/Seller";

module.exports = {
    expo: {
        ...appJson.expo,
        experiments: {
            ...appJson.expo.experiments,
            baseUrl: webBasePath,
        },
        extra: {
            ...appJson.expo.extra,
            devSellerId,
            androidEmulatorApi,
        },
    },
};
