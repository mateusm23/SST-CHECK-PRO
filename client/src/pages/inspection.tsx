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
  Loader2,
  Trash2,
  AlertTriangle,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Crown,
  ImageIcon,
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

interface NRChecklist {
  id: number;
  nrNumber: string;
  nrName: string;
  category: string;
  items: { id: string; text: string; required?: boolean }[];
}

interface ChecklistData {
  selectedNRIds?: number[];
  templateId?: number;
  responses: Record<string, ItemResponse>;
  companyLogo?: string;
}

interface TemplateItemData {
  id: number;
  text: string;
  responseType: string;
  weight: number;
  obsRequired: string;
  photoRequired: string;
}

interface TemplateSectionData {
  id: number;
  name: string;
  items: TemplateItemData[];
}

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

  const [selectedNRIds, setSelectedNRIds] = useState<number[]>([]);
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number | string, boolean>>({});
  const [step, setStep] = useState<"select-nr" | "checklist">("select-nr");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);

  const { data: inspection, isLoading } = useQuery({
    queryKey: ["/api/inspections", inspectionId],
    enabled: !!inspectionId,
  });

  const { data: nrChecklists = [] } = useQuery<NRChecklist[]>({
    queryKey: ["/api/nr-checklists"],
  });

  const { data: subscription } = useQuery<{
    plan?: { canUploadLogo?: boolean };
  }>({
    queryKey: ["/api/subscription"],
  });
  const canUploadLogo = subscription?.plan?.canUploadLogo ?? false;

  const { data: templateData, isError: templateLoadError } = useQuery({
    queryKey: ["/api/templates", activeTemplateId],
    enabled: !!activeTemplateId,
    queryFn: async () => {
      const res = await fetch(`/api/templates/${activeTemplateId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });

  const templateSections: TemplateSectionData[] = (templateData as any)?.sections || [];

  // Auto-advance to checklist when template loads for fresh template inspections
  useEffect(() => {
    if (
      step === "select-nr" &&
      activeTemplateId &&
      templateSections.length > 0 &&
      Object.keys(responses).length === 0
    ) {
      setStep("checklist");
    }
  }, [step, activeTemplateId, templateSections.length, responses]);

  const selectedNRs = useMemo(
    () => nrChecklists.filter((nr) => selectedNRIds.includes(nr.id)),
    [nrChecklists, selectedNRIds]
  );

  const allItems = useMemo(() => {
    const items: { nrId: number; nrNumber: string; itemId: string; text: string; required: boolean }[] = [];
    selectedNRs.forEach((nr) => {
      nr.items.forEach((item) => {
        items.push({ nrId: nr.id, nrNumber: nr.nrNumber, itemId: item.id, text: item.text, required: item.required ?? false });
      });
    });
    return items;
  }, [selectedNRs]);

  const allTemplateItems = useMemo(() => {
    if (!activeTemplateId) return [];
    return templateSections.flatMap((s) =>
      s.items.map((item) => ({
        itemId: String(item.id),
        text: item.text,
        responseType: item.responseType || "conformity",
      }))
    );
  }, [templateSections, activeTemplateId]);

  const effectiveItems = activeTemplateId ? allTemplateItems : allItems;
  const totalItems = effectiveItems.length;

  const stats = useMemo(() => {
    let ok = 0, nc = 0, na = 0, textAnswered = 0;
    effectiveItems.forEach((it: any) => {
      const { itemId, responseType } = it;
      if (responseType === "text") {
        if (responses[itemId]?.observation) textAnswered++;
      } else {
        const r = responses[itemId]?.response;
        if (r === "ok") ok++;
        else if (r === "nc") nc++;
        else if (r === "na") na++;
      }
    });
    return { ok, nc, na, answered: ok + nc + na + textAnswered };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, effectiveItems]);

  const progressPercent = totalItems > 0 ? (stats.answered / totalItems) * 100 : 0;
  const canFinish = totalItems > 0 && stats.answered === totalItems;

  useEffect(() => {
    if (inspection) {
      const insp = inspection as any;
      setFormData({
        title: insp.title || "",
        location: insp.location || "",
        inspectorName: insp.inspectorName || "",
        observations: insp.observations || "",
      });
      if (insp.checklistData) {
        const saved = insp.checklistData as ChecklistData;
        if (saved.templateId) {
          setActiveTemplateId(saved.templateId);
          setResponses(saved.responses || {});
          // If already has responses, go straight to checklist; otherwise stay on form step
          if (Object.keys(saved.responses || {}).length > 0) setStep("checklist");
        } else if (saved.selectedNRIds && Array.isArray(saved.selectedNRIds)) {
          setSelectedNRIds(saved.selectedNRIds);
          setResponses(saved.responses || {});
          if (saved.selectedNRIds.length > 0) setStep("checklist");
        } else {
          // legacy format (old numeric keys) — ignore, start fresh
        }
        if (saved.companyLogo) setCompanyLogo(saved.companyLogo);
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
      setLocation(`/inspection/${inspectionId}/view`);
    },
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

  const buildChecklistData = (): ChecklistData => ({
    ...(activeTemplateId ? { templateId: activeTemplateId } : { selectedNRIds }),
    responses,
    companyLogo: companyLogo || undefined,
  });

  const handleSave = () => {
    updateMutation.mutate({ ...formData, checklistData: buildChecklistData() });
  };

  const handleConfirmNRs = () => {
    if (!activeTemplateId && selectedNRIds.length === 0) {
      toast({ title: "Selecione ao menos uma NR", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ ...formData, checklistData: buildChecklistData() });
    setStep("checklist");
  };

  const handleResponse = (itemId: string, value: ResponseType) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        response: value,
        observation: prev[itemId]?.observation || "",
        photos: prev[itemId]?.photos || [],
        actionPlan:
          value === "nc"
            ? prev[itemId]?.actionPlan || { responsible: "", deadline: "", priority: "" }
            : undefined,
      },
    }));
  };

  const handleObservation = (itemId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], response: prev[itemId]?.response || null, observation: value, photos: prev[itemId]?.photos || [] },
    }));
  };

  const handleActionPlan = (itemId: string, field: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        response: prev[itemId]?.response || null,
        observation: prev[itemId]?.observation || "",
        photos: prev[itemId]?.photos || [],
        actionPlan: { ...prev[itemId]?.actionPlan, [field]: value } as any,
      },
    }));
  };

  const handlePhotoUpload = (itemId: string, files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setResponses((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], response: prev[itemId]?.response || null, observation: prev[itemId]?.observation || "", photos: [...(prev[itemId]?.photos || []), base64] },
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (itemId: string, photoIndex: number) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], photos: prev[itemId]?.photos.filter((_, i) => i !== photoIndex) || [] },
    }));
  };

  const handleMarkNRAll = (nrId: number, value: ResponseType) => {
    const nr = nrChecklists.find((n) => n.id === nrId);
    if (!nr) return;
    setResponses((prev) => {
      const next = { ...prev };
      nr.items.forEach((item) => {
        if (!prev[item.id]?.response) {
          next[item.id] = {
            response: value,
            observation: prev[item.id]?.observation || "",
            photos: prev[item.id]?.photos || [],
            actionPlan: value === "nc" ? { responsible: "", deadline: "", priority: "" } : undefined,
          };
        }
      });
      return next;
    });
  };

  const handleMarkAllUnset = (value: ResponseType) => {
    setResponses((prev) => {
      const next = { ...prev };
      effectiveItems.forEach((it: any) => {
        const { itemId, responseType } = it;
        if (responseType === "text") return;
        if (!prev[itemId]?.response) {
          next[itemId] = {
            response: value,
            observation: prev[itemId]?.observation || "",
            photos: prev[itemId]?.photos || [],
            actionPlan: value === "nc" ? { responsible: "", deadline: "", priority: "" } : undefined,
          };
        }
      });
      return next;
    });
  };

  const handleMarkSectionAll = (sectionId: number, value: ResponseType) => {
    const section = templateSections.find((s) => s.id === sectionId);
    if (!section) return;
    setResponses((prev) => {
      const next = { ...prev };
      section.items.forEach((item) => {
        if (item.responseType === "text") return;
        const key = String(item.id);
        if (!prev[key]?.response) {
          next[key] = {
            response: value,
            observation: prev[key]?.observation || "",
            photos: prev[key]?.photos || [],
            actionPlan: value === "nc" ? { responsible: "", deadline: "", priority: "" } : undefined,
          };
        }
      });
      return next;
    });
  };

  const toggleSection = (nrId: number) => {
    setCollapsedSections((prev) => ({ ...prev, [nrId]: !prev[nrId] }));
  };

  const toggleNR = (id: number) => {
    setSelectedNRIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <header className="bg-[#1a1d23] text-white p-4 text-center sticky top-0 z-50">
          <Skeleton className="h-6 w-48 mx-auto bg-[#4A4E57]" />
        </header>
        <div className="max-w-[600px] mx-auto p-4 space-y-3">
          <Skeleton className="h-48 w-full bg-white rounded-xl" />
          <Skeleton className="h-32 w-full bg-white rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
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
      <header className="bg-[#1a1d23] text-white p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-[600px] mx-auto">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-[#FFD100] font-bold text-lg flex items-center gap-2 justify-center">
              <Check className="w-5 h-5" />
              SST Check Pro
            </h1>
            <p className="text-xs opacity-70">
              {step === "select-nr" ? (activeTemplateId ? "Dados da Inspeção" : "Selecionar NRs") : "Checklist"}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteModal(true)} className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
              <Trash2 className="h-5 w-5" />
            </Button>
            {step === "checklist" && (
              <Button variant="ghost" size="icon" onClick={handleSave} disabled={updateMutation.isPending} className="text-white hover:bg-white/10">
                {updateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto p-4">

        {/* ── STEP 1: Dados + Seleção de NRs ── */}
        {step === "select-nr" && (
          <>
            {/* Dados da inspeção */}
            <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
              <h2 className="font-bold text-base mb-4 text-[#1a1d23] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#FFD100]" />
                Dados da Inspeção
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Obra / Local *</label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Edifício Aurora — Bloco A" className="border-2 border-gray-200 focus:border-[#FFD100]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço / Localização</label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Ex: Rua das Flores, 100 — São Paulo/SP" className="border-2 border-gray-200 focus:border-[#FFD100]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Responsável pela Inspeção *</label>
                  <Input value={formData.inspectorName} onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })} placeholder="Nome completo do técnico ou engenheiro" className="border-2 border-gray-200 focus:border-[#FFD100]" />
                </div>

                {/* Logo da empresa */}
                <div>
                  <label className="flex text-sm font-semibold text-gray-700 mb-1 items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-[#FFD100]" />
                    Logo da Empresa (no PDF)
                  </label>
                  {canUploadLogo ? (
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-[#FFD100] transition-colors bg-gray-50">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {companyLogo ? "Trocar imagem" : "Selecionar logo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => setCompanyLogo(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {companyLogo && (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-[#FFD100] bg-white flex items-center justify-center p-1">
                          <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                          <button
                            onClick={() => setCompanyLogo("")}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link href="/pricing">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-[#FFD100] transition-colors">
                        <Crown className="w-5 h-5 text-[#FFD100] flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-700">Disponível nos planos pagos</div>
                          <div className="text-xs text-gray-400">Adicione sua logo no PDF do relatório</div>
                        </div>
                        <span className="ml-auto bg-[#FFD100] text-[#1a1d23] text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">Upgrade</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Template info OR NR selection */}
            {activeTemplateId ? (
              <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
                <h2 className="font-bold text-base mb-1 text-[#1a1d23] flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#FFD100]" />
                  Template Selecionado
                </h2>
                {templateLoadError ? (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-600">
                    Erro ao carregar template. Tente recarregar a página.
                  </div>
                ) : templateData ? (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-[#1a1d23] rounded-xl">
                    <div className="w-10 h-10 bg-[#FFD100]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-[#FFD100]" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{(templateData as any).name}</p>
                      <p className="text-xs text-gray-400">
                        {templateSections.length} {templateSections.length === 1 ? "seção" : "seções"} ·{" "}
                        {templateSections.reduce((acc: number, s: TemplateSectionData) => acc + s.items.length, 0)} itens
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
                <h2 className="font-bold text-base mb-1 text-[#1a1d23]">Selecione as NRs a inspecionar</h2>
                <p className="text-xs text-gray-400 mb-4">Escolha uma ou mais normas regulamentadoras</p>

                {nrChecklists.length === 0 ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : (
                  <div className="space-y-2">
                    {nrChecklists.map((nr) => {
                      const selected = selectedNRIds.includes(nr.id);
                      return (
                        <button
                          key={nr.id}
                          onClick={() => toggleNR(nr.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                            selected
                              ? "border-[#FFD100] bg-[#fffbe6]"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-[#1a1d23]">{nr.nrNumber}</div>
                            <div className="text-xs text-gray-500 truncate">{nr.nrName}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{nr.items.length} itens · {nr.category}</div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selected ? "bg-[#FFD100] border-[#FFD100]" : "border-gray-300"
                          }`}>
                            {selected && <Check className="w-3.5 h-3.5 text-[#1a1d23] stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleConfirmNRs}
              disabled={(activeTemplateId ? (!templateData || templateLoadError) : selectedNRIds.length === 0) || updateMutation.isPending}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                (activeTemplateId ? !!templateData : selectedNRIds.length > 0)
                  ? "bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
              {activeTemplateId
                ? "Iniciar Checklist"
                : selectedNRIds.length === 0
                  ? "Selecione ao menos 1 NR"
                  : `Iniciar Checklist (${selectedNRIds.length} NR${selectedNRIds.length > 1 ? "s" : ""})`}
            </button>
          </>
        )}

        {/* ── STEP 2: Checklist ── */}
        {step === "checklist" && (
          <>
            {/* Resumo */}
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-sm text-[#1a1d23]">{formData.title || "Sem título"}</div>
                  <div className="text-xs text-gray-400">
                    {formData.inspectorName} ·{" "}
                    {activeTemplateId
                      ? (templateData as any)?.name || "Template"
                      : selectedNRs.map(n => n.nrNumber).join(", ")}
                  </div>
                </div>
                {!activeTemplateId && (
                  <button onClick={() => setStep("select-nr")} className="text-xs text-blue-500 underline flex-shrink-0">Alterar NRs</button>
                )}
              </div>

              {/* Progress */}
              <div className="bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #FFD100, #f59e0b)" }} />
              </div>
              <p className="text-center text-xs text-gray-500 mb-3">
                <span className="font-semibold">{stats.answered}</span> de <span className="font-semibold">{totalItems}</span> itens respondidos
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
                  <div className="text-xs text-green-700 font-semibold uppercase">Conforme</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.nc}</div>
                  <div className="text-xs text-red-700 font-semibold uppercase">Não Conf.</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.na}</div>
                  <div className="text-xs text-gray-700 font-semibold uppercase">N/A</div>
                </div>
              </div>
            </div>

            {/* Marcação em massa global */}
            {stats.answered < totalItems && (
              <div className="bg-[#1a1d23] rounded-xl px-4 py-3 mb-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                  Marcar todos não respondidos como:
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleMarkAllUnset("ok")} className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-all">✓ Conf.</button>
                  <button onClick={() => handleMarkAllUnset("nc")} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all">✗ NC</button>
                  <button onClick={() => handleMarkAllUnset("na")} className="flex-1 py-2 rounded-lg bg-gray-500 text-white font-bold text-sm hover:bg-gray-600 transition-all">N/A</button>
                </div>
              </div>
            )}

            {/* Seções por NR (inspeções NR padrão) */}
            {!activeTemplateId && selectedNRs.map((nr) => {
              const nrItems = nr.items;
              const nrUnset = nrItems.filter((item) => !responses[item.id]?.response).length;
              const nrOk = nrItems.filter((item) => responses[item.id]?.response === "ok").length;
              const nrNc = nrItems.filter((item) => responses[item.id]?.response === "nc").length;
              const isCollapsed = collapsedSections[nr.id];

              return (
                <div key={nr.id} className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                  {/* NR Header */}
                  <div className="bg-[#1a1d23] text-white px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => toggleSection(nr.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                        <div className="min-w-0">
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span className="w-1 h-4 bg-[#FFD100] rounded-full flex-shrink-0 block" />
                            {nr.nrNumber} — {nr.nrName}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 pl-3">
                            {nrOk} conf. · {nrNc} NC · {nrUnset} pendentes
                          </div>
                        </div>
                        {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </button>

                      {/* Marcação em massa por NR */}
                      {nrUnset > 0 && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleMarkNRAll(nr.id, "ok")} className="px-2 py-1 rounded bg-green-500 text-white text-xs font-bold hover:bg-green-600" title="Todos como Conforme">✓</button>
                          <button onClick={() => handleMarkNRAll(nr.id, "nc")} className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold hover:bg-red-600" title="Todos como NC">✗</button>
                          <button onClick={() => handleMarkNRAll(nr.id, "na")} className="px-2 py-1 rounded bg-gray-500 text-white text-xs font-bold hover:bg-gray-600" title="Todos como N/A">N/A</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Itens */}
                  {!isCollapsed && (
                    <div>
                      {nrItems.map((item, itemIndex) => {
                        const itemResponse = responses[item.id];
                        const currentResponse = itemResponse?.response;

                        return (
                          <div key={item.id} className="p-4 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-start gap-2 mb-3">
                              {item.required && (
                                <span className="text-red-500 text-xs font-bold flex-shrink-0 mt-0.5">*</span>
                              )}
                              <p className="font-medium text-gray-800 leading-relaxed text-sm">
                                {itemIndex + 1}. {item.text}
                              </p>
                            </div>

                            {/* Botões de resposta */}
                            <div className="flex gap-2 mb-3">
                              <button
                                onClick={() => handleResponse(item.id, "ok")}
                                className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "ok" ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-700 border-gray-200 hover:border-green-300"}`}
                              >
                                ✓ Conf.
                              </button>
                              <button
                                onClick={() => handleResponse(item.id, "nc")}
                                className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "nc" ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-700 border-gray-200 hover:border-red-300"}`}
                              >
                                ✗ NC
                              </button>
                              <button
                                onClick={() => handleResponse(item.id, "na")}
                                className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "na" ? "bg-gray-500 text-white border-gray-500" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"}`}
                              >
                                N/A
                              </button>
                            </div>

                            {/* Observação */}
                            <div className="pt-3 border-t border-dashed border-gray-200">
                              <input
                                type="text"
                                placeholder="Observação (opcional)"
                                value={itemResponse?.observation || ""}
                                onChange={(e) => handleObservation(item.id, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:border-[#FFD100]"
                              />

                              {/* Fotos — só para NC */}
                              {currentResponse === "nc" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${(itemResponse?.photos?.length || 0) > 0 ? "bg-blue-50 border-2 border-blue-500 text-blue-700" : "bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400"}`}>
                                    <Camera className="w-4 h-4" />
                                    {(itemResponse?.photos?.length || 0) > 0 ? `${itemResponse.photos.length} foto(s)` : "Adicionar Foto"}
                                    <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handlePhotoUpload(item.id, e.target.files)} />
                                  </label>
                                  {itemResponse?.photos?.map((photo, photoIndex) => (
                                    <div key={photoIndex} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                      <img src={photo} alt="" className="w-full h-full object-cover" />
                                      <button onClick={() => handleRemovePhoto(item.id, photoIndex)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Plano de ação — só para NC */}
                            {currentResponse === "nc" && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="text-sm font-bold text-red-700 mb-2">⚠️ Plano de Ação</div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Responsável</label>
                                    <input type="text" placeholder="Quem vai corrigir?" value={itemResponse?.actionPlan?.responsible || ""} onChange={(e) => handleActionPlan(item.id, "responsible", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Prazo</label>
                                    <input type="date" value={itemResponse?.actionPlan?.deadline || ""} onChange={(e) => handleActionPlan(item.id, "deadline", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Prioridade</label>
                                  <select value={itemResponse?.actionPlan?.priority || ""} onChange={(e) => handleActionPlan(item.id, "priority", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]">
                                    <option value="">Selecione...</option>
                                    <option value="alta">Alta — Risco Grave/Iminente</option>
                                    <option value="media">Média — Risco Moderado</option>
                                    <option value="baixa">Baixa — Risco Menor</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Seções do Template */}
            {activeTemplateId && templateSections.length === 0 && !templateLoadError && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
            {activeTemplateId && templateSections.map((section) => {
              const sectionConformityItems = section.items.filter((i) => i.responseType !== "text");
              const sectionAnswered = section.items.filter((item) => {
                const key = String(item.id);
                if (item.responseType === "text") return !!responses[key]?.observation;
                return !!responses[key]?.response;
              }).length;
              const sectionNc = section.items.filter((item) => responses[String(item.id)]?.response === "nc").length;
              const sectionUnset = section.items.length - sectionAnswered;
              const isCollapsed = collapsedSections[section.id];

              return (
                <div key={section.id} className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                  <div className="bg-[#1a1d23] text-white px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => toggleSection(section.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                        <div className="min-w-0">
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span className="w-1 h-4 bg-[#FFD100] rounded-full flex-shrink-0 block" />
                            {section.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 pl-3">
                            {sectionAnswered} resp. · {sectionNc} NC · {sectionUnset} pendentes
                          </div>
                        </div>
                        {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </button>
                      {sectionUnset > 0 && sectionConformityItems.length > 0 && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleMarkSectionAll(section.id, "ok")} className="px-2 py-1 rounded bg-green-500 text-white text-xs font-bold hover:bg-green-600">✓</button>
                          <button onClick={() => handleMarkSectionAll(section.id, "nc")} className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold hover:bg-red-600">✗</button>
                          <button onClick={() => handleMarkSectionAll(section.id, "na")} className="px-2 py-1 rounded bg-gray-500 text-white text-xs font-bold hover:bg-gray-600">N/A</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div>
                      {section.items.map((item, itemIndex) => {
                        const itemKey = String(item.id);
                        const itemResponse = responses[itemKey];
                        const currentResponse = itemResponse?.response;
                        const obsAlways = item.obsRequired === "always";
                        const obsIfNc = item.obsRequired === "if_nc" && currentResponse === "nc";
                        const photoAlways = item.photoRequired === "always";
                        const photoIfNc = item.photoRequired === "if_nc" && currentResponse === "nc";
                        const showObs = item.responseType === "text" || obsAlways || obsIfNc;
                        const showPhoto = photoAlways || photoIfNc;

                        return (
                          <div key={item.id} className="p-4 border-b border-gray-100 last:border-b-0">
                            <p className="font-medium text-gray-800 leading-relaxed text-sm mb-3">
                              {itemIndex + 1}. {item.text}
                              {(obsAlways || item.responseType === "text") && (
                                <span className="text-red-400 ml-1 text-xs">*</span>
                              )}
                            </p>

                            {/* Botões de resposta: conformity */}
                            {item.responseType === "conformity" && (
                              <div className="flex gap-2 mb-3">
                                <button onClick={() => handleResponse(itemKey, "ok")} className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "ok" ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-700 border-gray-200 hover:border-green-300"}`}>✓ Conf.</button>
                                <button onClick={() => handleResponse(itemKey, "nc")} className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "nc" ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-700 border-gray-200 hover:border-red-300"}`}>✗ NC</button>
                                <button onClick={() => handleResponse(itemKey, "na")} className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "na" ? "bg-gray-500 text-white border-gray-500" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"}`}>N/A</button>
                              </div>
                            )}

                            {/* Botões de resposta: boolean (Sim/Não) */}
                            {item.responseType === "boolean" && (
                              <div className="flex gap-2 mb-3">
                                <button onClick={() => handleResponse(itemKey, "ok")} className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "ok" ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-700 border-gray-200 hover:border-green-300"}`}>Sim</button>
                                <button onClick={() => handleResponse(itemKey, "nc")} className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm transition-all ${currentResponse === "nc" ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-700 border-gray-200 hover:border-red-300"}`}>Não</button>
                              </div>
                            )}

                            {/* Observação */}
                            {(showObs || item.obsRequired === "never") && (
                              <div className="pt-3 border-t border-dashed border-gray-200">
                                <input
                                  type="text"
                                  placeholder={item.responseType === "text" ? "Resposta / texto obrigatório" : obsAlways ? "Observação (obrigatória)" : "Observação (opcional)"}
                                  value={itemResponse?.observation || ""}
                                  onChange={(e) => handleObservation(itemKey, e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg text-sm mb-2 focus:outline-none focus:border-[#FFD100] ${obsAlways && !itemResponse?.observation ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}
                                />
                              </div>
                            )}
                            {!showObs && item.obsRequired !== "never" && item.responseType !== "text" && (
                              <div className="pt-3 border-t border-dashed border-gray-200">
                                <input
                                  type="text"
                                  placeholder="Observação (opcional)"
                                  value={itemResponse?.observation || ""}
                                  onChange={(e) => handleObservation(itemKey, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:border-[#FFD100]"
                                />
                              </div>
                            )}

                            {/* Fotos */}
                            {showPhoto && (
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${(itemResponse?.photos?.length || 0) > 0 ? "bg-blue-50 border-2 border-blue-500 text-blue-700" : "bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400"}`}>
                                  <Camera className="w-4 h-4" />
                                  {(itemResponse?.photos?.length || 0) > 0 ? `${itemResponse!.photos.length} foto(s)` : "Adicionar Foto"}
                                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handlePhotoUpload(itemKey, e.target.files)} />
                                </label>
                                {itemResponse?.photos?.map((photo, photoIndex) => (
                                  <div key={photoIndex} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => handleRemovePhoto(itemKey, photoIndex)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Plano de ação para NC */}
                            {currentResponse === "nc" && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="text-sm font-bold text-red-700 mb-2">⚠️ Plano de Ação</div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Responsável</label>
                                    <input type="text" placeholder="Quem vai corrigir?" value={itemResponse?.actionPlan?.responsible || ""} onChange={(e) => handleActionPlan(itemKey, "responsible", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Prazo</label>
                                    <input type="date" value={itemResponse?.actionPlan?.deadline || ""} onChange={(e) => handleActionPlan(itemKey, "deadline", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Prioridade</label>
                                  <select value={itemResponse?.actionPlan?.priority || ""} onChange={(e) => handleActionPlan(itemKey, "priority", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFD100]">
                                    <option value="">Selecione...</option>
                                    <option value="alta">Alta — Risco Grave/Iminente</option>
                                    <option value="media">Média — Risco Moderado</option>
                                    <option value="baixa">Baixa — Risco Menor</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Observações gerais */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Observações Gerais</label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Condições gerais da obra, pontos de atenção, contexto da inspeção..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#FFD100] resize-none"
              />
            </div>

            {/* Botões de ação */}
            <button
              onClick={() => { handleSave(); completeMutation.mutate(); }}
              disabled={!canFinish || completeMutation.isPending}
              className={`w-full py-4 rounded-xl font-bold text-lg mb-3 transition-all flex items-center justify-center gap-2 ${canFinish ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
            >
              {completeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {canFinish ? "Finalizar e Gerar Relatório" : `Responda mais ${totalItems - stats.answered} item(s)`}
            </button>

            <Link href="/dashboard">
              <button className="w-full py-3 rounded-xl font-bold text-base bg-gray-500 text-white hover:bg-gray-600 transition-all">
                ← Voltar ao Dashboard
              </button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
