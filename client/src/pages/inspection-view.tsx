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
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

const SAMPLE_SECTIONS = [
  {
    name: "EPIs - Equipamentos de Proteção Individual",
    items: [
      "Todos os trabalhadores estão utilizando capacete de segurança?",
      "Os trabalhadores estão utilizando calçados de segurança (botinas)?",
      "Óculos de proteção estão sendo utilizados nas atividades que exigem?",
      "Protetores auriculares estão disponíveis e em uso em áreas ruidosas?",
      "Luvas de proteção adequadas estão sendo utilizadas?",
      "Os EPIs estão em bom estado de conservação?",
      "Existe controle de entrega de EPIs com fichas assinadas?",
    ],
  },
  {
    name: "Proteção Contra Quedas",
    items: [
      "Guarda-corpos estão instalados em todas as periferias e aberturas?",
      "Os guarda-corpos possuem altura mínima de 1,20m?",
      "Aberturas no piso estão protegidas com tampas ou guarda-corpo?",
      "Redes de proteção estão instaladas e em bom estado?",
      "Trabalhadores em altura utilizam cinto tipo paraquedista?",
      "Existem pontos de ancoragem adequados?",
      "Linha de vida instalada onde necessário?",
    ],
  },
  {
    name: "Escadas, Rampas e Acessos",
    items: [
      "Escadas de mão estão em bom estado com sapatas antiderrapantes?",
      "Escadas fixas possuem corrimão em ambos os lados?",
      "Rampas possuem piso antiderrapante?",
      "Passarelas têm largura mínima e guarda-corpo?",
      "Acessos estão desobstruídos e sinalizados?",
    ],
  },
  {
    name: "Instalações Elétricas",
    items: [
      "Quadros elétricos estão fechados, identificados e aterrados?",
      "Disjuntores DR estão instalados e funcionando?",
      "Fios e cabos estão organizados, sem emendas expostas?",
      "Máquinas e equipamentos elétricos estão aterrados?",
      "Não há gambiarras ou ligações improvisadas?",
    ],
  },
  {
    name: "Ordem, Limpeza e Sinalização",
    items: [
      "O canteiro está limpo e organizado?",
      "Materiais estão armazenados de forma segura?",
      "Vias de circulação estão desobstruídas?",
      "Sinalização de segurança está adequada e visível?",
      "Áreas de risco estão isoladas e sinalizadas?",
      "Entulho está sendo removido regularmente?",
      "Extintores estão sinalizados, acessíveis e dentro da validade?",
    ],
  },
];

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

  const responses: Record<number, ItemResponse> = (inspection as any)?.checklistData || {};

  let okCount = 0, ncCount = 0, naCount = 0;
  Object.values(responses).forEach((r) => {
    if (r.response === "ok") okCount++;
    else if (r.response === "nc") ncCount++;
    else if (r.response === "na") naCount++;
  });
  const totalAnswered = okCount + ncCount + naCount;
  const conformityScore = totalAnswered > 0 
    ? Math.round((okCount / (okCount + ncCount)) * 100) || 0
    : 0;

  const nonConformities: { index: number; sectionName: string; itemText: string; data: ItemResponse }[] = [];
  let globalIndex = 0;
  SAMPLE_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const response = responses[globalIndex];
      if (response?.response === "nc") {
        nonConformities.push({
          index: globalIndex,
          sectionName: section.name,
          itemText: item,
          data: response,
        });
      }
      globalIndex++;
    });
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    
    setIsGeneratingPDF(true);
    toast({
      title: "Gerando PDF...",
      description: "Aguarde enquanto preparamos seu documento",
    });

    try {
      const element = pdfRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageNum = 0;
      
      while (heightLeft > 0) {
        if (pageNum > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        position -= pdfHeight;
        pageNum++;
      }

      const fileName = `inspecao-sst-${inspectionId.toString().padStart(4, "0")}-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: `Arquivo: ${fileName}`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Tente novamente ou use a opção Imprimir",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Inspeção SST - ${(inspection as any)?.title || "Relatório"}`,
      text: `Relatório de Inspeção de Segurança do Trabalho\n\nObra: ${(inspection as any)?.title || "N/A"}\nData: ${new Date((inspection as any)?.completedAt || (inspection as any)?.createdAt).toLocaleDateString("pt-BR")}\nScore: ${conformityScore}%\n\nConforme: ${okCount}\nNão Conforme: ${ncCount}\nN/A: ${naCount}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast({ title: "Compartilhado com sucesso!" });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast({ title: "Erro ao compartilhar", variant: "destructive" });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.text + "\n\n" + shareData.url);
        toast({ title: "Link copiado!", description: "Cole em qualquer app para compartilhar" });
      } catch {
        toast({ title: "Erro ao copiar", variant: "destructive" });
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "alta": return { text: "ALTA", color: "#dc2626" };
      case "media": return { text: "MÉDIA", color: "#ea580c" };
      case "baixa": return { text: "BAIXA", color: "#16a34a" };
      default: return { text: "-", color: "#6b7280" };
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

  const inspData = inspection as any;

  return (
    <div className="min-h-screen bg-[#e5e5e5]">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600" data-testid="button-close-modal">
                <X className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Deletar Inspeção?</h2>
            <p className="text-gray-600 mb-6">Essa ação não pode ser desfeita. Todos os dados da inspeção serão permanentemente removidos.</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)} className="flex-1" data-testid="button-cancel-modal">
                Cancelar
              </Button>
              <Button onClick={() => deleteInspectionMutation.mutate()} disabled={deleteInspectionMutation.isPending} className="flex-1 bg-red-500 text-white hover:bg-red-600" data-testid="button-confirm-modal">
                {deleteInspectionMutation.isPending ? "Deletando..." : "Deletar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Hidden in print */}
      <header className="bg-[#1a1d23] text-white p-4 sticky top-0 z-50 print:hidden">
        <div className="max-w-[800px] mx-auto flex items-center justify-between gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-[#FFD100] font-bold text-lg flex items-center gap-2 justify-center">
              <Check className="w-5 h-5" />
              SST Check Pro
            </h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowDeleteModal(true)} className="text-red-400 hover:text-red-300 hover:bg-red-500/20" data-testid="button-delete">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Action Buttons - Hidden in print */}
      <div className="max-w-[800px] mx-auto px-4 py-4 print:hidden">
        <div className="grid grid-cols-3 gap-2">
          <Button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-blue-600 text-white hover:bg-blue-700"
            data-testid="button-download"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isGeneratingPDF ? "Gerando..." : "PDF"}
          </Button>
          <Button 
            onClick={handleShare}
            className="bg-green-600 text-white hover:bg-green-700"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="border-gray-400"
            data-testid="button-print"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* PDF Content - Fixed A4 Width (794px = 210mm at 96dpi) */}
      <div className="flex justify-center px-2 print:px-0">
        <div 
          ref={pdfRef} 
          className="bg-white shadow-lg print:shadow-none"
          style={{ 
            width: "794px", 
            minHeight: "1123px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {/* PDF Header - Full Width */}
          <div style={{ backgroundColor: "#1a1d23", padding: "24px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ 
                  width: "48px", 
                  height: "48px", 
                  backgroundColor: "#FFD100", 
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Check style={{ width: "28px", height: "28px", color: "#1a1d23", strokeWidth: 3 }} />
                </div>
                <div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "white" }}>
                    SST<span style={{ color: "#FFD100" }}>Check</span>Pro
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                    Relatório de Inspeção de Segurança
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                  Inspeção N.
                </div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#FFD100" }}>
                  #{inspectionId.toString().padStart(4, "0")}
                </div>
              </div>
            </div>
          </div>

          {/* Yellow Stripe */}
          <div style={{ 
            backgroundColor: "#FFD100", 
            padding: "12px 32px",
            textAlign: "center"
          }}>
            <div style={{ 
              fontSize: "14px", 
              fontWeight: "bold", 
              color: "#1a1d23",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              NR 18 - Inspeção de Canteiro de Obras
            </div>
          </div>

          {/* Info Section */}
          <div style={{ padding: "24px 32px", borderBottom: "2px solid #e5e5e5" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>
                  Obra / Local
                </div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
                  {inspData?.title || "Não informado"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>
                  Data da Inspeção
                </div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
                  {formatDate(inspData?.completedAt || inspData?.createdAt)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>
                  Inspetor Responsável
                </div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
                  {inspData?.inspectorName || "Não informado"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>
                  Endereço / Localização
                </div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
                  {inspData?.location || "Não informado"}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div style={{ padding: "20px 32px", backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e5e5" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              <div style={{ 
                backgroundColor: "white", 
                padding: "16px", 
                borderRadius: "8px",
                textAlign: "center",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111" }}>{totalAnswered}</div>
                <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase" }}>Total Itens</div>
              </div>
              <div style={{ 
                backgroundColor: "#dcfce7", 
                padding: "16px", 
                borderRadius: "8px",
                textAlign: "center",
                border: "1px solid #bbf7d0"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#16a34a" }}>{okCount}</div>
                <div style={{ fontSize: "11px", color: "#15803d", textTransform: "uppercase" }}>Conforme</div>
              </div>
              <div style={{ 
                backgroundColor: "#fef2f2", 
                padding: "16px", 
                borderRadius: "8px",
                textAlign: "center",
                border: "1px solid #fecaca"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#dc2626" }}>{ncCount}</div>
                <div style={{ fontSize: "11px", color: "#b91c1c", textTransform: "uppercase" }}>Não Conforme</div>
              </div>
              <div style={{ 
                backgroundColor: "#1a1d23", 
                padding: "16px", 
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#FFD100" }}>{conformityScore}%</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>Score</div>
              </div>
            </div>
          </div>

          {/* Non-Conformities Section */}
          {nonConformities.length > 0 && (
            <div style={{ padding: "24px 32px", borderBottom: "2px solid #e5e5e5" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                marginBottom: "16px",
                padding: "12px 16px",
                backgroundColor: "#fef2f2",
                borderRadius: "8px",
                border: "1px solid #fecaca"
              }}>
                <AlertTriangle style={{ width: "20px", height: "20px", color: "#dc2626" }} />
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#dc2626" }}>
                  NÃO CONFORMIDADES IDENTIFICADAS ({ncCount})
                </span>
              </div>
              
              {nonConformities.map((nc, idx) => (
                <div 
                  key={nc.index} 
                  style={{ 
                    marginBottom: "12px",
                    padding: "16px",
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderLeft: "4px solid #dc2626",
                    borderRadius: "4px"
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ 
                      width: "24px", 
                      height: "24px", 
                      backgroundColor: "#dc2626", 
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <span style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}>{idx + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#111", marginBottom: "4px" }}>
                        {nc.itemText}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>
                        {nc.sectionName}
                      </div>
                      
                      {nc.data.observation && (
                        <div style={{ 
                          fontSize: "12px", 
                          color: "#374151", 
                          fontStyle: "italic",
                          padding: "8px 12px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "4px",
                          marginBottom: "8px"
                        }}>
                          "{nc.data.observation}"
                        </div>
                      )}
                      
                      {nc.data.actionPlan && (nc.data.actionPlan.responsible || nc.data.actionPlan.deadline) && (
                        <div style={{ 
                          padding: "12px",
                          backgroundColor: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "4px",
                          marginBottom: "8px"
                        }}>
                          <div style={{ fontSize: "10px", fontWeight: "bold", color: "#92400e", marginBottom: "8px" }}>
                            PLANO DE AÇÃO
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div>
                              <div style={{ fontSize: "10px", color: "#6b7280" }}>Responsável</div>
                              <div style={{ fontSize: "12px", fontWeight: "500" }}>{nc.data.actionPlan.responsible || "-"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "10px", color: "#6b7280" }}>Prazo</div>
                              <div style={{ fontSize: "12px", fontWeight: "500" }}>
                                {nc.data.actionPlan.deadline ? formatDateShort(nc.data.actionPlan.deadline) : "-"}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "10px", color: "#6b7280" }}>Prioridade</div>
                              <div style={{ 
                                fontSize: "12px", 
                                fontWeight: "bold",
                                color: getPriorityLabel(nc.data.actionPlan.priority).color
                              }}>
                                {getPriorityLabel(nc.data.actionPlan.priority).text}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {nc.data.photos && nc.data.photos.length > 0 && (
                        <div style={{ marginTop: "12px" }}>
                          <div style={{ fontSize: "10px", fontWeight: "bold", color: "#374151", marginBottom: "8px" }}>
                            EVIDÊNCIAS FOTOGRÁFICAS ({nc.data.photos.length})
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                            {nc.data.photos.map((photoUrl: string, photoIdx: number) => (
                              <div key={photoIdx} style={{ 
                                width: "100%", 
                                maxHeight: "150px",
                                overflow: "hidden",
                                borderRadius: "4px",
                                border: "1px solid #e5e7eb",
                                backgroundColor: "#f3f4f6"
                              }}>
                                <img 
                                  src={photoUrl} 
                                  alt={`Foto ${photoIdx + 1}`}
                                  style={{ 
                                    width: "100%", 
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block"
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Checklist Sections */}
          <div style={{ padding: "24px 32px" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#111", marginBottom: "16px" }}>
              CHECKLIST COMPLETO
            </div>
            
            {SAMPLE_SECTIONS.map((section, sectionIndex) => {
              let startIndex = 0;
              for (let i = 0; i < sectionIndex; i++) {
                startIndex += SAMPLE_SECTIONS[i].items.length;
              }

              return (
                <div key={section.name} style={{ marginBottom: "16px" }}>
                  <div style={{ 
                    backgroundColor: "#1a1d23", 
                    color: "white",
                    padding: "10px 16px",
                    fontSize: "12px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <div style={{ width: "4px", height: "16px", backgroundColor: "#FFD100", borderRadius: "2px" }} />
                    {section.name}
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderTop: "none" }}>
                    {section.items.map((item, itemIndex) => {
                      const idx = startIndex + itemIndex;
                      const itemResponse = responses[idx];
                      const status = itemResponse?.response;

                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "10px 16px",
                            borderBottom: itemIndex < section.items.length - 1 ? "1px solid #f3f4f6" : "none",
                            backgroundColor: itemIndex % 2 === 0 ? "#ffffff" : "#fafafa"
                          }}
                        >
                          <div style={{ 
                            width: "24px", 
                            height: "24px", 
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: status === "ok" ? "#16a34a" : 
                                           status === "nc" ? "#dc2626" : 
                                           status === "na" ? "#9ca3af" : "#e5e7eb",
                            flexShrink: 0
                          }}>
                            {status === "ok" && <Check style={{ width: "14px", height: "14px", color: "white", strokeWidth: 3 }} />}
                            {status === "nc" && <X style={{ width: "14px", height: "14px", color: "white", strokeWidth: 3 }} />}
                            {status === "na" && <Minus style={{ width: "14px", height: "14px", color: "white", strokeWidth: 3 }} />}
                            {!status && <span style={{ color: "#9ca3af", fontSize: "10px" }}>?</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", color: "#374151" }}>{item}</div>
                            {itemResponse?.observation && (
                              <div style={{ fontSize: "10px", color: "#6b7280", fontStyle: "italic", marginTop: "2px" }}>
                                {itemResponse.observation}
                              </div>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: "10px", 
                            fontWeight: "600",
                            color: status === "ok" ? "#16a34a" : 
                                   status === "nc" ? "#dc2626" : 
                                   status === "na" ? "#6b7280" : "#9ca3af",
                            width: "40px",
                            textAlign: "right"
                          }}>
                            {status === "ok" ? "CONF" : status === "nc" ? "NC" : status === "na" ? "N/A" : "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ 
            padding: "32px", 
            borderTop: "2px solid #e5e5e5",
            marginTop: "auto"
          }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ 
                width: "200px", 
                borderBottom: "1px solid #374151", 
                margin: "0 auto 8px" 
              }} />
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
                {inspData?.inspectorName || "Responsável"}
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                Técnico de Segurança do Trabalho
              </div>
            </div>
            <div style={{ 
              textAlign: "center", 
              fontSize: "10px", 
              color: "#9ca3af",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>Relatório gerado em {formatDate(new Date().toISOString())}</span>
              <span>|</span>
              <span style={{ fontWeight: "600" }}>SST Check Pro</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Inspection Button - Hidden in print */}
      <div className="max-w-[800px] mx-auto px-4 py-6 print:hidden">
        <Link href="/dashboard">
          <Button className="w-full bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold py-4" data-testid="button-new">
            <FileText className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>

      {/* Print Styles */}
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
