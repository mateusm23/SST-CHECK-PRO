import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  Plus, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  ClipboardCheck,
  Settings,
  LogOut,
  Crown
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["/api/subscription"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery({
    queryKey: ["/api/inspections"],
  });

  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inspections", {
        title: `Inspeção ${new Date().toLocaleDateString("pt-BR")}`,
        status: "draft",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setLocation(`/inspection/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a inspeção",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/portal");
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const recentInspections = (inspections as any[])?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">SST Check Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild data-testid="button-settings">
              <Link href="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {user?.firstName || "Usuário"}!
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas inspeções de segurança do trabalho
            </p>
          </div>
          <div className="flex items-center gap-2">
            {subscription && (
              <Badge 
                variant={subscription.plan?.slug === "free" ? "secondary" : "default"}
                className="gap-1"
              >
                {subscription.plan?.slug !== "free" && <Crown className="h-3 w-3" />}
                {subscription.plan?.name}
              </Badge>
            )}
            <Button 
              onClick={() => createInspectionMutation.mutate()}
              disabled={createInspectionMutation.isPending}
              data-testid="button-new-inspection"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Inspeção
            </Button>
          </div>
        </div>

        {subscription?.plan?.slug === "free" && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Faça upgrade para mais inspeções</p>
                  <p className="text-sm text-muted-foreground">
                    Você usou {subscription.usage?.inspectionsThisMonth || 0} de {subscription.plan?.monthlyLimit} inspeções este mês
                  </p>
                </div>
              </div>
              <Button asChild data-testid="button-upgrade">
                <Link href="/pricing">Ver Planos</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Total de Inspeções</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalInspections || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas Este Mês</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.completedThisMonth || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Ações Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.pendingActionPlans || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.averageScore || 0}%</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspeções Recentes</CardTitle>
              <CardDescription>Suas últimas inspeções de segurança</CardDescription>
            </CardHeader>
            <CardContent>
              {inspectionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentInspections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma inspeção ainda</p>
                  <Button 
                    variant="link" 
                    onClick={() => createInspectionMutation.mutate()}
                    data-testid="button-create-first"
                  >
                    Criar sua primeira inspeção
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentInspections.map((inspection: any) => (
                    <Link
                      key={inspection.id}
                      href={`/inspection/${inspection.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                      data-testid={`link-inspection-${inspection.id}`}
                    >
                      <div>
                        <p className="font-medium">{inspection.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(inspection.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant={inspection.status === "completed" ? "default" : "secondary"}>
                        {inspection.status === "completed" ? "Concluída" : "Rascunho"}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seu Plano</CardTitle>
              <CardDescription>Informações da sua assinatura</CardDescription>
            </CardHeader>
            <CardContent>
              {subLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plano atual</span>
                    <Badge variant={subscription?.plan?.slug === "free" ? "secondary" : "default"}>
                      {subscription?.plan?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Inspeções este mês</span>
                    <span className="font-medium">
                      {subscription?.usage?.inspectionsThisMonth || 0} / {subscription?.plan?.monthlyLimit === -1 ? "Ilimitado" : subscription?.plan?.monthlyLimit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Logo personalizada</span>
                    <span className="font-medium">
                      {subscription?.plan?.canUploadLogo ? "Sim" : "Não"}
                    </span>
                  </div>
                  <div className="pt-4 space-y-2">
                    {subscription?.plan?.slug === "free" ? (
                      <Button className="w-full" asChild data-testid="button-upgrade-plan">
                        <Link href="/pricing">Fazer Upgrade</Link>
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                        data-testid="button-manage-subscription"
                      >
                        Gerenciar Assinatura
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
