"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Inbox,
  ListTodo,
  BarChart3,
  Settings,
  FileType,
  Clock,
  Zap,
  Phone,
  ChevronDown,
  FileQuestion,
  FileText,
  Trash2,
  AlertCircle,
  MessageSquare,
  Menu,
  ChevronLeft,
  LogOut,
  ClipboardList,
  FileStack,
  Rss,
  Brain,
  Headset,
  Hash,
  Users,
  Stethoscope,
  Plug,
  Building2,
  Gauge,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/atoms/user";
import { faxesAtom } from "@/atoms/inbox";
import { allWorklistItemsAtom } from "@/atoms/worklist";
import {
  simulatedReferralsAtom,
  zendeskTicketsAtom,
  slackAlertsAtom,
} from "@/atoms/simulation";
import {
  organizationsAtom,
  selectedOrgIdAtom,
  selectedOrgAtom,
} from "@/atoms/organization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const iconMap = {
  Inbox,
  ListTodo,
  BarChart3,
  Settings,
  FileType,
  Clock,
  Zap,
  Phone,
  Plug,
  Gauge,
} as const;

const navGroups = [
  {
    title: "Analytics",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: "BarChart3" as const },
    ],
  },
  {
    title: "Main",
    items: [
      { title: "Inbox", href: "/inbox", icon: "Inbox" as const },
    ],
  },
];

function StageNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-foreground/10 text-[8px] font-bold text-foreground/70 leading-none">
      {n}
    </span>
  );
}

const sidebarPipelineItems = [
  { title: "Admin Triage", href: "/mri-pipeline?stage=triage", number: 1 },
  { title: "Patient Screening", href: "/mri-pipeline?stage=screening", number: 2 },
  { title: "Radiologist Review", href: "/mri-pipeline?stage=radiologist", number: 3 },
  { title: "Scheduling", href: "/mri-pipeline?stage=scheduling", number: 4 },
  { title: "Pre-Appt Confirmation", href: "/mri-pipeline?stage=confirmation", number: 5 },
];

const sidebarReferralSummaryItems = [
  { title: "Referral Comms", href: "/referrals/communications", icon: MessageSquare },
  { title: "All Referrals", href: "/referrals", icon: FileStack },
];

const sidebarIntegrationItems = [
  { title: "Cerebrum", href: "/integrations/cerebrum", icon: Brain },
  { title: "Zendesk", href: "/integrations/zendesk", icon: Headset },
  { title: "Slack", href: "/integrations/slack", icon: Hash },
  { title: "Patients", href: "/integrations/patients", icon: Users },
  { title: "Providers", href: "/integrations/providers", icon: Stethoscope },
];

const settingsItems = [
  { title: "Auto Filing Rules", href: "/settings/document-types", icon: "FileType" as const },
  { title: "SLA Rules", href: "/settings/sla", icon: "Clock" as const },
  { title: "Fax Lines", href: "/settings/fax-lines", icon: "Phone" as const },
  { title: "Connectors", href: "/settings/connectors", icon: "Plug" as const },
  { title: "Calibration", href: "/settings/calibration", icon: "Gauge" as const },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";

  const authUser = useAtomValue(currentUserAtom);
  const organizations = useAtomValue(organizationsAtom);
  const selectedOrg = useAtomValue(selectedOrgAtom);
  const setSelectedOrgId = useSetAtom(selectedOrgIdAtom);

  const allFaxes = useAtomValue(faxesAtom);

  // Inbox count: only actionable faxes
  const inboxCount = useMemo(
    () => allFaxes.filter((f) =>
      f.status === "pending-review" || f.status === "in-progress"
    ).length,
    [allFaxes]
  );

  // Worklist counts from store
  const worklistItems = useAtomValue(allWorklistItemsAtom);
  const worklistCounts = useMemo(() => ({
    all: worklistItems.length,
    unclassified: worklistItems.filter((i) => i.category === "unclassified").length,
    referral: worklistItems.filter((i) => i.category === "referral").length,
    junk: worklistItems.filter((i) => i.category === "junk").length,
    "filing-error": worklistItems.filter((i) => i.category === "filing-error").length,
  }), [worklistItems]);

  // Referral summary counts
  const allReferrals = useAtomValue(simulatedReferralsAtom);
  const referralCounts = useMemo(() => {
    // Referral Comms = All Referrals (every referral has at least one communication)
    const all = allReferrals.length;
    return { comms: all, all };
  }, [allReferrals]);

  // Feed counts
  const zendeskTickets = useAtomValue(zendeskTicketsAtom);
  const slackAlerts = useAtomValue(slackAlertsAtom);
  const feedCounts = useMemo(() => {
    // Cerebrum count: total PAGES from completed/auto-filed faxes
    // Each page is sent to Cerebrum independently
    const coveredFaxIds = new Set(allReferrals.map((r) => r.faxId));

    // Count pages from referral documents
    let cerebrumPageCount = 0;
    for (const ref of allReferrals) {
      for (const doc of ref.documents) {
        cerebrumPageCount += doc.pages?.length || doc.pageCount || 1;
      }
    }

    // Count pages from non-referral completed/auto-filed faxes
    for (const fax of allFaxes) {
      if (coveredFaxIds.has(fax.id)) continue;
      if (fax.status !== "completed" && fax.status !== "auto-filed") continue;
      if (fax.processingState) continue;
      cerebrumPageCount += fax.pages?.length || fax.pageCount || 1;
    }

    return {
      Cerebrum: cerebrumPageCount,
      Zendesk: zendeskTickets.filter((t) => t.status !== "resolved").length,
      Slack: slackAlerts.length,
    } as Record<string, number>;
  }, [allReferrals, allFaxes, zendeskTickets, slackAlerts]);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-3.5 pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <div
              className={`flex items-center p-2 ${
                collapsed ? "justify-center" : "justify-between"
              }`}
            >
              <Link
                href="/inbox"
                className={`flex items-center gap-3 transition-all duration-200 ${
                  collapsed
                    ? "w-0 opacity-0 overflow-hidden"
                    : "flex-1 opacity-100"
                }`}
              >
                <Image
                  src="/logo-dark.svg"
                  alt="Blair Logo"
                  width={32}
                  height={32}
                  className="shrink-0"
                />
                <p className="text-xl font-semibold tracking-tight text-primary whitespace-nowrap">
                  Blair MRI
                </p>
              </Link>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleSidebar}
                className="h-9 w-9 shrink-0"
                data-sidebar="trigger"
              >
                {collapsed ? <Menu /> : <ChevronLeft />}
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Organization indicator */}
      {organizations.length > 0 && (
        <div className={collapsed ? "flex justify-center pt-2 pb-0" : "px-3.5 pt-2 pb-0"}>
          {organizations.length === 1 ? (
            <div
              className={`flex items-center rounded-md border bg-muted/40 py-1.5 ${
                collapsed ? "justify-center px-1.5" : "gap-2 px-2.5"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {!collapsed && (
                <span className="text-xs font-medium truncate">
                  {selectedOrg?.name ?? organizations[0].name}
                </span>
              )}
            </div>
          ) : (
            <div className={collapsed ? "flex justify-center" : ""}>
              {collapsed ? (
                <div className="rounded-md border bg-muted/40 p-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedOrg?.id ?? ""}
                  onValueChange={setSelectedOrgId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Select organization" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id} className="text-xs">
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      )}

      <SidebarContent className="px-2 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {group.title}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.title === "Inbox" && inboxCount > 0 && (
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                            {inboxCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Worklist + Referral Summary - only in Main group */}
              {group.title === "Main" && (
                <>
                  <Collapsible defaultOpen={true} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={pathname.startsWith("/mri-pipeline")}
                          tooltip="MRI Pipeline"
                        >
                          <ListTodo className="h-4 w-4" />
                          <span className="flex-1">MRI Pipeline</span>
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {sidebarPipelineItems.map((item) => {
                            const currentStage = searchParams.get("stage");
                            const itemStage = new URL(item.href, "http://x").searchParams.get("stage");
                            const isActive = pathname === "/mri-pipeline" && currentStage === itemStage;
                            return (
                              <SidebarMenuSubItem key={item.href}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link href={item.href}>
                                    <span className="flex items-center gap-2">
                                      <StageNumber n={item.number} />
                                      {item.title}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  <Collapsible defaultOpen={true} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={pathname.startsWith("/referrals")}
                          tooltip="Referral Summary"
                        >
                          <ClipboardList className="h-4 w-4" />
                          <span className="flex-1">Referral Summary</span>
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums mr-1 group-data-[state=open]/collapsible:hidden">
                            {referralCounts.all}
                          </span>
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {sidebarReferralSummaryItems.map((item) => {
                            const isActive = item.href === "/referrals"
                              ? pathname === "/referrals"
                              : pathname === item.href || pathname.startsWith(item.href + "/");
                            const Icon = item.icon;
                            const count = item.title === "Referral Comms" ? referralCounts.comms
                              : referralCounts.all;
                            return (
                              <SidebarMenuSubItem key={item.href}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link href={item.href} className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                      <Icon className="h-3 w-3" />
                                      {item.title}
                                    </span>
                                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                                      {count}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </>
              )}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {/* Integration Feeds */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Integration Feeds
          </SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible defaultOpen={true} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/integrations")}
                    tooltip="Integration Feeds"
                  >
                    <Rss className="h-4 w-4" />
                    <span className="flex-1">Feeds</span>
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums mr-1 group-data-[state=open]/collapsible:hidden">
                      {Object.values(feedCounts).reduce((a, b) => a + b, 0) || ""}
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {sidebarIntegrationItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      const Icon = item.icon;
                      const count = feedCounts[item.title] ?? 0;
                      return (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={isActive}>
                            <Link href={item.href} className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Icon className="h-3 w-3" />
                                {item.title}
                              </span>
                              {count > 0 && (
                                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                                  {count}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Configuration
          </SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible defaultOpen={false} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/settings")}
                    tooltip="Settings"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="flex-1">Settings</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {settingsItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={isActive}>
                            <Link href={item.href}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3.5">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {authUser?.initials ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
            <div className="flex flex-col">
              <span className="text-xs font-medium">
                {authUser?.name ?? "Loading..."}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {authUser?.email ?? ""}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
