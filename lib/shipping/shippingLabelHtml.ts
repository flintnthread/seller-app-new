import type { ShippingLabelData } from "./shippingLabelData";
import { formatInr } from "./shippingLabelData";

const LOGO_URL = "https://flintandthread.in/assets/images/logo.jpg";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoHtml(): string {
  return `
    <div class="logo-header">
      <img class="logo" src="${LOGO_URL}" alt="Flint &amp; Thread" onerror="this.style.display='none'" />
    </div>
  `;
}

function shipToAndMetaHtml(label: ShippingLabelData): string {
  const addressLines = esc(label.shipToAddress)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("<br/>");

  return `
    <div class="section">
      <div class="section-title">SHIP TO</div>
      <div class="ship-to-name">${esc(label.shipToName)}</div>
      <div class="ship-to-address">${addressLines}</div>
      <div class="ship-to-pin">PIN: ${esc(label.shipToPin)}</div>
      <div class="meta-grid meta-grid--inline">
        <div class="meta-key">Order #:</div><div class="meta-val">${esc(label.orderId)}</div>
        <div class="meta-key">Invoice:</div><div class="meta-val">${esc(label.invoiceNo)}</div>
        <div class="meta-key">Date:</div><div class="meta-val">${esc(label.orderDate)}</div>
        <div class="meta-key">Payment:</div><div class="meta-val">${esc(label.paymentLine)}</div>
        <div class="meta-key">Weight:</div><div class="meta-val">${esc(label.weight)}</div>
      </div>
    </div>
  `;
}

function productTableHtml(label: ShippingLabelData): string {
  const rows = label.items
    .map(
      (item) => `
        <tr>
          <td><strong>${esc(item.name)}</strong>${item.variant ? `<br/><span class="muted">${esc(item.variant)}</span>` : ""}</td>
          <td class="center">${esc(item.hsn)}</td>
          <td class="center">${item.qty}</td>
          <td class="right">${formatInr(item.basePrice)}</td>
          <td class="right">${item.cgstPct}<br/>${item.cgstAmt > 0 ? formatInr(item.cgstAmt) : "—"}</td>
          <td class="right">${item.sgstPct}<br/>${item.sgstAmt > 0 ? formatInr(item.sgstAmt) : "—"}</td>
          <td class="right">${item.igstAmt > 0 ? formatInr(item.igstAmt) : "—"}</td>
          <td class="right"><strong>${formatInr(item.lineTotal)}</strong></td>
        </tr>
      `,
    )
    .join("");

  return `
    <div class="section">
      <div class="section-title">PRODUCT DETAILS</div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="center">HSN</th>
            <th class="center">Q</th>
            <th class="right">Price</th>
            <th class="right">CGST</th>
            <th class="right">SGST</th>
            <th class="right">IGST</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="4"><strong>TOTAL:</strong></td>
            <td class="right">${formatInr(label.totalCgst)}</td>
            <td class="right">${formatInr(label.totalSgst)}</td>
            <td class="right">${formatInr(label.totalIgst)}</td>
            <td class="right"><strong>${formatInr(label.grandTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function returnAddressHtml(label: ShippingLabelData): string {
  return `
    <div class="return-section">
      <div class="section-title">RETURN ADDRESS</div>
      <div class="return-header">
        <div>${esc(label.returnBusinessName)}</div>
        <div class="gst-pill">GST: ${esc(label.gstNumber)}</div>
      </div>
      <div>${esc(label.returnAddressLine)} | Ph: ${esc(label.returnPhone)}</div>
    </div>
  `;
}

function footerHtml(label: ShippingLabelData): string {
  return `
    <div class="footer">
      <div class="footer-gst">${esc(label.taxSummaryLine)}</div>
      <div class="footer-note">AUTO-GENERATED LABEL — NO SIGNATURE REQUIRED</div>
      <div class="footer-powered">Powered By: Flint &amp; Thread</div>
    </div>
  `;
}

function shippingStripHtml(label: ShippingLabelData): string {
  const courierLabel =
    label.courier && label.courier !== "—" && label.courier.toLowerCase() !== "courier"
      ? label.courier
      : "Courier";

  return `
    <div class="shipping-strip">
      <div class="band">SHIPPING LABEL FOR FLINT &amp; THREAD</div>
      <div class="courier-row">
        <div class="courier-name">${esc(courierLabel)}</div>
        <div class="gst-pill">GST: ${esc(label.gstNumber)}</div>
      </div>
      <div class="barcode-section">
        <div class="barcode-left">
          <div class="awb-label">AWB NUMBER</div>
          <div class="barcode-img">${label.barcodeSvg}</div>
          <div class="awb-number">${esc(label.awb)}</div>
        </div>
        <div class="qr-wrap">${label.qrSvg}</div>
      </div>
    </div>
  `;
}

const LABEL_STYLES = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 20px;
    background: #fff;
    display: flex;
    justify-content: center;
  }
  .card {
    width: 450px;
    border: 1px solid #111;
    padding: 0;
    box-sizing: border-box;
  }
  .logo-header { text-align: center; padding: 6px 12px 4px; border-bottom: 1px solid #E5E7EB; }
  .logo { display: block; margin: 0 auto; width: auto; max-width: 160px; max-height: 48px; object-fit: contain; }
  .section { padding: 10px 12px; }
  .section-title {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 1px;
    margin-bottom: 6px;
    background: #F0F0F0;
    padding: 2px 4px;
    display: inline-block;
  }
  .ship-to-name { font-size: 13px; font-weight: 800; margin-bottom: 3px; }
  .ship-to-address { font-size: 10px; line-height: 15px; color: #333; margin-bottom: 3px; white-space: pre-line; }
  .ship-to-pin { font-size: 10px; font-weight: 800; margin-bottom: 8px; }
  .divider { border-bottom: 1px solid #111; }
  .meta-grid {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 4px;
    font-size: 9px;
  }
  .meta-grid--inline { margin-top: 4px; }
  .meta-key { font-weight: 600; color: #666; }
  .meta-val { font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 8px; margin-top: 6px; }
  th {
    background: #F5F7FA;
    font-weight: 700;
    text-align: left;
    padding: 4px 2px;
    border-bottom: 1px solid #111;
  }
  td { padding: 4px 2px; border-bottom: 1px solid #eee; vertical-align: top; }
  .center { text-align: center; }
  .right { text-align: right; }
  .muted { color: #666; font-size: 7px; }
  .total-row { font-weight: 700; background: #FAFAFA; border-top: 1px solid #111; }
  .return-section { padding: 10px 12px; background: #FFF9F5; font-size: 9px; line-height: 14px; border-top: 1px solid #111; }
  .return-header { display: flex; align-items: center; gap: 8px; font-weight: 800; margin-bottom: 4px; flex-wrap: wrap; }
  .footer {
    background: #F5F5F5;
    padding: 8px;
    text-align: center;
    font-size: 8px;
    color: #333;
    border-top: 1px solid #111;
  }
  .footer-gst { font-weight: 700; margin-bottom: 2px; }
  .footer-note { font-weight: 600; }
  .footer-powered { color: #F97316; font-weight: 700; margin-top: 2px; }
  .shipping-strip { border-bottom: 1px solid #E5E7EB; }
  .band {
    background: #F97316;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    padding: 6px 0;
    letter-spacing: 1px;
    text-align: center;
  }
  .courier-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid #E5E7EB;
  }
  .courier-name { font-size: 13px; font-weight: 700; }
  .gst-pill {
    background: #F97316;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .barcode-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
  }
  .awb-label { font-size: 8px; font-weight: 600; color: #666; letter-spacing: 0.5px; }
  .barcode-img { margin: 4px 0; }
  .barcode-img svg { max-width: 100%; height: auto; }
  .awb-number { font-size: 10px; font-weight: 600; letter-spacing: 1px; }
  .qr-wrap svg { width: 72px; height: 72px; display: block; }
  @media print {
    body { padding: 0; }
    .card { border: none; }
  }
`;

/** Label section order — keep in sync with ShippingLabelContent.tsx */
export function buildShippingLabelHtml(label: ShippingLabelData): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Shipping Label - ${esc(label.orderId)}</title>
    <style>${LABEL_STYLES}</style>
  </head>
  <body>
    <div class="card">
      ${logoHtml()}
      ${shippingStripHtml(label)}
      <div class="divider"></div>
      ${shipToAndMetaHtml(label)}
      <div class="divider"></div>
      ${productTableHtml(label)}
      ${returnAddressHtml(label)}
      ${footerHtml(label)}
    </div>
    <script>
      window.onload = function() {
        setTimeout(function() { window.print(); }, 300);
      };
    </script>
  </body>
</html>`;
}

export function openShippingLabelPrint(label: ShippingLabelData): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(buildShippingLabelHtml(label));
  printWindow.document.close();
}
