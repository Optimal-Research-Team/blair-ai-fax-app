"use client";

import { Fax, FaxPage } from "@/types";
import { DocumentViewer, type HighlightRegion } from "@/components/shared/document-viewer";
import { FormattedValue } from "@/components/shared/formatted-value";
import { formatPhone } from "@/lib/format";

interface FaxPageViewerProps {
  fax: Fax;
  currentPage: FaxPage;
  onPageChange: (pageIndex: number) => void;
  currentPageIndex: number;
  highlightRegion?: HighlightRegion | null;
}

export function FaxPageViewer({
  fax,
  currentPage,
  onPageChange,
  currentPageIndex,
  highlightRegion,
}: FaxPageViewerProps) {
  const metadata = [
    { label: "From", value: fax.senderName },
    { label: "Fax", value: <FormattedValue raw={fax.senderFaxNumber} formatted={formatPhone(fax.senderFaxNumber)} /> },
    { label: "Patient", value: fax.patientName || "N/A" },
    { label: "Date", value: new Date(fax.receivedAt).toLocaleDateString() },
  ];

  return (
    <DocumentViewer
      currentPageIndex={currentPageIndex}
      totalPages={fax.pageCount}
      onPrevPage={() => onPageChange(Math.max(0, currentPageIndex - 1))}
      onNextPage={() => onPageChange(Math.min(fax.pageCount - 1, currentPageIndex + 1))}
      metadata={metadata}
      description={fax.description}
      detectedDocType={currentPage?.detectedDocType}
      pdfUrl={fax.pdfUrl}
      showSignature
      highlightRegion={highlightRegion}
    />
  );
}
