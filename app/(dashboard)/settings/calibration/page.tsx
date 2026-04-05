"use client"

import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
  Cell,
} from "recharts"
import {
  fetchCalibrationReport,
  CalibrationReport,
} from "@/app/actions/fax"
import { Loader2, AlertCircle, Calculator, SlidersHorizontal } from "lucide-react"

export default function CalibrationPage() {
  const [report, setReport] = useState<CalibrationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Score calculator state
  const [calcLogprob, setCalcLogprob] = useState(0.9)
  const [calcOcr, setCalcOcr] = useState(0.85)

  // Weight simulator state
  const [simWeight, setSimWeight] = useState(0.7)

  useEffect(() => {
    fetchCalibrationReport().then((result) => {
      if (result.success) {
        setReport(result.data)
        if (result.data) {
          setSimWeight(result.data.current_w_logprob)
        }
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
  }, [])

  const calculatedScore = useMemo(() => {
    const w = report?.current_w_logprob ?? 0.7
    return Math.pow(calcLogprob, w) * Math.pow(calcOcr, 1 - w) * 100
  }, [calcLogprob, calcOcr, report?.current_w_logprob])

  // Find the simulated distribution for the selected weight
  const currentSimulation = useMemo(() => {
    if (!report?.weight_simulations) return null
    return report.weight_simulations.find(
      (s) => Math.abs(s.w_logprob - simWeight) < 0.001
    )
  }, [report?.weight_simulations, simWeight])

  // Current weight distribution for comparison
  const currentDistribution = useMemo(() => {
    if (!report?.weight_simulations) return null
    return report.weight_simulations.find(
      (s) => Math.abs(s.w_logprob - (report?.current_w_logprob ?? 0.7)) < 0.001
    )
  }, [report?.weight_simulations, report?.current_w_logprob])

  // Count faxes above 90% threshold for current vs simulated
  const thresholdCounts = useMemo(() => {
    const countAbove = (dist: { bucket: number; count: number }[] | undefined) => {
      if (!dist) return 0
      return dist.filter((d) => d.bucket >= 90).reduce((sum, d) => sum + d.count, 0)
    }
    return {
      current: countAbove(currentDistribution?.score_distribution),
      simulated: countAbove(currentSimulation?.score_distribution),
      total: currentDistribution?.score_distribution.reduce((sum, d) => sum + d.count, 0) ?? 0,
    }
  }, [currentDistribution, currentSimulation])

  if (loading) {
    return (
      <div className="space-y-2">
        <PageHeader title="Calibration" description="Confidence score calibration and analysis" />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading calibration data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <PageHeader title="Calibration" description="Confidence score calibration and analysis" />
        <div className="flex items-center justify-center py-20 text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-2">
        <PageHeader title="Calibration" description="Confidence score calibration and analysis" />
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mb-2" />
          <p className="text-sm">No calibration report found.</p>
          <p className="text-xs mt-1">
            Run <code className="font-mono bg-muted px-1 py-0.5 rounded">python -m app.scripts.generate_calibration_report</code> to generate one.
          </p>
        </div>
      </div>
    )
  }

  const chartData = report.buckets.map((b) => ({
    bucket: `${b.bucket}–${b.bucket + 9}%`,
    bucketNum: b.bucket,
    "Category Accuracy": b.category_accuracy_pct,
    "Patient Accuracy": b.patient_accuracy_pct,
    total: b.total,
    // Perfect calibration reference: midpoint of bucket
    perfect: b.bucket + 5,
  }))

  const simChartData = currentSimulation?.score_distribution.map((d) => {
    const currentCount =
      currentDistribution?.score_distribution.find((c) => c.bucket === d.bucket)?.count ?? 0
    return {
      bucket: `${d.bucket}–${d.bucket + 9}%`,
      simulated: d.count,
      current: currentCount,
    }
  }) ?? []

  return (
    <div className="space-y-2">
      <PageHeader title="Calibration" description="Confidence score calibration and analysis" />

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-px bg-border border border-border">
        <div className="bg-background p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Reviewed</p>
          <p className="text-2xl font-bold tabular-nums">{report.total_reviewed}</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Category Accuracy</p>
          <p className="text-2xl font-bold tabular-nums">{report.overall_category_accuracy}%</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Patient Accuracy</p>
          <p className="text-2xl font-bold tabular-nums">{report.overall_patient_accuracy}%</p>
        </div>
        <div className="bg-background p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Weights (L / O)</p>
          <p className="text-2xl font-bold tabular-nums">
            {report.current_w_logprob} / {report.current_w_ocr}
          </p>
        </div>
      </div>

      {/* Calibration Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Accuracy by Confidence Bucket
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Bars show actual accuracy within each confidence range. If bars exceed the dashed perfect-calibration line, scores are conservative.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number) => `${value}%`}
                labelFormatter={(label) => `Confidence ${label}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                y={0}
                stroke="transparent"
                label=""
              />
              {/* Perfect calibration diagonal — approximate as per-bucket reference lines */}
              {chartData.map((d) => (
                <ReferenceLine
                  key={d.bucketNum}
                  y={d.perfect}
                  stroke="transparent"
                />
              ))}
              <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Auto-file threshold", fontSize: 10, fill: "#94a3b8" }} />
              <Bar dataKey="Category Accuracy" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Patient Accuracy" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Bucket table */}
          <div className="mt-4 border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-1.5 font-medium">Bucket</th>
                  <th className="text-right px-3 py-1.5 font-medium">Total</th>
                  <th className="text-right px-3 py-1.5 font-medium">Cat. Correct</th>
                  <th className="text-right px-3 py-1.5 font-medium">Cat. Accuracy</th>
                  <th className="text-right px-3 py-1.5 font-medium">Pat. Correct</th>
                  <th className="text-right px-3 py-1.5 font-medium">Pat. Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {report.buckets.map((b) => (
                  <tr key={b.bucket} className="border-t">
                    <td className="px-3 py-1.5 font-mono">{b.bucket}–{b.bucket + 9}%</td>
                    <td className="text-right px-3 py-1.5 tabular-nums">{b.total}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums">{b.category_correct}/{b.total}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums font-medium">{b.category_accuracy_pct}%</td>
                    <td className="text-right px-3 py-1.5 tabular-nums">{b.patient_correct}/{b.total}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums font-medium">{b.patient_accuracy_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2">
            Report generated {new Date(report.created_at).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Bottom row: Calculator + Simulator */}
      <div className="grid grid-cols-2 gap-4">
        {/* Score Calculator */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Score Calculator
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Input logprob + OCR to see the combined score
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Logprob Confidence</span>
                <span className="text-sm font-bold tabular-nums">{calcLogprob.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(calcLogprob * 100)}
                onChange={(e) => setCalcLogprob(Number(e.target.value) / 100)}
                className="w-full h-1 bg-muted appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">OCR Confidence</span>
                <span className="text-sm font-bold tabular-nums">{calcOcr.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(calcOcr * 100)}
                onChange={(e) => setCalcOcr(Number(e.target.value) / 100)}
                className="w-full h-1 bg-muted appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Combined Score (w<sub>L</sub>={report.current_w_logprob}, w<sub>O</sub>={report.current_w_ocr})
                </span>
              </div>
              <p className={`text-3xl font-bold tabular-nums mt-1 ${calculatedScore >= 90 ? "text-emerald-600" : calculatedScore >= 70 ? "text-amber-600" : "text-destructive"}`}>
                {calculatedScore.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {calcLogprob.toFixed(2)}^{report.current_w_logprob} x {calcOcr.toFixed(2)}^{report.current_w_ocr} x 100
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weight Simulator */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Weight Simulator
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              See how changing weights affects the score distribution
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!report.weight_simulations ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p className="text-xs">No simulation data available.</p>
                <p className="text-[10px] mt-1">Raw confidence components needed in metadata.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      W<sub>logprob</sub> = {simWeight.toFixed(2)} / W<sub>ocr</sub> = {(1 - simWeight).toFixed(2)}
                    </span>
                    {Math.abs(simWeight - report.current_w_logprob) > 0.001 && (
                      <span className="text-[10px] text-amber-600">modified</span>
                    )}
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={Math.round(simWeight * 100)}
                    onChange={(e) => setSimWeight(Number(e.target.value) / 100)}
                    className="w-full h-1 bg-muted appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>OCR-heavy</span>
                    <span>Logprob-heavy</span>
                  </div>
                </div>

                {/* Threshold comparison */}
                <div className="grid grid-cols-2 gap-px bg-border border border-border rounded">
                  <div className="bg-background p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Current &ge;90%</p>
                    <p className="text-lg font-bold tabular-nums">{thresholdCounts.current}</p>
                    <p className="text-[10px] text-muted-foreground">
                      of {thresholdCounts.total} faxes
                    </p>
                  </div>
                  <div className="bg-background p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Simulated &ge;90%</p>
                    <p className={`text-lg font-bold tabular-nums ${thresholdCounts.simulated > thresholdCounts.current ? "text-emerald-600" : thresholdCounts.simulated < thresholdCounts.current ? "text-destructive" : ""}`}>
                      {thresholdCounts.simulated}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {thresholdCounts.simulated - thresholdCounts.current >= 0 ? "+" : ""}
                      {thresholdCounts.simulated - thresholdCounts.current} vs current
                    </p>
                  </div>
                </div>

                {/* Distribution chart */}
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={simChartData} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="current" fill="#94a3b8" radius={[2, 2, 0, 0]} name="Current" />
                    <Bar dataKey="simulated" fill="#6366f1" radius={[2, 2, 0, 0]} name="Simulated">
                      {simChartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.bucket.startsWith("9") ? "#10b981" : "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
