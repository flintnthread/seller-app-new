import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const xmlPath = path.join(root, "assets", "legal", "document-raw.xml");
const outDir = path.join(root, "assets", "legal");

const xml = fs.readFileSync(xmlPath, "utf8");

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractParagraphs(xmlStr) {
  const paragraphs = [];
  const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let match;
  while ((match = pRegex.exec(xmlStr)) !== null) {
    const pXml = match[0];
    const texts = [...pXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) =>
      decodeEntities(m[1].replace(/<[^>]+>/g, ""))
    );
    const text = texts.join("").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const isBold = /<w:b\s*\/>|<w:b w:val="(?:1|true|on)"/i.test(pXml);
    const isHeading = isHeadingLine(text, isBold);

    paragraphs.push({ text, isHeading, isBold });
  }
  return paragraphs;
}

function isHeadingLine(text, isBold) {
  if (/^PART\s+[IVXLC]+/i.test(text)) return true;
  if (/^Key Platform Details/i.test(text)) return true;
  if (/^WHEREAS\b/i.test(text)) return false;
  if (/^NOW, THEREFORE/i.test(text)) return false;
  if (/^\d+\.\s+[A-Z]/.test(text) && text.length < 200) return true;
  if (/^[A-Z][A-Z0-9\s,&–\-]{3,}$/.test(text) && text.length < 120 && !text.includes(".")) return true;
  if (isBold && text.length < 140) return true;
  return false;
}

function isBulletLine(text) {
  return /^[•●▪◦]\s/.test(text) || /^[a-z]\)\s/i.test(text);
}

function stripBullet(text) {
  return text.replace(/^[•●▪◦]\s*/, "").replace(/^[a-z]\)\s/i, "");
}

function splitBodyAndBullets(text) {
  const parts = text.split(/\s*•\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { body: text, bullets: [] };
  }
  return { body: parts[0], bullets: parts.slice(1) };
}

function buildSections(paragraphs) {
  const sections = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const body = current.bodyParts.join("\n\n").trim();
    const section = {
      title: current.title || "Overview",
      body,
    };
    if (current.bullets.length) section.bullets = current.bullets;
    if (section.body || section.bullets?.length) sections.push(section);
    current = null;
  };

  for (const p of paragraphs) {
    const text = p.text;
    const bullet = isBulletLine(text);
    const content = bullet ? stripBullet(text) : text;

    if (p.isHeading && !bullet) {
      flush();
      current = { title: content, bodyParts: [], bullets: [] };
      continue;
    }

    if (!current) {
      current = { title: "Overview", bodyParts: [], bullets: [] };
    }

    if (bullet) {
      current.bullets.push(content);
    } else if (content.length > 800 && content.includes("•")) {
      const split = splitBodyAndBullets(content);
      if (split.body) current.bodyParts.push(split.body);
      current.bullets.push(...split.bullets);
    } else {
      current.bodyParts.push(content);
    }
  }
  flush();
  return sections;
}

function buildPlatformMeta(paragraphs) {
  const meta = [];
  let inMeta = false;
  for (const p of paragraphs) {
    if (/^Key Platform Details/i.test(p.text)) {
      inMeta = true;
      continue;
    }
    if (inMeta) {
      if (/^PART\s+I\b/i.test(p.text) || /Privacy Policy explains/i.test(p.text)) break;
      const m = p.text.match(/^([^:]+):\s*(.+)$/);
      if (m) meta.push({ label: m[1].trim(), value: m[2].trim() });
    }
  }
  return meta;
}

function isPrivacySection(title) {
  const t = title.toUpperCase();
  return (
    /PART XII/.test(t) ||
    t.includes("CONFIDENTIALITY, DATA PROTECTION, AND PRIVACY") ||
    (t === "CONFIDENTIALITY AND DATA PROTECTION" || t.startsWith("CONFIDENTIALITY AND DATA PROTECTION")) ||
    (t === "CONFIDENTIALITY" && !t.includes("SURVIVAL"))
  );
}

const paragraphs = extractParagraphs(xml);
const part1Idx = paragraphs.findIndex((p) => /^PART\s+I\b/i.test(p.text));

const introParagraphs = paragraphs.slice(0, part1Idx > 0 ? part1Idx : paragraphs.length);
const termsParagraphs = part1Idx > 0 ? paragraphs.slice(part1Idx) : [];

const platformMeta = buildPlatformMeta(introParagraphs);
function isPlatformMetaLine(text) {
  if (/^[^:]+:\s*.+$/.test(text) && text.length < 220 && !text.includes("http")) {
    const label = text.split(":")[0];
    if (label.length < 60) return true;
  }
  return false;
}

const introSections = buildSections(
  introParagraphs.filter(
    (p) => !/^Key Platform Details/i.test(p.text) && !isPlatformMetaLine(p.text)
  )
);

const allTermsSections = buildSections(termsParagraphs);
const privacyFromTerms = allTermsSections.filter((s) => isPrivacySection(s.title));
const termsOnlySections = allTermsSections.filter((s) => !isPrivacySection(s.title));

const privacySections = [...introSections, ...privacyFromTerms];

const meta = {
  effectiveDate: platformMeta.find((m) => /effective date/i.test(m.label))?.value || "June 19, 2026",
};

const privacy = {
  title: "Seller Privacy Policy",
  subtitle: "Flint & Thread (India) Private Limited — Seller Privacy & Data Protection",
  ...meta,
  platformMeta,
  sections: privacySections,
};

const terms = {
  title: "Seller Terms & Conditions",
  subtitle: "Flint & Thread — Supplier Agreement & Marketplace Terms",
  ...meta,
  platformMeta,
  sections: termsOnlySections,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "seller-privacy.json"), JSON.stringify(privacy, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "seller-terms.json"), JSON.stringify(terms, null, 2), "utf8");

console.log("Privacy sections:", privacySections.length);
console.log("Terms sections:", termsOnlySections.length);
console.log("Platform meta fields:", platformMeta.length);
