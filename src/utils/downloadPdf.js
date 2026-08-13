import html2pdf from "html2pdf.js";

const sanitizeFileName = (value) =>
  String(value || "documento")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const waitForImages = (container) =>
  Promise.all(
    Array.from(
      container.querySelectorAll("img")
    ).map((image) => {
      if (
        image.complete &&
        image.naturalWidth > 0
      ) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        image.addEventListener(
          "load",
          resolve,
          { once: true }
        );

        image.addEventListener(
          "error",
          resolve,
          { once: true }
        );
      });
    })
  );

const waitForRender = (frameWindow) =>
  new Promise((resolve) => {
    frameWindow.requestAnimationFrame(() => {
      frameWindow.requestAnimationFrame(
        resolve
      );
    });
  });

const scopeStyles = (css) =>
  String(css || "").replace(
    /\bbody\b/g,
    ".pdf-export-root"
  );

export const downloadHtmlAsPdf = async (
  html,
  documentNumber
) => {
  const frame =
    document.createElement("iframe");

  frame.setAttribute(
    "title",
    "Generador de documento PDF"
  );

  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.top = "0";
  frame.style.width = "210mm";
  frame.style.height = "297mm";
  frame.style.border = "0";
  frame.style.pointerEvents = "none";
  frame.style.background = "#ffffff";

  document.body.appendChild(frame);

  try {
    const frameWindow =
      frame.contentWindow;

    const frameDocument =
      frame.contentDocument;

    if (!frameWindow || !frameDocument) {
      throw new Error(
        "No se pudo preparar el documento PDF."
      );
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const originalBodyStyles =
      frameWindow.getComputedStyle(
        frameDocument.body
      );

    const pdfRoot =
      frameDocument.createElement("div");

    pdfRoot.className =
      "pdf-export-root";

    pdfRoot.style.width = "210mm";
    pdfRoot.style.height = "auto";
    pdfRoot.style.minHeight = "auto";
    pdfRoot.style.margin = "0";
    pdfRoot.style.padding =
      originalBodyStyles.padding;
    pdfRoot.style.boxSizing =
      "border-box";
    pdfRoot.style.fontFamily =
      originalBodyStyles.fontFamily;
    pdfRoot.style.fontSize =
      originalBodyStyles.fontSize;
    pdfRoot.style.color =
      originalBodyStyles.color;
    pdfRoot.style.backgroundColor =
      originalBodyStyles.backgroundColor ||
      "#ffffff";
    pdfRoot.style.overflow = "visible";

    const scopedStyle =
      frameDocument.createElement("style");

    scopedStyle.textContent =
      Array.from(
        frameDocument.head.querySelectorAll(
          "style"
        )
      )
        .map((style) =>
          scopeStyles(style.textContent)
        )
        .join("\n");

    pdfRoot.appendChild(scopedStyle);

    while (frameDocument.body.firstChild) {
      pdfRoot.appendChild(
        frameDocument.body.firstChild
      );
    }

    frameDocument.body.appendChild(pdfRoot);

    frameDocument.body.style.margin = "0";
    frameDocument.body.style.padding = "0";
    frameDocument.body.style.width =
      "210mm";
    frameDocument.body.style.height =
      "auto";
    frameDocument.body.style.minHeight =
      "auto";
    frameDocument.body.style.background =
      "#ffffff";
    frameDocument.body.style.overflow =
      "visible";

    await waitForImages(pdfRoot);
    await frameDocument.fonts?.ready;
    await waitForRender(frameWindow);

    await html2pdf()
      .set({
        filename: `${sanitizeFileName(
          documentNumber
        )}.pdf`,

        margin: 0,

        image: {
          type: "jpeg",
          quality: 0.98,
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth:
            pdfRoot.scrollWidth || 794,
          scrollX: 0,
          scrollY: 0,
        },

        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },

        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [
            ".header",
            ".box",
            ".invoice-footer",
            ".totals",
            ".signatures",
            "tr",
          ],
        },
      })
      .from(pdfRoot)
      .save();
  } finally {
    frame.remove();
  }
};