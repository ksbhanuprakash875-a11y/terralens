import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "TerraLens — AI Satellite Image Super-Resolution",
    description:
      "Enhance satellite imagery with ESRGAN-powered 4× super-resolution. Transform low-res satellite captures into crystal-clear images using AI.",
  },
  "/enhance": {
    title: "Enhance Image — TerraLens",
    description:
      "Upload a satellite image and enhance it with 4× ESRGAN super-resolution. Drag and drop for instant processing.",
  },
  "/results": {
    title: "Enhancement Results — TerraLens",
    description:
      "View your super-resolved satellite image with side-by-side comparison, quality metrics, and download options.",
  },
  "/about": {
    title: "About — TerraLens",
    description:
      "Learn about the ESRGAN architecture, training details, and performance benchmarks behind TerraLens.",
  },
};

const usePageMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = pageTitles[pathname] || pageTitles["/"];
    document.title = meta.title;

    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", meta.description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", meta.description);
  }, [pathname]);
};

export default usePageMeta;
