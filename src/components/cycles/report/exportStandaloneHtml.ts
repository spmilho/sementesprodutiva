import { supabase } from "@/integrations/supabase/client";

interface ExportStandaloneHtmlOptions {
  sourceElement: HTMLElement;
  fileName: string;
  title: string;
  styles: string;
  wrapperClassName?: string;
}

const sb = supabase as any;
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

const parseStorageObjectUrl = (url: string): { bucket: string; path: string } | null => {
  try {
    const { pathname } = new URL(url, window.location.href);
    const match = pathname.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/);
    if (!match) return null;

    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);
    if (!bucket || !path) return null;

    return { bucket, path };
  } catch {
    return null;
  }
};

const tryFetchBlob = async (url: string, credentials: RequestCredentials): Promise<Blob> => {
  const response = await fetch(url, {
    credentials,
    mode: "cors",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar recurso (${response.status}): ${url}`);
  }

  return response.blob();
};

const tryStorageDownload = async (url: string): Promise<Blob | null> => {
  const parsed = parseStorageObjectUrl(url);
  if (!parsed) return null;

  try {
    const { data, error } = await sb.storage.from(parsed.bucket).download(parsed.path);
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

const fetchAsDataUrl = async (url: string): Promise<string> => {
  try {
    const blob = await tryFetchBlob(url, "omit");
    return blobToDataUrl(blob);
  } catch {
    try {
      const blob = await tryFetchBlob(url, "include");
      return blobToDataUrl(blob);
    } catch (includeError) {
      const storageBlob = await tryStorageDownload(url);
      if (storageBlob) {
        return blobToDataUrl(storageBlob);
      }

      if (includeError instanceof Error) throw includeError;
      throw new Error(`Falha ao buscar recurso: ${url}`);
    }
  }
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

const stripRemainingExternalAttrs = (cloneRoot: HTMLElement) => {
  cloneRoot.querySelectorAll("*").forEach((el) => {
    RESOURCE_ATTRS.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (!value) return;

      if (attr === "srcset") {
        const kept = value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => {
            const candidate = item.split(" ")[0];
            return isIgnorableUrl(candidate) || candidate.startsWith("data:");
          })
          .join(", ");

        if (kept) el.setAttribute(attr, kept);
        else el.removeAttribute(attr);
        return;
      }

      if (!isIgnorableUrl(value) && !value.trim().startsWith("data:")) {
        el.removeAttribute(attr);
      }
    });

    const href = el.getAttribute("href");
    if (href && !isIgnorableUrl(href) && !href.trim().startsWith("data:")) {
      el.removeAttribute("href");
    }

    const xlinkHref = el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (xlinkHref && !isIgnorableUrl(xlinkHref) && !xlinkHref.trim().startsWith("data:")) {
      el.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
      el.removeAttribute("href");
      el.removeAttribute("xlink:href");
    }

    if (el.tagName.toLowerCase() === "a") {
      el.removeAttribute("target");
      el.removeAttribute("rel");
    }
  });
};

const inlineStyleSheetAssets = async (
  styles: string,
  unresolved: Set<string>,
  tolerateUnresolved: boolean,
): Promise<string> => {
  let updatedStyles = styles;
  const matches = Array.from(styles.matchAll(URL_IN_STYLE_REGEX));

  for (const match of matches) {
    const fullMatch = match[0];
    const rawUrl = match[2];
    if (isIgnorableUrl(rawUrl)) continue;

    const absoluteUrl = toAbsoluteUrl(rawUrl);
    try {
      const dataUrl = await fetchAsDataUrl(absoluteUrl);
      updatedStyles = updatedStyles.replace(fullMatch, `url("${dataUrl}")`);
    } catch {
      unresolved.add(absoluteUrl);
      if (tolerateUnresolved) {
        updatedStyles = updatedStyles.replace(fullMatch, "none");
      }
    }
  }

  return updatedStyles;
};

const buildStandaloneHtml = async (
  options: ExportStandaloneHtmlOptions,
  tolerateUnresolved: boolean,
): Promise<string> => {
  const { sourceElement, title, styles, wrapperClassName = "report-container" } = options;
  const clone = sourceElement.cloneNode(true) as HTMLElement;

  Array.from(clone.children).forEach((child) => {
    if (child.tagName.toLowerCase() === "style") child.remove();
  });

  replaceCanvasWithImages(sourceElement, clone);

  const unresolvedResources = new Set<string>();
  const inlinedStyles = await inlineStyleSheetAssets(styles, unresolvedResources, tolerateUnresolved);

  await Promise.all([
    embedImgSources(sourceElement, clone, unresolvedResources),
    embedSvgImageSources(clone, unresolvedResources),
    embedBackgroundImages(clone, unresolvedResources),
  ]);

  const externalDependencies = collectExternalDependencies(clone);
  externalDependencies.forEach((item) => unresolvedResources.add(item));

  if (unresolvedResources.size > 0 && !tolerateUnresolved) {
    const sample = Array.from(unresolvedResources).slice(0, 5).join("\n- ");
    throw new Error(
      `Ainda existem recursos externos não incorporados:\n- ${sample}${
        unresolvedResources.size > 5 ? "\n- ..." : ""
      }`,
    );
  }

  stripRemainingExternalAttrs(clone);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${inlinedStyles}</style>
</head>
<body>
  <div class="${wrapperClassName}">${clone.innerHTML}</div>
</body>
</html>`;
};

export async function exportStandaloneHtmlFile(
  options: ExportStandaloneHtmlOptions,
): Promise<{ objectUrl: string; fileName: string; blob: Blob }> {
  const { fileName } = options;
  const htmlContent = await buildStandaloneHtml(options, false);

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeFileName = sanitizeFileName(fileName);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFileName;
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 0);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 300_000);

  return { objectUrl: url, fileName: safeFileName, blob };
}

const getPublicServeReportUrl = (code: string): string => {
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-report`;
  const url = new URL(baseUrl);
  url.searchParams.set("code", code);
  return url.toString();
};

/**
 * Upload the standalone HTML, register a public slug and return a rendered public route.
 */
export async function uploadHtmlAndGetShareLink(
  options: ExportStandaloneHtmlOptions & { userId: string; cycleId: string },
): Promise<string> {
  const { userId, cycleId, ...exportOptions } = options;

  const htmlContent = await buildStandaloneHtml(exportOptions, true);

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const timestamp = Date.now();
  const storagePath = `${userId}/${cycleId}-${timestamp}.html`;

  const { error: uploadError } = await sb.storage
    .from("shared-reports")
    .upload(storagePath, blob, {
      contentType: "text/html; charset=utf-8",
      upsert: true,
      cacheControl: "86400",
    });

  if (uploadError) throw new Error(`Falha ao fazer upload: ${uploadError.message}`);

  let code = "";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = generateShortCode();

    const { error: insertError } = await sb
      .from("shared_report_links")
      .insert({
        code,
        cycle_id: cycleId,
        created_by: userId,
        storage_path: storagePath,
      });

    if (!insertError) {
      return `${getPublicAppOrigin()}/r/${encodeURIComponent(code)}`;
    }

    lastError = new Error(insertError.message);

    if (!String(insertError.message || "").toLowerCase().includes("duplicate")) {
      break;
    }
  }

  throw lastError ?? new Error("Falha ao gerar link público do relatório.");
}

function generateShortCode(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
