import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  ArrowLeft,
  Download,
  Share2,
  Printer,
  FileText,
  AlertTriangle,
  Loader2,
  X,
  Minus,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface ItemResponse {
  response: "ok" | "nc" | "na" | null;
  observation: string;
  photos: string[];
  actionPlan?: {
    responsible: string;
    deadline: string;
    priority: string;
  };
}

interface NRChecklist {
  id: number;
  nrNumber: string;
  nrName: string;
  category: string;
  items: { id: string; text: string; required?: boolean }[];
}

interface ChecklistData {
  selectedNRIds: number[];
  responses: Record<string, ItemResponse>;
}

export default function InspectionViewPage() {
  const [, params] = useRoute("/inspection/:id/view");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const inspectionId = params?.id ? parseInt(params.id) : 0;

  const { data: inspection, isLoading } = useQuery({
    queryKey: ["/api/inspections", inspectionId],
    enabled: !!inspectionId,
  });

  const { data: nrChecklists = [] } = useQuery<NRChecklist[]>({
    queryKey: ["/api/nr-checklists"],
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/inspections/${inspectionId}`, {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({ title: "Sucesso", description: "Inspeção deletada com sucesso" });
      setLocation("/dashboard");
    },
  });

  const inspData = inspection as any;
  const rawChecklist = inspData?.checklistData as ChecklistData | undefined;
  const responses: Record<string, ItemResponse> = rawChecklist?.responses || {};
  const selectedNRIds: number[] = rawChecklist?.selectedNRIds || [];

  const selectedNRs = nrChecklists.filter((nr) => selectedNRIds.includes(nr.id));

  // Todas as NCs com dados completos
  const nonConformities: { nrNumber: string; nrName: string; item: { id: string; text: string }; data: ItemResponse }[] = [];
  selectedNRs.forEach((nr) => {
    nr.items.forEach((item) => {
      const r = responses[item.id];
      if (r?.response === "nc") {
        nonConformities.push({ nrNumber: nr.nrNumber, nrName: nr.nrName, item, data: r });
      }
    });
  });

  // Stats
  let okCount = 0, ncCount = 0, naCount = 0;
  Object.values(responses).forEach((r) => {
    if (r.response === "ok") okCount++;
    else if (r.response === "nc") ncCount++;
    else if (r.response === "na") naCount++;
  });
  const totalAnswered = okCount + ncCount + naCount;
  const conformityScore = totalAnswered > 0 ? Math.round((okCount / (okCount + ncCount)) * 100) || 0 : 0;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatDateShort = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR");

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "alta": return { text: "ALTA", color: "#dc2626" };
      case "media": return { text: "MÉDIA", color: "#ea580c" };
      case "baixa": return { text: "BAIXA", color: "#16a34a" };
      default: return { text: "-", color: "#6b7280" };
    }
  };

  const responseLabel = (r: string | null) => {
    if (r === "ok") return "Conforme";
    if (r === "nc") return "Não Conforme";
    if (r === "na") return "Não se Aplica";
    return "Não Respondido";
  };

  // ── Excel Export ──
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: Resumo
    const resumo = [
      ["RELATÓRIO DE INSPEÇÃO SST CHECK PRO"],
      [],
      ["Obra / Local", inspData?.title || "-"],
      ["Endereço", inspData?.location || "-"],
      ["Inspetor", inspData?.inspectorName || "-"],
      ["Data da Inspeção", formatDate(inspData?.completedAt || inspData?.createdAt)],
      ["NRs Inspecionadas", selectedNRs.map((n) => n.nrNumber).join(", ")],
      [],
      ["RESULTADO GERAL"],
      ["Total de Itens Respondidos", totalAnswered],
      ["Conformes", okCount],
      ["Não Conformes", ncCount],
      ["Não se Aplica", naCount],
      ["Score de Conformidade", `${conformityScore}%`],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    wsResumo["!cols"] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // Aba 2: Checklist Completo
    const checklistRows: any[][] = [
      ["NR", "Item", "Descrição", "Resposta", "Observação"],
    ];
    selectedNRs.forEach((nr) => {
      nr.items.forEach((item, idx) => {
        const r = responses[item.id];
        checklistRows.push([
          nr.nrNumber,
          idx + 1,
          item.text,
          responseLabel(r?.response || null),
          r?.observation || "",
        ]);
      });
    });
    const wsChecklist = XLSX.utils.aoa_to_sheet(checklistRows);
    wsChecklist["!cols"] = [{ wch: 10 }, { wch: 6 }, { wch: 70 }, { wch: 18 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsChecklist, "Checklist Completo");

    // Aba 3: Não Conformidades
    const ncRows: any[][] = [
      ["NR", "Item", "Descrição", "Observação", "Responsável", "Prazo", "Prioridade"],
    ];
    nonConformities.forEach(({ nrNumber, item, data }) => {
      ncRows.push([
        nrNumber,
        item.text,
        item.text,
        data.observation || "",
        data.actionPlan?.responsible || "",
        data.actionPlan?.deadline ? formatDateShort(data.actionPlan.deadline) : "",
        data.actionPlan?.priority ? getPriorityLabel(data.actionPlan.priority).text : "",
      ]);
    });
    const wsNC = XLSX.utils.aoa_to_sheet(ncRows);
    wsNC["!cols"] = [{ wch: 10 }, { wch: 70 }, { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsNC, "Não Conformidades");

    const fileName = `inspecao-sst-${inspectionId.toString().padStart(4, "0")}-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: "Excel exportado!", description: fileName });
  };

  // ── PDF ──
  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPDF(true);
    toast({ title: "Gerando PDF...", description: "Aguarde enquanto preparamos seu documento" });
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      let heightLeft = imgHeight;
      let position = 0;
      let pageNum = 0;
      while (heightLeft > 0) {
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        position -= pdfHeight;
        pageNum++;
      }
      const fileName = `inspecao-sst-${inspectionId.toString().padStart(4, "0")}-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
      toast({ title: "PDF gerado!", description: fileName });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", description: "Tente a opção Imprimir", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    const text = `Relatório SST — ${inspData?.title || "Inspeção"}\nData: ${formatDate(inspData?.completedAt || inspData?.createdAt)}\nScore: ${conformityScore}%\nConformes: ${okCount} | NCs: ${ncCount}`;
    if (navigator.share && navigator.canShare({ title: "SST", text, url: window.location.href })) {
      try { await navigator.share({ title: "SST Check Pro", text, url: window.location.href }); } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(text + "\n" + window.location.href);
        toast({ title: "Link copiado!" });
      } catch { }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <header className="bg-[#1a1d23] text-white p-4 text-center sticky top-0 z-50 print:hidden">
          <Skeleton className="h-6 w-48 mx-auto bg-[#4A4E57]" />
        </header>
        <div className="max-w-[800px] mx-auto p-4">
          <Skeleton className="h-96 w-full bg-white rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5e5e5]">
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Deletar Inspeção?</h2>
            <p className="text-gray-600 mb-6">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={() => deleteInspectionMutation.mutate()} disabled={deleteInspectionMutation.isPending} className="flex-1 bg-red-500 text-white hover:bg-red-600">
                {deleteInspectionMutation.isPending ? "Deletando..." : "Deletar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1a1d23] text-white p-4 sticky top-0 z-50 print:hidden">
        <div className="max-w-[800px] mx-auto flex items-center justify-between gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-[#FFD100] font-bold text-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            SST Check Pro
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setShowDeleteModal(true)} className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="max-w-[800px] mx-auto px-4 py-4 print:hidden">
        <div className="grid grid-cols-4 gap-2">
          <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="bg-blue-600 text-white hover:bg-blue-700" data-testid="button-download">
            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="ml-1 hidden sm:inline">{isGeneratingPDF ? "..." : "PDF"}</span>
          </Button>
          <Button onClick={handleExportExcel} className="bg-green-700 text-white hover:bg-green-800" data-testid="button-excel">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline">Excel</span>
          </Button>
          <Button onClick={handleShare} className="bg-gray-600 text-white hover:bg-gray-700" data-testid="button-share">
            <Share2 className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline">Compartilhar</span>
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="border-gray-400" data-testid="button-print">
            <Printer className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </div>

      {/* PDF Content — A4 */}
      <div className="flex justify-center px-2 print:px-0">
        <div ref={pdfRef} className="bg-white shadow-lg print:shadow-none" style={{ width: "794px", minHeight: "1123px", fontFamily: "Arial, Helvetica, sans-serif" }}>

          {/* Cabeçalho */}
          <div style={{ backgroundColor: "#1a1d23", padding: "24px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", backgroundColor: "#FFD100", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check style={{ width: "28px", height: "28px", color: "#1a1d23", strokeWidth: 3 }} />
                </div>
                <div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "white" }}>SST<span style={{ color: "#FFD100" }}>Check</span>Pro</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>Relatório de Inspeção de Segurança do Trabalho</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>Inspeção N.</div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#FFD100" }}>#{inspectionId.toString().padStart(4, "0")}</div>
              </div>
            </div>
          </div>

          {/* NRs inspecionadas */}
          <div style={{ backgroundColor: "#FFD100", padding: "10px 32px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#1a1d23", textTransform: "uppercase", letterSpacing: "1px", marginRight: "8px" }}>NRs Inspecionadas:</span>
            {selectedNRs.map((nr) => (
              <span key={nr.id} style={{ backgroundColor: "#1a1d23", color: "#FFD100", padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>{nr.nrNumber}</span>
            ))}
            {selectedNRs.length === 0 && <span style={{ fontSize: "11px", color: "#1a1d23" }}>—</span>}
          </div>

          {/* Dados da inspeção */}
          <div style={{ padding: "24px 32px", borderBottom: "2px solid #e5e5e5" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>Obra / Local</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{inspData?.title || "Não informado"}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>Data da Inspeção</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{formatDate(inspData?.completedAt || inspData?.createdAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>Inspetor Responsável</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{inspData?.inspectorName || "Não informado"}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>Localização</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{inspData?.location || "Não informado"}</div>
              </div>
            </div>
            {inspData?.observations && (
              <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", borderLeft: "3px solid #FFD100" }}>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>Observações Gerais</div>
                <div style={{ fontSize: "13px", color: "#374151" }}>{inspData.observations}</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ padding: "20px 32px", backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e5e5" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              {[
                { value: totalAnswered, label: "Total Itens", bg: "white", border: "#e5e7eb", color: "#111", subColor: "#6b7280" },
                { value: okCount, label: "Conforme", bg: "#dcfce7", border: "#bbf7d0", color: "#16a34a", subColor: "#15803d" },
                { value: ncCount, label: "Não Conforme", bg: "#fef2f2", border: "#fecaca", color: "#dc2626", subColor: "#b91c1c" },
                { value: `${conformityScore}%`, label: "Score", bg: "#1a1d23", border: "#1a1d23", color: "#FFD100", subColor: "rgba(255,255,255,0.8)" },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: s.bg, padding: "16px", borderRadius: "8px", textAlign: "center", border: `1px solid ${s.border}` }}>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "11px", color: s.subColor, textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Não Conformidades */}
          {nonConformities.length > 0 && (
            <div style={{ padding: "24px 32px", borderBottom: "2px solid #e5e5e5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", padding: "12px 16px", backgroundColor: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                <AlertTriangle style={{ width: "20px", height: "20px", color: "#dc2626" }} />
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#dc2626" }}>NÃO CONFORMIDADES IDENTIFICADAS ({ncCount})</span>
              </div>
              {nonConformities.map(({ nrNumber, nrName, item, data }, idx) => (
                <div key={item.id} style={{ marginBottom: "12px", padding: "16px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderLeft: "4px solid #dc2626", borderRadius: "4px" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "24px", height: "24px", backgroundColor: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}>{idx + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#111", marginBottom: "2px" }}>{item.text}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>{nrNumber} — {nrName}</div>
                      {data.observation && (
                        <div style={{ fontSize: "12px", color: "#374151", fontStyle: "italic", padding: "8px 12px", backgroundColor: "#f9fafb", borderRadius: "4px", marginBottom: "8px" }}>"{data.observation}"</div>
                      )}
                      {data.actionPlan && (data.actionPlan.responsible || data.actionPlan.deadline) && (
                        <div style={{ padding: "12px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "4px" }}>
                          <div style={{ fontSize: "10px", fontWeight: "bold", color: "#92400e", marginBottom: "8px" }}>PLANO DE AÇÃO</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div>
                              <div style={{ fontSize: "10px", color: "#6b7280" }}>Responsável</div>
                              <div style={{ fontSize: "12px", fontWeight: "500" }}>{data.actionPlan.responsible || "-"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "10px", color: "#6b7280" }}>Prazo</div>
                              <div style={{ fontSize: "12px", fontWeight: "500" }}>{data.actionPlan.deadline ? formatDateShort(data.actionPlan.deadline) : "-"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "10px", color: "#6b7280" }}>Prioridade</div>
                              <div style={{ fontSize: "12px", fontWeight: "bold", color: getPriorityLabel(data.actionPlan.priority).color }}>{getPriorityLabel(data.actionPlan.priority).text}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Checklist Completo por NR */}
          <div style={{ padding: "24px 32px" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#111", marginBottom: "16px" }}>CHECKLIST COMPLETO</div>
            {selectedNRs.map((nr) => (
              <div key={nr.id} style={{ marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#1a1d23", color: "white", padding: "10px 16px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "4px", height: "16px", backgroundColor: "#FFD100", borderRadius: "2px" }} />
                  {nr.nrNumber} — {nr.nrName}
                </div>
                <div style={{ border: "1px solid #e5e7eb", borderTop: "none" }}>
                  {nr.items.map((item, itemIndex) => {
                    const itemResponse = responses[item.id];
                    const status = itemResponse?.response;
                    return (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 16px", borderBottom: itemIndex < nr.items.length - 1 ? "1px solid #f3f4f6" : "none", backgroundColor: itemIndex % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: status === "ok" ? "#16a34a" : status === "nc" ? "#dc2626" : status === "na" ? "#9ca3af" : "#e5e7eb", flexShrink: 0 }}>
                          {status === "ok" && <Check style={{ width: "13px", height: "13px", color: "white", strokeWidth: 3 }} />}
                          {status === "nc" && <X style={{ width: "13px", height: "13px", color: "white", strokeWidth: 3 }} />}
                          {status === "na" && <Minus style={{ width: "13px", height: "13px", color: "white", strokeWidth: 3 }} />}
                          {!status && <span style={{ color: "#9ca3af", fontSize: "9px" }}>?</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "11px", color: "#374151" }}>{itemIndex + 1}. {item.text}</div>
                          {itemResponse?.observation && <div style={{ fontSize: "10px", color: "#6b7280", fontStyle: "italic", marginTop: "2px" }}>{itemResponse.observation}</div>}
                        </div>
                        <div style={{ fontSize: "10px", fontWeight: "600", color: status === "ok" ? "#16a34a" : status === "nc" ? "#dc2626" : status === "na" ? "#6b7280" : "#9ca3af", width: "36px", textAlign: "right" }}>
                          {status === "ok" ? "CONF" : status === "nc" ? "NC" : status === "na" ? "N/A" : "-"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé */}
          <div style={{ padding: "32px", borderTop: "2px solid #e5e5e5" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ width: "200px", borderBottom: "1px solid #374151", margin: "0 auto 8px" }} />
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{inspData?.inspectorName || "Responsável"}</div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Técnico de Segurança do Trabalho</div>
            </div>
            <div style={{ textAlign: "center", fontSize: "10px", color: "#9ca3af" }}>
              Relatório gerado em {formatDate(new Date().toISOString())} · <strong>SST Check Pro</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Botão voltar */}
      <div className="max-w-[800px] mx-auto px-4 py-6 print:hidden">
        <Link href="/dashboard">
          <Button className="w-full bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold py-4">
            <FileText className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </div>
  );
}
