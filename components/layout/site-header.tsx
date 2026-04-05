"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/atoms/user";

const pathLabels: Record<string, string> = {
  inbox: "Inbox",
  "needs-review": "Needs Review",
  fax: "Fax Detail",
  split: "Document Splitting",
  referrals: "Referrals",
  communications: "Communications",
  dashboard: "Dashboard",
  settings: "Settings",
  "document-types": "Auto Filing Rules",
  sla: "SLA Rules",
  integrations: "Integrations",
  "auto-file": "Auto-File",
  "fax-lines": "Fax Lines",
};

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const authUser = useAtomValue(currentUserAtom);

  return (
    <header className="flex h-12 items-center gap-3 border-b bg-background px-6">
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            // Skip dynamic segments like [id]
            if (segment.startsWith("[") || /^[a-f0-9-]{36}$/.test(segment) || /^(fax|ref|pat)-/.test(segment)) {
              return null;
            }
            const label = pathLabels[segment] || segment;
            const href = "/" + segments.slice(0, index + 1).join("/");

            return (
              <span key={segment} className="flex items-center gap-1.5">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
              {authUser?.initials ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline-block">
            {authUser?.name ?? ""}
          </span>
        </div>
      </div>
    </header>
  );
}
