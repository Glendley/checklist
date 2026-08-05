/* ============================================================
   Magnum CPA PC — Generated Package PDF Template
   ============================================================
   This file owns the VISUAL DESIGN of the client-facing package
   PDF only — colors, layout, fonts, image placement. Edit this
   file to restyle the document; it doesn't touch app logic in
   index.html, and index.html doesn't need to change when this
   file's design changes.

   Depends on (loaded as separate <script> tags before this one,
   see index.html):
     - jsPDF (CDN)              -> window.jspdf.jsPDF
     - pkg-pdf-assets.js        -> PKG_PDF_ASSETS (base64 images)

   Input: a `payload` object shaped like index.html's buildPayload()
   output — clientName, businessName, packagePreset, paymentFrequency,
   recurringLabel, recurringAmount, currentServices[{name,price,billing}],
   suggestedExpansions[...], estimatedOneTimeTotal, customPricedItemCount,
   generatedAt.
   ============================================================ */

const PKG_PDF_COLORS = {
  navy900:    [14, 28, 56],
  navy800:    [22, 41, 77],
  emerald500: [16, 185, 129],
  emerald700: [4, 120, 87],
  emerald50:  [236, 253, 245],
  slate700:   [51, 65, 85],
  slate500:   [100, 116, 139],
  slate400:   [148, 163, 184],
  slate200:   [226, 232, 240],
  white:      [255, 255, 255],
};

const PKG_PDF_LAYOUT = {
  pageMargin: 48,
  headerHeight: 100,
  logoWidth: 150,        // logo source is 1228x250 — height derives from this
  footerHeight: 70,
};

function pkgPdfFormatUsd(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

/* Mirrors the billing summary shown in index.html's summary panel and
   emails, but only reads already-computed payload fields — no pricing
   or payment-frequency conversion logic lives here. */
function pkgPdfInvestmentRows(payload) {
  const rows = [];
  if (payload.recurringAmount) {
    rows.push([`${payload.recurringLabel} (${payload.paymentFrequency})`, payload.recurringAmount]);
  }
  if (payload.estimatedOneTimeTotal > 0) {
    rows.push(['One-Time Fees', pkgPdfFormatUsd(payload.estimatedOneTimeTotal)]);
  }
  if (payload.customPricedItemCount > 0) {
    rows.push(['Custom-Quoted Items', payload.customPricedItemCount + ' (quoted at onboarding)']);
  }
  return rows;
}

function buildPackagePdf(payload) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { pageMargin: M } = PKG_PDF_LAYOUT;
  const contentWidth = pageWidth - M * 2;

  let y = 0;

  function ensureSpace(needed) {
    if (y + needed > pageHeight - PKG_PDF_LAYOUT.footerHeight) {
      doc.addPage();
      drawContinuationHeader();
    }
  }

  function drawBrandHeader() {
    doc.setFillColor(...PKG_PDF_COLORS.navy900);
    doc.rect(0, 0, pageWidth, PKG_PDF_LAYOUT.headerHeight, 'F');

    const logoW = PKG_PDF_LAYOUT.logoWidth;
    const logoH = logoW * (250 / 1228);
    doc.addImage(PKG_PDF_ASSETS.logo, 'PNG', M, (PKG_PDF_LAYOUT.headerHeight - logoH) / 2, logoW, logoH);

    doc.setTextColor(...PKG_PDF_COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Service Package Summary', pageWidth - M, 42, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const who = payload.businessName ? `${payload.clientName} — ${payload.businessName}` : payload.clientName;
    doc.text(who || '', pageWidth - M, 60, { align: 'right' });
    doc.text(new Date(payload.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - M, 74, { align: 'right' });

    y = PKG_PDF_LAYOUT.headerHeight + 34;
  }

  function drawContinuationHeader() {
    doc.setFillColor(...PKG_PDF_COLORS.navy800);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(...PKG_PDF_COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Magnum CPA PC — Service Package Summary (continued)', M, 25);
    y = 40 + 30;
  }

  function sectionHeading(label) {
    ensureSpace(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PKG_PDF_COLORS.navy900);
    doc.text(label.toUpperCase(), M, y);
    y += 6;
    doc.setDrawColor(...PKG_PDF_COLORS.slate200);
    doc.setLineWidth(1);
    doc.line(M, y, pageWidth - M, y);
    y += 18;
  }

  /* One priced line item: wrapping name on the left, price on the right,
     with a faint divider under each row. */
  function serviceRow(name, price, opts) {
    opts = opts || {};
    const nameColor = opts.muted ? PKG_PDF_COLORS.slate500 : PKG_PDF_COLORS.slate700;
    const priceColor = opts.muted ? PKG_PDF_COLORS.slate400 : PKG_PDF_COLORS.emerald700;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const nameLines = doc.splitTextToSize(name, contentWidth - 140);
    const rowHeight = Math.max(14 * nameLines.length, 14) + 8;
    ensureSpace(rowHeight);

    doc.setTextColor(...nameColor);
    doc.text(nameLines, M, y);
    doc.setTextColor(...priceColor);
    doc.setFont('helvetica', 'bold');
    doc.text(String(price), pageWidth - M, y, { align: 'right' });

    y += 14 * nameLines.length + 4;
    doc.setDrawColor(...PKG_PDF_COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.line(M, y, pageWidth - M, y);
    y += 10;
  }

  function drawInvestmentBox() {
    const rows = pkgPdfInvestmentRows(payload);
    if (!rows.length) return;

    const rowHeight = 18;
    const boxPadding = 14;
    const boxHeight = boxPadding * 2 + rowHeight * rows.length;
    ensureSpace(boxHeight + 16);

    doc.setFillColor(...PKG_PDF_COLORS.emerald50);
    doc.setDrawColor(...PKG_PDF_COLORS.emerald500);
    doc.setLineWidth(1);
    doc.roundedRect(M, y, contentWidth, boxHeight, 6, 6, 'FD');

    let rowY = y + boxPadding + 11;
    doc.setFontSize(10.5);
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PKG_PDF_COLORS.navy800);
      doc.text(label, M + boxPadding, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PKG_PDF_COLORS.emerald700);
      doc.text(String(value), pageWidth - M - boxPadding, rowY, { align: 'right' });
      rowY += rowHeight;
    });

    y += boxHeight + 24;
  }

  function drawTrustFooter() {
    const badges = [
      { img: PKG_PDF_ASSETS.bbbBadge, w: 172, h: 100 },
      { img: PKG_PDF_ASSETS.ramseyBadge, w: 243, h: 100 },
      { img: PKG_PDF_ASSETS.bestRateBadge, w: 122, h: 100 },
    ];
    const targetH = 28;
    const gap = 18;
    const scaled = badges.map(b => ({ ...b, dw: b.w * (targetH / b.h), dh: targetH }));
    const totalW = scaled.reduce((sum, b) => sum + b.dw, 0) + gap * (scaled.length - 1);

    ensureSpace(targetH + 40);
    y += 8;
    let x = (pageWidth - totalW) / 2;
    scaled.forEach(b => {
      doc.addImage(b.img, 'PNG', x, y, b.dw, b.dh);
      x += b.dw + gap;
    });
    y += targetH + 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PKG_PDF_COLORS.slate400);
    doc.text('Magnum CPA PC · Sacramento, California', pageWidth / 2, y, { align: 'center' });
  }

  function paginate() {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...PKG_PDF_COLORS.slate400);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - M, pageHeight - 24, { align: 'right' });
    }
  }

  // ---- Build the document ----
  drawBrandHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PKG_PDF_COLORS.navy900);
  doc.text(`${payload.packagePreset} Package`, M, y);
  y += 20;

  sectionHeading('Included Services');
  if (payload.currentServices.length) {
    payload.currentServices.forEach(s => serviceRow(s.name, s.price));
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...PKG_PDF_COLORS.slate400);
    doc.text('No services selected.', M, y);
    y += 20;
  }

  y += 6;
  drawInvestmentBox();

  if (payload.suggestedExpansions.length) {
    sectionHeading('Suggested Expansions');
    payload.suggestedExpansions.forEach(s => serviceRow(s.name, s.price, { muted: true }));
  }

  drawTrustFooter();
  paginate();

  return doc;
}

function downloadPackagePdf(payload) {
  const doc = buildPackagePdf(payload);
  const safeClientName = (payload.clientName || 'client').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const dateStamp = new Date(payload.generatedAt).toISOString().slice(0, 10);
  doc.save(`Service-Package-${safeClientName}-${dateStamp}.pdf`);
}
