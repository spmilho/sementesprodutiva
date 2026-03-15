interface ExportStandaloneHtmlOptions {
  sourceElement: HTMLElement;
  fileName: string;
  title: string;
  styles: string;
  wrapperClassName?: string;
}

const RESOURCE_ATTRS = ["src", "poster", "srcset"] as const;
const URL_IN_STYLE_REGEX = /url\((['"]?)(.*?)\1\)/g;

const isIgnorableUrl = (value: string | null): boolean => {
  if (!value) return true;
  const v = value.trim();
  return (
    v === "" ||
    v.startsWith("data:") ||
    v.startsWith("#") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:") ||
    v.startsWith("javascript:")
  );
};

const toAbsoluteUrl = (value: string): string => {
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return value;
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const fetchAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Falha ao buscar recurso (${response.status}): ${url}`);
  }
  const blob = await response.blob();
  return blobToDataUrl(blob);
};

const sanitizeFileName = (value: string): string => {
  const clean = value.replace(/[/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  const finalName = clean.toLowerCase().endsWith(".html") ? clean : `${clean}.html`;
  return finalName || "relatorio.html";
};

const replaceCanvasWithImages = (sourceRoot: HTMLElement, cloneRoot: HTMLElement) => {
  const sourceCanvases = Array.from(sourceRoot.querySelectorAll("canvas"));
  const cloneCanvases = Array.from(cloneRoot.querySelectorAll("canvas"));

  sourceCanvases.forEach((sourceCanvas, index) => {
    const cloneCanvas = cloneCanvases[index];
    if (!cloneCanvas) return;

    try {
      const dataUrl = sourceCanvas.toDataURL("image/png");
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "Gráfico exportado";
      img.className = cloneCanvas.className;
      img.setAttribute("style", cloneCanvas.getAttribute("style") || "");
      img.width = cloneCanvas.width;
      img.height = cloneCanvas.height;
      cloneCanvas.replaceWith(img);
    } catch {
      // Keep canvas if conversion fails
    }
  });
};

const embedImgSources = async (
  sourceRoot: HTMLElement,
  cloneRoot: HTMLElement,
  unresolved: Set<string>,
) => {
  const sourceImages = Array.from(sourceRoot.querySelectorAll("img"));
  const cloneImages = Array.from(cloneRoot.querySelectorAll("img"));

  await Promise.all(
    cloneImages.map(async (cloneImg, index) => {
      const sourceImg = sourceImages[index];
      const rawSrc = sourceImg?.currentSrc || sourceImg?.getAttribute("src") || cloneImg.getAttribute("src");
      if (isIgnorableUrl(rawSrc)) return;

      const absoluteSrc = toAbsoluteUrl(String(rawSrc));

      try {
        const dataUrl = await fetchAsDataUrl(absoluteSrc);
        cloneImg.setAttribute("src", dataUrl);
        cloneImg.removeAttribute("srcset");
        cloneImg.removeAttribute("sizes");
      } catch {
        try {
          if (sourceImg && sourceImg.complete && sourceImg.naturalWidth > 0) {
            const canvas = document.createElement("canvas");
            canvas.width = sourceImg.naturalWidth;
            canvas.height = sourceImg.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context indisponível");
            ctx.drawImage(sourceImg, 0, 0);
            cloneImg.setAttribute("src", canvas.toDataURL("image/png"));
            cloneImg.removeAttribute("srcset");
            cloneImg.removeAttribute("sizes");
            return;
          }
        } catch {
          // fallback below
        }
        unresolved.add(absoluteSrc);
      }
    }),
  );
};

const embedSvgImageSources = async (cloneRoot: HTMLElement, unresolved: Set<string>) => {
  const svgImages = Array.from(cloneRoot.querySelectorAll("image"));

  await Promise.all(
    svgImages.map(async (svgImage) => {
      const rawHref =
        svgImage.getAttribute("href") ||
        svgImage.getAttributeNS("http://www.w3.org/1999/xlink", "href");

      if (isIgnorableUrl(rawHref)) return;

      const absoluteHref = toAbsoluteUrl(String(rawHref));
      try {
        const dataUrl = await fetchAsDataUrl(absoluteHref);
        svgImage.setAttribute("href", dataUrl);
        svgImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", dataUrl);
      } catch {
        unresolved.add(absoluteHref);
      }
    }),
  );
};

const embedBackgroundImages = async (cloneRoot: HTMLElement, unresolved: Set<string>) => {
  const styledElements = Array.from(cloneRoot.querySelectorAll<HTMLElement>("[style*='url(']"));

  await Promise.all(
    styledElements.map(async (element) => {
      const styleAttr = element.getAttribute("style");
      if (!styleAttr) return;

      let updatedStyle = styleAttr;
      const matches = Array.from(styleAttr.matchAll(URL_IN_STYLE_REGEX));

      for (const match of matches) {
        const fullMatch = match[0];
        const rawUrl = match[2];
        if (isIgnorableUrl(rawUrl)) continue;

        const absoluteUrl = toAbsoluteUrl(rawUrl);
        try {
          const dataUrl = await fetchAsDataUrl(absoluteUrl);
          updatedStyle = updatedStyle.replace(fullMatch, `url("${dataUrl}")`);
        } catch {
          unresolved.add(absoluteUrl);
        }
      }

      element.setAttribute("style", updatedStyle);
    }),
  );
};

const collectExternalDependencies = (cloneRoot: HTMLElement): string[] => {
  const unresolved = new Set<string>();

  cloneRoot.querySelectorAll("*").forEach((el) => {
    RESOURCE_ATTRS.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (isIgnorableUrl(value)) return;

      if (attr === "srcset") {
        value
          ?.split(",")
          .map((item) => item.trim().split(" ")[0])
          .filter(Boolean)
          .forEach((src) => {
            if (!isIgnorableUrl(src)) unresolved.add(src);
          });
        return;
      }

      unresolved.add(String(value));
    });

    const href =
      el.getAttribute("href") ||
      el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!isIgnorableUrl(href) && (el.tagName.toLowerCase() === "image" || el.tagName.toLowerCase() === "link")) {
      unresolved.add(String(href));
    }

    const style = el.getAttribute("style");
    if (style) {
      Array.from(style.matchAll(URL_IN_STYLE_REGEX)).forEach((match) => {
        const rawUrl = match[2];
        if (!isIgnorableUrl(rawUrl)) unresolved.add(rawUrl);
      });
    }
  });

  return Array.from(unresolved);
};

export async function exportStandaloneHtmlFile(options: ExportStandaloneHtmlOptions): Promise<void> {
  const { sourceElement, fileName, title, styles, wrapperClassName = "report-container" } = options;

  const clone = sourceElement.cloneNode(true) as HTMLElement;

  // Remove direct inline style blocks from rendered app view to avoid dependency on app design tokens
  Array.from(clone.children).forEach((child) => {
    if (child.tagName.toLowerCase() === "style") child.remove();
  });

  replaceCanvasWithImages(sourceElement, clone);

  const unresolvedResources = new Set<string>();

  await Promise.all([
    embedImgSources(sourceElement, clone, unresolvedResources),
    embedSvgImageSources(clone, unresolvedResources),
    embedBackgroundImages(clone, unresolvedResources),
  ]);

  const externalDependencies = collectExternalDependencies(clone);
  externalDependencies.forEach((item) => unresolvedResources.add(item));

  if (unresolvedResources.size > 0) {
    const sample = Array.from(unresolvedResources).slice(0, 5).join("\n- ");
    throw new Error(
      `Ainda existem recursos externos não incorporados:\n- ${sample}${
        unresolvedResources.size > 5 ? "\n- ..." : ""
      }`,
    );
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="${wrapperClassName}">${clone.innerHTML}</div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sanitizeFileName(fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
