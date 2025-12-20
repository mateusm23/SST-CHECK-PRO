import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Camera,
  X,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type ResponseType = "ok" | "nc" | "na" | null;

interface ItemResponse {
  response: ResponseType;
  observation: string;
  photos: string[];
  actionPlan?: {
    responsible: string;
    deadline: string;
    priority: string;
  };
}

interface ChecklistSection {
  name: string;
  items: string[];
}

interface NRChecklist {
  id: number;
  nrNumber: string;
  nrName: string;
  category: string;
  items: { id: string; text: string; required?: boolean }[];
}

const SAMPLE_SECTIONS: ChecklistSection[] = [
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

export default function InspectionPage() {
  const [, params] = useRoute("/inspection/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const inspectionId = params?.id ? parseInt(params.id) : 0;

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    inspectorName: "",
    observations: "",
  });

  const [responses, setResponses] = useState<Record<number, ItemResponse>>({});

  const { data: inspection, isLoading } = useQuery({
    queryKey: ["/api/inspections", inspectionId],
    enabled: !!inspectionId,
  });

  const { data: nrChecklists } = useQuery<NRChecklist[]>({
    queryKey: ["/api/nr-checklists"],
  });

  const allItems = useMemo(() => {
    const items: { sectionName: string; text: string; globalIndex: number }[] = [];
    let globalIndex = 0;
    SAMPLE_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        items.push({ sectionName: section.name, text: item, globalIndex });
        globalIndex++;
      });
    });
    return items;
  }, []);

  const totalItems = allItems.length;

  const stats = useMemo(() => {
    let ok = 0, nc = 0, na = 0;
    Object.values(responses).forEach((r) => {
      if (r.response === "ok") ok++;
      else if (r.response === "nc") nc++;
      else if (r.response === "na") na++;
    });
    return { ok, nc, na, answered: ok + nc + na };
  }, [responses]);

  const progressPercent = totalItems > 0 ? (stats.answered / totalItems) * 100 : 0;
  const canFinish = stats.answered === totalItems;

  useEffect(() => {
    if (inspection) {
      setFormData({
        title: (inspection as any).title || "",
        location: (inspection as any).location || "",
        inspectorName: (inspection as any).inspectorName || "",
        observations: (inspection as any).observations || "",
      });
      if ((inspection as any).checklistData) {
        const saved = (inspection as any).checklistData as Record<number, ItemResponse>;
        setResponses(saved);
      }
    }
  }, [inspection]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/inspections/${inspectionId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections", inspectionId] });
      toast({ title: "Salvo", description: "Inspeção atualizada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/inspections/${inspectionId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections", inspectionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({ title: "Concluída", description: "Inspeção finalizada com sucesso" });
      setLocation("/dashboard");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      checklistData: responses,
    });
  };

  const handleResponse = (index: number, value: ResponseType) => {
    setResponses((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        response: value,
        observation: prev[index]?.observation || "",
        photos: prev[index]?.photos || [],
        actionPlan: value === "nc" ? prev[index]?.actionPlan || { responsible: "", deadline: "", priority: "" } : undefined,
      },
    }));
  };

  const handleObservation = (index: number, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        response: prev[index]?.response || null,
        observation: value,
        photos: prev[index]?.photos || [],
      },
    }));
  };

  const handleActionPlan = (index: number, field: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        response: prev[index]?.response || null,
        observation: prev[index]?.observation || "",
        photos: prev[index]?.photos || [],
        actionPlan: {
          ...prev[index]?.actionPlan,
          [field]: value,
        } as any,
      },
    }));
  };

  const handlePhotoUpload = (index: number, files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setResponses((prev) => ({
          ...prev,
          [index]: {
            ...prev[index],
            response: prev[index]?.response || null,
            observation: prev[index]?.observation || "",
            photos: [...(prev[index]?.photos || []), base64],
          },
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number, photoIndex: number) => {
    setResponses((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        photos: prev[index]?.photos.filter((_, i) => i !== photoIndex) || [],
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <header className="bg-[#1a1d23] text-white p-4 text-center sticky top-0 z-50">
          <Skeleton className="h-6 w-48 mx-auto bg-[#4A4E57]" />
        </header>
        <div className="max-w-[600px] mx-auto p-4">
          <Skeleton className="h-48 w-full bg-white rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-[#1a1d23] text-white p-4 text-center sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-[600px] mx-auto">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[#FFD100] font-bold text-lg flex items-center gap-2 justify-center">
              <Check className="w-5 h-5" />
              SST Check Pro
            </h1>
            <p className="text-xs opacity-80">Checklist de Segurança do Trabalho</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="text-white hover:bg-white/10"
            data-testid="button-save"
          >
            {updateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto p-4">
        {/* Info Card */}
        <div className="bg-white rounded-xl p-6 mb-4 shadow-sm">
          <h2 className="font-bold text-lg mb-4 text-[#1a1d23]">NR 18 - Inspeção de Canteiro de Obras</h2>
          
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Obra / Local *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Edifício Residencial Aurora"
                className="border-2 border-gray-200 focus:border-[#FFD100]"
                data-testid="input-title"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Responsável pela Inspeção *</label>
              <Input
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                placeholder="Seu nome completo"
                className="border-2 border-gray-200 focus:border-[#FFD100]"
                data-testid="input-inspector"
              />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-200 h-2.5 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg, #FFD100, #f59e0b)",
              }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mb-4">
            <span className="font-semibold">{stats.answered}</span> de <span className="font-semibold">{totalItems}</span> itens respondidos
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-3xl font-bold text-green-600" data-testid="stat-ok">{stats.ok}</div>
              <div className="text-xs text-green-700 uppercase font-semibold">Conforme</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-3xl font-bold text-red-600" data-testid="stat-nc">{stats.nc}</div>
              <div className="text-xs text-red-700 uppercase font-semibold">Não Conf.</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <div className="text-3xl font-bold text-gray-600" data-testid="stat-na">{stats.na}</div>
              <div className="text-xs text-gray-700 uppercase font-semibold">N/A</div>
            </div>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          {SAMPLE_SECTIONS.map((section, sectionIndex) => {
            let startIndex = 0;
            for (let i = 0; i < sectionIndex; i++) {
              startIndex += SAMPLE_SECTIONS[i].items.length;
            }

            return (
              <div key={section.name} className="mb-4 last:mb-0">
                {/* Section Header */}
                <div className="bg-[#1a1d23] text-white px-4 py-3 font-semibold text-sm flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#FFD100] rounded-full" />
                  {section.name}
                </div>

                {/* Items */}
                {section.items.map((item, itemIndex) => {
                  const globalIndex = startIndex + itemIndex;
                  const itemResponse = responses[globalIndex];
                  const currentResponse = itemResponse?.response;

                  return (
                    <div key={globalIndex} className="p-4 border-b border-gray-100 last:border-b-0">
                      {/* Question */}
                      <p className="font-medium text-gray-800 mb-3 leading-relaxed">
                        {globalIndex + 1}. {item}
                      </p>

                      {/* Response Buttons */}
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => handleResponse(globalIndex, "ok")}
                          className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                            currentResponse === "ok"
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-white text-gray-700 border-gray-200 hover:border-green-300"
                          }`}
                          data-testid={`btn-ok-${globalIndex}`}
                        >
                          ✓ Conf.
                        </button>
                        <button
                          onClick={() => handleResponse(globalIndex, "nc")}
                          className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                            currentResponse === "nc"
                              ? "bg-red-500 text-white border-red-500"
                              : "bg-white text-gray-700 border-gray-200 hover:border-red-300"
                          }`}
                          data-testid={`btn-nc-${globalIndex}`}
                        >
                          ✗ NC
                        </button>
                        <button
                          onClick={() => handleResponse(globalIndex, "na")}
                          className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                            currentResponse === "na"
                              ? "bg-gray-500 text-white border-gray-500"
                              : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                          }`}
                          data-testid={`btn-na-${globalIndex}`}
                        >
                          N/A
                        </button>
                      </div>

                      {/* Extras: Observation (always visible) */}
                      <div className="pt-3 border-t border-dashed border-gray-200">
                        <input
                          type="text"
                          placeholder="Observação (opcional)"
                          value={itemResponse?.observation || ""}
                          onChange={(e) => handleObservation(globalIndex, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:border-[#FFD100]"
                          data-testid={`input-obs-${globalIndex}`}
                        />

                        {/* Photo Upload - Only visible for NC */}
                        {currentResponse === "nc" && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <label
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                                (itemResponse?.photos?.length || 0) > 0
                                  ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
                                  : "bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400"
                              }`}
                            >
                              <Camera className="w-4 h-4" />
                              {(itemResponse?.photos?.length || 0) > 0 ? `${itemResponse.photos.length} foto(s)` : "Adicionar Foto"}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(globalIndex, e.target.files)}
                                data-testid={`input-photo-${globalIndex}`}
                              />
                            </label>

                            {/* Photo Previews */}
                            {itemResponse?.photos?.map((photo, photoIndex) => (
                              <div key={photoIndex} className="relative w-14 h-14 rounded-lg overflow-hidden">
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => handleRemovePhoto(globalIndex, photoIndex)}
                                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                                  data-testid={`btn-remove-photo-${globalIndex}-${photoIndex}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Plan (only for NC) */}
                      {currentResponse === "nc" && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                            <span>⚠️</span> Plano de Ação para Não Conformidade
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Responsável</label>
                              <input
                                type="text"
                                placeholder="Quem vai corrigir?"
                                value={itemResponse?.actionPlan?.responsible || ""}
                                onChange={(e) => handleActionPlan(globalIndex, "responsible", e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]"
                                data-testid={`input-action-responsible-${globalIndex}`}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Prazo</label>
                              <input
                                type="date"
                                value={itemResponse?.actionPlan?.deadline || ""}
                                onChange={(e) => handleActionPlan(globalIndex, "deadline", e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]"
                                data-testid={`input-action-deadline-${globalIndex}`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Prioridade</label>
                            <select
                              value={itemResponse?.actionPlan?.priority || ""}
                              onChange={(e) => handleActionPlan(globalIndex, "priority", e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]"
                              data-testid={`select-action-priority-${globalIndex}`}
                            >
                              <option value="">Selecione...</option>
                              <option value="alta">Alta - Risco Grave/Iminente</option>
                              <option value="media">Média - Risco Moderado</option>
                              <option value="baixa">Baixa - Risco Menor</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => {
            handleSave();
            completeMutation.mutate();
          }}
          disabled={!canFinish || completeMutation.isPending}
          className={`w-full py-4 rounded-lg font-bold text-lg mb-3 transition-all flex items-center justify-center gap-2 ${
            canFinish
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          data-testid="button-finish"
        >
          {completeMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          Finalizar e Gerar Relatório
        </button>

        <Link href="/dashboard">
          <button className="w-full py-4 rounded-lg font-bold text-lg bg-gray-500 text-white hover:bg-gray-600 transition-all" data-testid="button-cancel">
            ← Cancelar Inspeção
          </button>
        </Link>
      </div>
    </div>
  );
}
