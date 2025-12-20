import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, 
  Plus, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  ClipboardCheck,
  Settings,
  LogOut,
  Crown,
  ChevronRight
} from "lucide-react";
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
      <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD100]" />
      </div>
    );
  }

  const recentInspections = (inspections as any[])?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-[#1A1D23] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1A1D23]/95 backdrop-blur-md border-b border-[#2D3139]">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFD100] rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-[#1A1D23] stroke-[3]" />
            </div>
            <span className="font-display text-xl tracking-wider">
              SST<span className="text-[#FFD100]">Check</span>Pro
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-[#2D3139]"
              asChild
              data-testid="button-settings"
            >
              <Link href="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-[#2D3139]"
              onClick={() => logout()} 
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Welcome & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Olá, {user?.firstName || "Usuário"}!
            </h1>
            <p className="text-[#8B9099]">
              Gerencie suas inspeções de segurança do trabalho
            </p>
          </div>
          <div className="flex items-center gap-3">
            {subscription && (
              <div className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 ${
                subscription.plan?.slug === "free" 
                  ? "bg-[#2D3139] text-[#8B9099]" 
                  : "bg-[#FFD100]/20 text-[#FFD100]"
              }`}>
                {subscription.plan?.slug !== "free" && <Crown className="h-3.5 w-3.5" />}
                {subscription.plan?.name}
              </div>
            )}
            <Button 
              onClick={() => createInspectionMutation.mutate()}
              disabled={createInspectionMutation.isPending}
              className="bg-[#FFD100] text-[#1A1D23] hover:bg-[#E6BC00] font-bold"
              data-testid="button-new-inspection"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Inspeção
            </Button>
          </div>
        </div>

        {/* Upgrade Banner */}
        {subscription?.plan?.slug === "free" && (
          <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-[#FFD100]/20 to-[#FFD100]/5 border border-[#FFD100]/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FFD100] rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-[#1A1D23]" />
                </div>
                <div>
                  <p className="font-semibold">Faça upgrade para mais inspeções</p>
                  <p className="text-sm text-[#8B9099]">
                    Você usou {subscription.usage?.inspectionsThisMonth || 0} de {subscription.plan?.monthlyLimit} inspeção este mês
                  </p>
                </div>
              </div>
              <Link href="/pricing">
                <Button className="bg-[#FFD100] text-[#1A1D23] hover:bg-[#E6BC00] font-bold" data-testid="button-upgrade">
                  Ver Planos
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total de Inspeções", value: stats?.totalInspections || 0, icon: FileText },
            { label: "Concluídas Este Mês", value: stats?.completedThisMonth || 0, icon: ClipboardCheck },
            { label: "Ações Pendentes", value: stats?.pendingActionPlans || 0, icon: AlertTriangle },
            { label: "Score Médio", value: `${stats?.averageScore || 0}%`, icon: TrendingUp },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-[#2D3139] rounded-xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#8B9099] uppercase tracking-wide">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-[#8B9099]" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16 bg-[#4A4E57]" />
              ) : (
                <div className="text-2xl font-bold text-[#FFD100]">{stat.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Inspections */}
          <div className="bg-[#2D3139] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="font-bold text-lg">Inspeções Recentes</h2>
              <p className="text-sm text-[#8B9099]">Suas últimas inspeções de segurança</p>
            </div>
            <div className="p-5">
              {inspectionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full bg-[#4A4E57] rounded-lg" />
                  ))}
                </div>
              ) : recentInspections.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-[#4A4E57]" />
                  <p className="text-[#8B9099] mb-2">Nenhuma inspeção ainda</p>
                  <Button 
                    variant="link" 
                    className="text-[#FFD100]"
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
                      className="flex items-center justify-between p-4 rounded-lg bg-[#1A1D23] border border-white/5 hover:border-[#FFD100]/50 transition-all cursor-pointer group"
                      data-testid={`link-inspection-${inspection.id}`}
                    >
                      <div>
                        <p className="font-medium group-hover:text-[#FFD100] transition-colors">{inspection.title}</p>
                        <p className="text-sm text-[#8B9099]">
                          {new Date(inspection.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        inspection.status === "completed" 
                          ? "bg-[#34C759]/20 text-[#34C759]" 
                          : "bg-[#8B9099]/20 text-[#8B9099]"
                      }`}>
                        {inspection.status === "completed" ? "Concluída" : "Rascunho"}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-[#2D3139] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="font-bold text-lg">Seu Plano</h2>
              <p className="text-sm text-[#8B9099]">Informações da sua assinatura</p>
            </div>
            <div className="p-5">
              {subLoading ? (
                <Skeleton className="h-40 w-full bg-[#4A4E57] rounded-lg" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-[#8B9099]">Plano atual</span>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      subscription?.plan?.slug === "free" 
                        ? "bg-[#8B9099]/20 text-[#8B9099]" 
                        : "bg-[#FFD100]/20 text-[#FFD100]"
                    }`}>
                      {subscription?.plan?.name}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-[#8B9099]">Inspeções este mês</span>
                    <span className="font-semibold">
                      {subscription?.usage?.inspectionsThisMonth || 0} / {subscription?.plan?.monthlyLimit === -1 ? "Ilimitado" : subscription?.plan?.monthlyLimit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-[#8B9099]">Logo personalizada</span>
                    <span className={`font-semibold ${subscription?.plan?.canUploadLogo ? "text-[#34C759]" : "text-[#8B9099]"}`}>
                      {subscription?.plan?.canUploadLogo ? "Sim" : "Não"}
                    </span>
                  </div>
                  <div className="pt-4">
                    {subscription?.plan?.slug === "free" ? (
                      <Link href="/pricing">
                        <Button className="w-full bg-[#FFD100] text-[#1A1D23] hover:bg-[#E6BC00] font-bold" data-testid="button-upgrade-plan">
                          Fazer Upgrade
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full border-white/20 text-white hover:bg-white/10"
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
