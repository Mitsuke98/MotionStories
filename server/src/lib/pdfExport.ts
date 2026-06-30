import PDFDocument from "pdfkit";
import fs from "node:fs/promises";
import path from "node:path";

type DocRow = { title: string; contentType: string; sourceType: string; sourceUrl: string | null };
type FrameRow = { id: string; seqIndex: number; timestampSec: number; storageUrl: string };
type TransitionRow = {
  frameFromId: string;
  frameToId: string;
  description: string;
  motionTags: string[];
};

async function resolveImageBuffer(storageUrl: string): Promise<Buffer | null> {
  try {
    if (storageUrl.startsWith("http")) {
      const resp = await fetch(storageUrl);
      return Buffer.from(await resp.arrayBuffer());
    }
    // Local fallback path served from /public/frames/<key>
    const localPath = path.resolve("public", storageUrl.replace(/^\//, ""));
    return await fs.readFile(localPath);
  } catch {
    return null;
  }
}

export async function generateDocumentPdf(
  doc: DocRow,
  frameRows: FrameRow[],
  transitions: TransitionRow[]
): Promise<Buffer> {
  const pdf = new PDFDocument({ margin: 40, size: "LETTER" });
  const chunks: Buffer[] = [];
  pdf.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
  });

  pdf.fontSize(22).text(doc.title, { align: "left" });
  pdf.moveDown(0.3);
  pdf
    .fontSize(11)
    .fillColor("#555555")
    .text(`Content type: ${doc.contentType}  •  Source: ${doc.sourceType}`);
  pdf.moveDown(1);
  pdf.fillColor("#000000");

  const framesById = new Map(frameRows.map((f) => [f.id, f]));

  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    const frameA = framesById.get(t.frameFromId);
    const frameB = framesById.get(t.frameToId);

    pdf.fontSize(13).text(`Step ${i + 1}`, { underline: true });
    pdf.moveDown(0.3);

    const imgY = pdf.y;
    const imgW = 220;
    if (frameA) {
      const bufA = await resolveImageBuffer(frameA.storageUrl);
      if (bufA) pdf.image(bufA, pdf.x, imgY, { width: imgW });
    }
    if (frameB) {
      const bufB = await resolveImageBuffer(frameB.storageUrl);
      if (bufB) pdf.image(bufB, pdf.x + imgW + 20, imgY, { width: imgW });
    }
    pdf.y = imgY + 260;

    pdf.fontSize(10.5).text(t.description, { width: 480 });
    if (t.motionTags?.length) {
      pdf
        .fontSize(9)
        .fillColor("#777777")
        .text(`Tags: ${t.motionTags.join(", ")}`);
      pdf.fillColor("#000000");
    }
    pdf.moveDown(1.2);

    if (pdf.y > 650 && i < transitions.length - 1) {
      pdf.addPage();
    }
  }

  pdf.end();
  return done;
}
