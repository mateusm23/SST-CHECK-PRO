import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
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
  Camera,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const inspectionId = params?.id ? parseInt(params.id) : 0;

  const { data: inspection, isLoading } = useQuery({
    queryKey: ["/api/inspections", inspectionId],
    enabled: !!inspectionId,
  });

  const responses: Record<number, ItemResponse> = (inspection as any)?.checklistData || {};

  // Calculate stats
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

  // Get non-conformities with their section and item info
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
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      // Handle multi-page PDFs
      const pageHeight = pdfHeight * (imgWidth / pdfWidth);
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", imgX, 0, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", imgX, position * ratio, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pageHeight;
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
      // Fallback: copy to clipboard
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "alta": return { text: "Alta - Risco Grave", color: "text-red-600" };
      case "media": return { text: "Média - Risco Moderado", color: "text-orange-600" };
      case "baixa": return { text: "Baixa - Risco Menor", color: "text-green-600" };
      default: return { text: "Não definida", color: "text-gray-500" };
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
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header - Hidden in print */}
      <header className="bg-[#1a1d23] text-white p-4 sticky top-0 z-50 print:hidden">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
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
          <div className="w-9" />
        </div>
      </header>

      {/* Action Buttons - Hidden in print */}
      <div className="max-w-[800px] mx-auto px-4 py-4 print:hidden">
        <div className="grid grid-cols-3 gap-2">
          <Button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-blue-500 text-white hover:bg-blue-600"
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
            className="bg-green-500 text-white hover:bg-green-600"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="border-gray-300"
            data-testid="button-print"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div ref={pdfRef} className="max-w-[800px] mx-auto bg-white print:max-w-none print:mx-0">
        {/* PDF Header */}
        <div className="bg-gradient-to-r from-[#1a1d23] to-[#2d3139] text-white p-6 print:p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FFD100] rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-[#1a1d23] stroke-[3]" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  SST<span className="text-[#FFD100]">Check</span>Pro
                </div>
                <div className="text-sm opacity-70">Relatório de Inspeção</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-70">Inspeção Nº</div>
              <div className="text-2xl font-bold text-[#FFD100]">#{inspectionId.toString().padStart(4, "0")}</div>
            </div>
          </div>
        </div>

        {/* Title Bar */}
        <div className="bg-[#FFD100] text-[#1a1d23] py-3 px-6 text-center font-bold uppercase tracking-wide">
          NR 18 - Inspeção de Canteiro de Obras
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b-2 border-gray-200">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Obra / Local</label>
              <p className="font-semibold text-gray-900">{inspData?.title || "Não informado"}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Data da Inspeção</label>
              <p className="font-semibold text-gray-900">{formatDate(inspData?.completedAt || inspData?.createdAt)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Inspetor Responsável</label>
              <p className="font-semibold text-gray-900">{inspData?.inspectorName || "Não informado"}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Local / Endereço</label>
              <p className="font-semibold text-gray-900">{inspData?.location || "Não informado"}</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-4 rounded-xl bg-gray-100">
              <div className="text-2xl font-bold text-gray-900">{totalAnswered}</div>
              <div className="text-xs text-gray-500 uppercase">Total</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-50">
              <div className="text-2xl font-bold text-green-600">{okCount}</div>
              <div className="text-xs text-green-700 uppercase">Conforme</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50">
              <div className="text-2xl font-bold text-red-600">{ncCount}</div>
              <div className="text-xs text-red-700 uppercase">Não Conf.</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{conformityScore}%</div>
              <div className="text-xs text-blue-700 uppercase">Score</div>
            </div>
          </div>

          {/* Non-Conformities Section */}
          {nonConformities.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 rounded-xl border-2 border-red-200">
              <h3 className="text-red-700 font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Não Conformidades Identificadas ({ncCount})
              </h3>
              
              <div className="space-y-4">
                {nonConformities.map((nc) => (
                  <div key={nc.index} className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                    <div className="font-semibold text-gray-900 mb-1">{nc.itemText}</div>
                    <div className="text-sm text-gray-500 mb-2">{nc.sectionName}</div>
                    
                    {nc.data.observation && (
                      <p className="text-sm text-gray-600 italic mb-2">"{nc.data.observation}"</p>
                    )}
                    
                    {nc.data.photos && nc.data.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {nc.data.photos.map((photo, i) => (
                          <img 
                            key={i} 
                            src={photo} 
                            alt="" 
                            className="w-20 h-16 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                    
                    {nc.data.actionPlan && (nc.data.actionPlan.responsible || nc.data.actionPlan.deadline || nc.data.actionPlan.priority) && (
                      <div className="mt-2 p-3 bg-orange-50 rounded border border-orange-200">
                        <div className="text-xs font-bold text-orange-700 mb-2">PLANO DE AÇÃO</div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Responsável:</span>
                            <p className="font-medium">{nc.data.actionPlan.responsible || "-"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Prazo:</span>
                            <p className="font-medium">
                              {nc.data.actionPlan.deadline 
                                ? new Date(nc.data.actionPlan.deadline).toLocaleDateString("pt-BR")
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Prioridade:</span>
                            <p className={`font-medium ${getPriorityLabel(nc.data.actionPlan.priority).color}`}>
                              {getPriorityLabel(nc.data.actionPlan.priority).text}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Items by Section */}
          {SAMPLE_SECTIONS.map((section, sectionIndex) => {
            let startIndex = 0;
            for (let i = 0; i < sectionIndex; i++) {
              startIndex += SAMPLE_SECTIONS[i].items.length;
            }

            return (
              <div key={section.name} className="mb-4 print:break-inside-avoid">
                <div className="bg-[#1a1d23] text-white px-4 py-3 rounded-t-lg font-semibold text-sm flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#FFD100] rounded-full" />
                  {section.name}
                </div>
                <div className="border border-gray-200 border-t-0 rounded-b-lg divide-y divide-gray-100">
                  {section.items.map((item, itemIndex) => {
                    const idx = startIndex + itemIndex;
                    const itemResponse = responses[idx];
                    const status = itemResponse?.response;

                    return (
                      <div key={idx} className="flex items-start gap-3 p-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm ${
                          status === "ok" ? "bg-green-500" :
                          status === "nc" ? "bg-red-500" :
                          status === "na" ? "bg-gray-400" :
                          "bg-gray-200 text-gray-400"
                        }`}>
                          {status === "ok" ? "✓" : status === "nc" ? "✗" : status === "na" ? "-" : "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800 text-sm">{item}</p>
                          {itemResponse?.observation && (
                            <p className="text-xs text-gray-500 italic mt-1">"{itemResponse.observation}"</p>
                          )}
                          {itemResponse?.photos && itemResponse.photos.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                              <Camera className="w-3 h-3" />
                              {itemResponse.photos.length} foto(s)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200 text-center">
            <div className="mb-6">
              <div className="w-48 border-b border-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">{inspData?.inspectorName || "Responsável"}</p>
              <p className="text-sm text-gray-500">Técnico de Segurança do Trabalho</p>
            </div>
            <p className="text-xs text-gray-400">
              Relatório gerado em {formatDate(new Date().toISOString())} via SST Check Pro
            </p>
          </div>
        </div>
      </div>

      {/* New Inspection Button - Hidden in print */}
      <div className="max-w-[800px] mx-auto px-4 py-6 print:hidden">
        <Link href="/dashboard">
          <Button className="w-full bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold py-4" data-testid="button-new">
            <FileText className="w-4 h-4 mr-2" />
            Nova Inspeção
          </Button>
        </Link>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
