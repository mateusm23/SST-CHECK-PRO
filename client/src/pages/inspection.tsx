import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
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
import { ThemeToggle } from "@/components/theme-toggle";
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

  useState(() => {
    if (inspection) {
      setFormData({
        title: inspection.title || "",
        location: inspection.location || "",
        inspectorName: inspection.inspectorName || "",
        observations: inspection.observations || "",
      });
      if (inspection.checklistData) {
        setChecklistData(inspection.checklistData as Record<string, Record<string, boolean>>);
      }
    }
  });

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
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center gap-4 px-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  const actionPlans = (inspection as any)?.actionPlans || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Inspeção</span>
            </div>
            <Badge variant={inspection?.status === "completed" ? "default" : "secondary"}>
              {inspection?.status === "completed" ? "Concluída" : "Rascunho"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
            {inspection?.status !== "completed" && (
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                data-testid="button-complete"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info" data-testid="tab-info">
              <FileText className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="checklist" data-testid="tab-checklist">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="photos" data-testid="tab-photos">
              <Camera className="h-4 w-4 mr-2" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Ações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Inspeção</CardTitle>
                <CardDescription>Dados gerais sobre a inspeção</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Nome da inspeção"
                      data-testid="input-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Local</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Local da inspeção"
                      data-testid="input-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspector">Inspetor</Label>
                    <Input
                      id="inspector"
                      value={formData.inspectorName}
                      onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                      placeholder="Nome do inspetor"
                      data-testid="input-inspector"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Score</Label>
                    <div className="h-9 px-3 py-2 border rounded-md bg-muted flex items-center">
                      <span className="font-medium">{calculateScore()}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Observações gerais sobre a inspeção..."
                    rows={4}
                    data-testid="input-observations"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist">
            <div className="space-y-4">
              {(nrChecklists as any[])?.map((nr: any) => (
                <Card key={nr.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline">{nr.nrNumber}</Badge>
                      {nr.nrName}
                    </CardTitle>
                    <CardDescription>{nr.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(nr.items as any[])?.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                        >
                          <Checkbox
                            id={item.id}
                            checked={checklistData[nr.nrNumber]?.[item.id] || false}
                            onCheckedChange={(checked) =>
                              handleChecklistChange(nr.nrNumber, item.id, !!checked)
                            }
                            data-testid={`checkbox-${item.id}`}
                          />
                          <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                            {item.text}
                            {item.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Fotos da Inspeção</CardTitle>
                <CardDescription>Registre evidências fotográficas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidade de upload de fotos em desenvolvimento</p>
                  <p className="text-sm">Em breve você poderá anexar fotos às inspeções</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Planos de Ação</CardTitle>
                  <CardDescription>Ações corretivas para não conformidades</CardDescription>
                </div>
                <Button
                  onClick={() => generateAIMutation.mutate()}
                  disabled={generateAIMutation.isPending}
                  data-testid="button-generate-ai"
                >
                  {generateAIMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
              </CardHeader>
              <CardContent>
                {actionPlans.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum plano de ação ainda</p>
                    <p className="text-sm">Clique em "Gerar com IA" para criar planos automaticamente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actionPlans.map((plan: any) => (
                      <Card key={plan.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant={
                                    plan.priority === "high"
                                      ? "destructive"
                                      : plan.priority === "medium"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {plan.priority === "high"
                                    ? "Alta"
                                    : plan.priority === "medium"
                                    ? "Média"
                                    : "Baixa"}
                                </Badge>
                                {plan.aiGenerated && (
                                  <Badge variant="outline">
                                    <Brain className="h-3 w-3 mr-1" />
                                    IA
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium mb-1">{plan.issue}</h4>
                              <p className="text-sm text-muted-foreground">{plan.recommendation}</p>
                            </div>
                            <Badge variant={plan.status === "completed" ? "default" : "secondary"}>
                              {plan.status === "completed" ? "Concluído" : "Pendente"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 pt-8 border-t">
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
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
