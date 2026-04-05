"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  fetchPatients,
  triggerPatientRefresh,
  type PatientRow,
} from "@/app/actions/fax";
import { formatPatientName } from "@/lib/supabase/mappers";
import { tokenizedMatch } from "@/lib/search";

export default function PatientsFeedPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadPatients = useCallback(async () => {
    const result = await fetchPatients();
    if (result.success) {
      setPatients(result.data);
    } else {
      toast.error(`Failed to load patients: ${result.error}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await triggerPatientRefresh();
    if (result.success) {
      toast.success("Patient sync triggered — new patients will appear shortly");
      // Re-fetch after a brief delay to pick up any fast results
      setTimeout(() => {
        loadPatients();
        setRefreshing(false);
      }, 3000);
    } else {
      toast.error(`Refresh failed: ${result.error}`);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    return patients.filter((p) =>
      tokenizedMatch(
        `${formatPatientName(p.name)} ${p.name} ${p.health_card_number ?? ""} ${p.date_of_birth ?? ""}`,
        searchQuery
      )
    );
  }, [patients, searchQuery]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="space-y-2">
      <PageHeader
        title="Patients"
        description="Synced patient records from Avaros EMR"
        action={
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-[10px] bg-emerald-50 text-emerald-700"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {patients.length} synced
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh Demographics
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={searchQuery}
          onChange={(v) => {
            setSearchQuery(v);
            setCurrentPage(1);
          }}
          placeholder="Search by name, health card, or DOB..."
          aria-label="Search patients"
        />
        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-sm border bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          Synced from Avaros EMR
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Refresh Demographics
        </Button>
      </div>

      <div className="border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Patient
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Health Card
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3">
                Date of Birth
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin opacity-40" />
                    <p className="text-sm">Loading patients...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">
                      {patients.length === 0
                        ? "No patients synced yet"
                        : "No patients found"}
                    </p>
                    <p className="text-xs">
                      {patients.length === 0 ? (
                        <>
                          Click{" "}
                          <button
                            className="underline hover:text-foreground"
                            onClick={handleRefresh}
                          >
                            Refresh Demographics
                          </button>{" "}
                          to sync patients from Avaros
                        </>
                      ) : (
                        "Try adjusting your search"
                      )}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPatients.map((patient) => (
                <TableRow key={patient.id} className="group">
                  <TableCell className="py-2 px-3">
                    <span className="text-sm font-medium">
                      {formatPatientName(patient.name)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {patient.health_card_number || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <span className="text-xs text-muted-foreground">
                      {patient.date_of_birth || "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        totalItems={filtered.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
