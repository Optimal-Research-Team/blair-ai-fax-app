"use client";

import { ReactNode, useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Download,
} from "lucide-react";
import { DOC_SIM_COLORS, CALLOUT_COLORS } from "@/lib/constants";

// Dynamically import react-pdf (uses pdfjs-dist which references DOMMatrix — browser only)
const PdfDocument = dynamic(
  () =>
    import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return { default: mod.Document };
    }),
  { ssr: false },
);

const PdfPage = dynamic(
  () => import("react-pdf").then((mod) => ({ default: mod.Page })),
  { ssr: false },
);

const PDF_PAGE_WIDTH = 612;

export interface DocumentMetadataField {
  label: string;
  value: ReactNode;
}

export interface DocumentViewerProps {
  currentPageIndex: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  metadata: DocumentMetadataField[];
  description?: string;
  detectedDocType?: string;
  showSignature?: boolean;
  pdfUrl?: string;
}

export function DocumentViewer({
  currentPageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  metadata,
  description,
  detectedDocType,
  showSignature = false,
  pdfUrl,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pdfError, setPdfError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(PDF_PAGE_WIDTH);

  // Track viewport width for responsive scaling
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewportWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch PDF as ArrayBuffer to avoid CORS issues with presigned S3 URLs
  useEffect(() => {
    if (!pdfUrl) {
      setPdfData(null);
      setPdfError(false);
      return;
    }
    setPdfError(false);
    let cancelled = false;
    fetch(pdfUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => {
        if (!cancelled) setPdfData(new Uint8Array(buf));
      })
      .catch(() => {
        if (!cancelled) setPdfError(true);
      });
    return () => { cancelled = true; };
  }, [pdfUrl, retryKey]);

  const pageWidth = Math.min(Math.max(viewportWidth - 48, 300), PDF_PAGE_WIDTH) * (zoom / 100);

  const pdfFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);

  const handlePdfError = useCallback(() => setPdfError(true), []);
  const handleManualRetry = useCallback(() => {
    setPdfError(false);
    setRetryKey((k) => k + 1);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!pdfUrl) return;
    try {
      const res = await fetch(pdfUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fax-document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(pdfUrl, '_blank');
    }
  }, [pdfUrl]);

  const loadingPlaceholder = (
    <div
      className="flex items-center justify-center bg-background border rounded-sm shadow-lg"
      style={{ width: `${pageWidth}px`, aspectRatio: '8.5 / 11' }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const errorPlaceholder = (
    <div
      className="flex flex-col items-center justify-center gap-3 bg-background border rounded-sm shadow-lg text-sm text-muted-foreground"
      style={{ width: `${pageWidth}px`, aspectRatio: '8.5 / 11' }}
    >
      <p>Unable to load PDF</p>
      <Button variant="outline" size="sm" onClick={handleManualRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        Retry
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onPrevPage}
            disabled={currentPageIndex === 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {currentPageIndex + 1} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onNextPage}
            disabled={currentPageIndex === totalPages - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-1"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Rotate document"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          {pdfUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 ml-1"
              onClick={handleDownload}
              aria-label="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Document display area */}
      <div
        ref={viewportRef}
        className={`flex-1 overflow-auto ${DOC_SIM_COLORS.pageBg} p-3 md:p-6`}
      >
        <div className="min-h-full flex items-start justify-center">
          {pdfUrl ? (
            pdfError ? (
              errorPlaceholder
            ) : !pdfData ? (
              loadingPlaceholder
            ) : (
              <PdfDocument
                key={`${pdfUrl}-${retryKey}`}
                file={pdfFile}
                loading={loadingPlaceholder}
                error={errorPlaceholder}
                noData={errorPlaceholder}
                onLoadError={handlePdfError}
                onSourceError={handlePdfError}
              >
                <div className="shrink-0 overflow-hidden rounded-sm border bg-background shadow-lg">
                  <PdfPage
                    pageNumber={currentPageIndex + 1}
                    width={pageWidth}
                    rotate={rotation}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    loading={loadingPlaceholder}
                    error={errorPlaceholder}
                    onRenderError={handlePdfError}
                  />
                </div>
              </PdfDocument>
            )
          ) : (
            <div
              className="bg-background shadow-lg border rounded-sm"
              style={{
                width: `${pageWidth}px`,
                minHeight: `${pageWidth / 8.5 * 11}px`,
              }}
            >
              <div className="p-8 space-y-4" style={{ fontSize: `${(14 * zoom) / 100}px` }}>
                <div className="border-b pb-4 space-y-2">
                  <div className={`h-3 ${DOC_SIM_COLORS.heading} rounded w-48`} />
                  <div className={`h-2 ${DOC_SIM_COLORS.subheading} rounded w-64`} />
                  <div className={`h-2 ${DOC_SIM_COLORS.subheading} rounded w-40`} />
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  {metadata.map((field) => (
                    <div key={field.label}>
                      <span className={DOC_SIM_COLORS.label}>{field.label}: </span>
                      <span className="font-medium">{field.value}</span>
                    </div>
                  ))}
                </div>
                {detectedDocType && (
                  <div className={`inline-block ${CALLOUT_COLORS.info.bg} ${CALLOUT_COLORS.info.body} border ${CALLOUT_COLORS.info.border} px-2 py-0.5 rounded text-xs font-medium`}>
                    Detected: {detectedDocType}
                  </div>
                )}
                <div className="space-y-3 pt-4">
                  <div className={`h-2 ${DOC_SIM_COLORS.bodyLine} rounded w-full`} />
                  <div className={`h-2 ${DOC_SIM_COLORS.bodyLine} rounded w-11/12`} />
                  <div className={`h-2 ${DOC_SIM_COLORS.bodyLine} rounded w-full`} />
                  <div className={`h-2 ${DOC_SIM_COLORS.bodyLine} rounded w-4/5`} />
                  <div className="h-4" />
                  {description && (
                    <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 italic">
                      {description}
                    </p>
                  )}
                  {showSignature && (
                    <>
                      <div className="h-8" />
                      <div className={`h-2 ${DOC_SIM_COLORS.heading} rounded w-32`} />
                      <div className={`h-2 ${DOC_SIM_COLORS.subheading} rounded w-48`} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
