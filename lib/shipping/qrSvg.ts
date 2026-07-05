import QRCode from "qrcode";

export async function qrToSvg(data: string, size = 72): Promise<string> {
  const payload = data.trim() || "0";
  return QRCode.toString(payload, {
    type: "svg",
    width: size,
    margin: 1,
    color: { dark: "#111111", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export async function qrToDataUrl(data: string, size = 72): Promise<string> {
  const payload = data.trim() || "0";
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 1,
    color: { dark: "#111111", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
