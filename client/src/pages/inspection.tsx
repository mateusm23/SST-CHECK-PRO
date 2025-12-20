import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Check, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Brain,
  Camera,
  FileText,
  AlertTriangle,
  Trash2,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

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
  const [checklistData, setChecklistData] = useState<Record<string, Record<string, boolean>>>({});

  const { data: inspection, isLoading } = useQuery({
    queryKey: ["/api/inspections", inspectionId],
    enabled: !!inspectionId,
  });

  const { data: nrChecklists } = useQuery({
    queryKey: ["/api/nr-checklists"],
  });

  useEffect(() => {
    if (inspection) {
      setFormData({
        title: (inspection as any).title || "",
        location: (inspection as any).location || "",
        inspectorName: (inspection as any).inspectorName || "",
        observations: (inspection as any).observations || "",
      });
      if ((inspection as any).checklistData) {
        setChecklistData((inspection as any).checklistData as Record<string, Record<string, boolean>>);
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/inspections/${inspectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      setLocation("/dashboard");
      toast({ title: "Excluída", description: "Inspeção removida" });
    },
  });

  const generateAIMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/inspections/${inspectionId}/action-plans/generate`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections", inspectionId] });
      toast({ 
        title: "Planos Gerados", 
        description: `${data.length} planos de ação criados pela IA` 
      });
    },
    onError: () => {
      toast({ 
        title: "Erro", 
        description: "Falha ao gerar planos de ação", 
        variant: "destructive" 
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      checklistData,
    });
  };

  const handleChecklistChange = (nrNumber: string, itemId: string, checked: boolean) => {
    setChecklistData((prev) => ({
      ...prev,
      [nrNumber]: {
        ...prev[nrNumber],
        [itemId]: checked,
      },
    }));
  };

  const calculateScore = () => {
    let total = 0;
    let checked = 0;
    Object.values(checklistData).forEach((items) => {
      Object.values(items).forEach((value) => {
        total++;
        if (value) checked++;
      });
    });
    return total > 0 ? Math.round((checked / total) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1D23]">
        <header className="sticky top-0 z-50 bg-[#1A1D23]/95 backdrop-blur-md border-b border-[#2D3139]">
          <div className="max-w-7xl mx-auto flex h-16 items-center gap-4 px-4 md:px-8">
            <Skeleton className="h-6 w-6 bg-[#4A4E57]" />
            <Skeleton className="h-6 w-32 bg-[#4A4E57]" />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          <Skeleton className="h-96 w-full bg-[#4A4E57] rounded-xl" />
        </main>
      </div>
    );
  }

  const actionPlans = (inspection as any)?.actionPlans || [];

  return (
    <div className="min-h-screen bg-[#1A1D23] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1A1D23]/95 backdrop-blur-md border-b border-[#2D3139]">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="text-white hover:bg-[#2D3139]" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#FFD100] rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-[#1A1D23] stroke-[3]" />
              </div>
              <span className="font-bold">Inspeção</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              (inspection as any)?.status === "completed" 
                ? "bg-[#34C759]/20 text-[#34C759]" 
                : "bg-[#8B9099]/20 text-[#8B9099]"
            }`}>
              {(inspection as any)?.status === "completed" ? "Concluída" : "Rascunho"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="button-save"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
            {(inspection as any)?.status !== "completed" && (
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="bg-[#34C759] text-white hover:bg-[#2da94d]"
                data-testid="button-complete"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-[#2D3139] border border-white/5 p-1">
            <TabsTrigger value="info" className="data-[state=active]:bg-[#FFD100] data-[state=active]:text-[#1A1D23]" data-testid="tab-info">
              <FileText className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:bg-[#FFD100] data-[state=active]:text-[#1A1D23]" data-testid="tab-checklist">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="photos" className="data-[state=active]:bg-[#FFD100] data-[state=active]:text-[#1A1D23]" data-testid="tab-photos">
              <Camera className="h-4 w-4 mr-2" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-[#FFD100] data-[state=active]:text-[#1A1D23]" data-testid="tab-actions">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Ações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="bg-[#2D3139] rounded-xl border border-white/5 p-6">
              <h2 className="font-bold text-lg mb-1">Informações da Inspeção</h2>
              <p className="text-sm text-[#8B9099] mb-6">Dados gerais sobre a inspeção</p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Nome da inspeção"
                    className="bg-[#1A1D23] border-white/10 text-white placeholder:text-[#8B9099]"
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white">Local</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Local da inspeção"
                    className="bg-[#1A1D23] border-white/10 text-white placeholder:text-[#8B9099]"
                    data-testid="input-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspector" className="text-white">Inspetor</Label>
                  <Input
                    id="inspector"
                    value={formData.inspectorName}
                    onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                    placeholder="Nome do inspetor"
                    className="bg-[#1A1D23] border-white/10 text-white placeholder:text-[#8B9099]"
                    data-testid="input-inspector"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Score</Label>
                  <div className="h-10 px-3 py-2 rounded-md bg-[#1A1D23] border border-white/10 flex items-center">
                    <span className="font-bold text-[#FFD100]">{calculateScore()}%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations" className="text-white">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observações gerais sobre a inspeção..."
                  rows={4}
                  className="bg-[#1A1D23] border-white/10 text-white placeholder:text-[#8B9099]"
                  data-testid="input-observations"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checklist">
            <div className="space-y-4">
              {(nrChecklists as any[])?.map((nr: any) => (
                <div key={nr.id} className="bg-[#2D3139] rounded-xl border border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-[#FFD100]/20 text-[#FFD100] rounded text-sm font-bold">
                        {nr.nrNumber}
                      </div>
                      <h3 className="font-bold">{nr.nrName}</h3>
                    </div>
                    <p className="text-sm text-[#8B9099] mt-1">{nr.category}</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {(nr.items as any[])?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[#1A1D23] hover:bg-[#1A1D23]/80 transition-colors"
                      >
                        <Checkbox
                          id={item.id}
                          checked={checklistData[nr.nrNumber]?.[item.id] || false}
                          onCheckedChange={(checked) =>
                            handleChecklistChange(nr.nrNumber, item.id, !!checked)
                          }
                          className="border-white/30 data-[state=checked]:bg-[#34C759] data-[state=checked]:border-[#34C759]"
                          data-testid={`checkbox-${item.id}`}
                        />
                        <Label htmlFor={item.id} className="flex-1 cursor-pointer text-white/90">
                          {item.text}
                          {item.required && (
                            <span className="text-[#FF3B30] ml-1">*</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <div className="bg-[#2D3139] rounded-xl border border-white/5 p-6">
              <h2 className="font-bold text-lg mb-1">Fotos da Inspeção</h2>
              <p className="text-sm text-[#8B9099] mb-6">Registre evidências fotográficas</p>
              
              <div className="text-center py-16">
                <Camera className="h-16 w-16 mx-auto mb-4 text-[#4A4E57]" />
                <p className="text-[#8B9099] mb-2">Funcionalidade de upload de fotos em desenvolvimento</p>
                <p className="text-sm text-[#4A4E57]">Em breve você poderá anexar fotos às inspeções</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions">
            <div className="bg-[#2D3139] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">Planos de Ação</h2>
                  <p className="text-sm text-[#8B9099]">Ações corretivas para não conformidades</p>
                </div>
                <Button
                  onClick={() => generateAIMutation.mutate()}
                  disabled={generateAIMutation.isPending}
                  className="bg-[#FFD100] text-[#1A1D23] hover:bg-[#E6BC00] font-bold"
                  data-testid="button-generate-ai"
                >
                  {generateAIMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <div className="p-5">
                {actionPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-[#4A4E57]" />
                    <p className="text-[#8B9099] mb-2">Nenhum plano de ação ainda</p>
                    <p className="text-sm text-[#4A4E57]">Clique em "Gerar com IA" para criar planos automaticamente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actionPlans.map((plan: any) => (
                      <div key={plan.id} className="bg-[#1A1D23] rounded-xl p-4 border border-white/5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                                plan.priority === "high"
                                  ? "bg-[#FF3B30]/20 text-[#FF3B30]"
                                  : plan.priority === "medium"
                                  ? "bg-[#FFD100]/20 text-[#FFD100]"
                                  : "bg-[#8B9099]/20 text-[#8B9099]"
                              }`}>
                                {plan.priority === "high" ? "Alta" : plan.priority === "medium" ? "Média" : "Baixa"}
                              </div>
                              {plan.aiGenerated && (
                                <div className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white/70 flex items-center gap-1">
                                  <Brain className="h-3 w-3" />
                                  IA
                                </div>
                              )}
                            </div>
                            <h4 className="font-medium mb-1">{plan.issue}</h4>
                            <p className="text-sm text-[#8B9099]">{plan.recommendation}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            plan.status === "completed" 
                              ? "bg-[#34C759]/20 text-[#34C759]" 
                              : "bg-[#8B9099]/20 text-[#8B9099]"
                          }`}>
                            {plan.status === "completed" ? "Concluído" : "Pendente"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 pt-8 border-t border-white/10">
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-[#FF3B30] hover:bg-[#d63129]"
            data-testid="button-delete"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Inspeção
          </Button>
        </div>
      </main>
    </div>
  );
}
