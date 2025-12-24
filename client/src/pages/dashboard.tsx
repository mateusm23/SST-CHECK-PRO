import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Plus,
  FileText,
  TrendingUp,
  Edit3,
  LogOut,
  Crown,
  ChevronRight,
  AlertTriangle,
  X,
  Eye,
  Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: subscription } = useQuery<{
    plan?: { slug?: string; name?: string; monthlyLimit?: number };
    usage?: { inspectionsThisMonth?: number };
    isVIP?: boolean;
  }>({
    queryKey: ["/api/subscription"],
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery<any[]>({
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
      if (error.message?.includes("limit") || error.message?.includes("Limite")) {
        setShowLimitModal(true);
      } else {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível criar a inspeção",
          variant: "destructive",
        });
      }
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/checkout", { planSlug: "professional" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/inspections/${id}`, {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setDeleteConfirm(null);
      toast({
        title: "Sucesso",
        description: "Inspeção deletada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível deletar a inspeção",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD100]" />
      </div>
    );
  }

  const allInspections = inspections || [];
  const completedInspections = allInspections.filter((i) => i.status === "completed");
  const draftInspections = allInspections.filter((i) => i.status !== "completed");
  
  const averageScore = completedInspections.length > 0
    ? Math.round(completedInspections.reduce((acc, i) => acc + (i.score || 0), 0) / completedInspections.length)
    : 0;

  const isLimitReached = subscription?.plan?.slug === "free" && 
    (subscription?.usage?.inspectionsThisMonth || 0) >= (subscription?.plan?.monthlyLimit || 1);

  const handleNewInspection = () => {
    if (isLimitReached) {
      setShowLimitModal(true);
    } else {
      createInspectionMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="text-gray-400 hover:text-gray-600"
                data-testid="button-close-modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Limite de Inspeções Atingido
            </h2>
            <p className="text-gray-600 mb-6">
              Você já realizou sua inspeção gratuita deste mês. 
              Faça upgrade para o plano Profissional e tenha acesso a <strong>30 inspeções mensais</strong>, 
              planos de ação com IA e muito mais!
            </p>

            <div className="bg-[#FFD100]/10 rounded-xl p-4 mb-6 border border-[#FFD100]/30 relative">
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
                20% OFF
              </div>
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-5 h-5 text-[#FFD100]" />
                <span className="font-bold text-gray-900">Plano Profissional</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">R$ 9,00<span className="text-sm font-normal text-gray-500">/mês</span></p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 30 inspeções por mês</li>
                <li>• Planos de ação com IA</li>
                <li>• Logo personalizada nos PDFs</li>
              </ul>
            </div>

            <Button 
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="w-full bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold py-6 text-lg mb-3"
              data-testid="button-upgrade-modal"
            >
              {checkoutMutation.isPending ? "Redirecionando..." : "Fazer Upgrade Agora"}
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => setShowLimitModal(false)}
              className="w-full text-gray-500"
              data-testid="button-later"
            >
              Talvez depois
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1a1d23] text-white">
        <div className="max-w-[600px] mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFD100] rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-[#1a1d23] stroke-[3]" />
            </div>
            <span className="font-bold text-lg">
              SST<span className="text-[#FFD100]">Check</span>Pro
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                data-testid="button-pricing"
              >
                <Crown className="h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10"
              onClick={() => logout()} 
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Olá, {user?.firstName || "Usuário"}!
          </h1>
          <p className="text-gray-500">
            Gerencie suas inspeções de segurança
          </p>
        </div>

        {/* New Inspection Button */}
        <Button 
          onClick={handleNewInspection}
          disabled={createInspectionMutation.isPending}
          className="w-full bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold py-6 text-lg mb-6 rounded-xl"
          data-testid="button-new-inspection"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Inspeção
        </Button>

        {/* Stats - 3 Simple Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <FileText className="w-6 h-6 mx-auto mb-2 text-green-500" />
            {inspectionsLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <div className="text-2xl font-bold text-gray-900" data-testid="stat-completed">
                {completedInspections.length}
              </div>
            )}
            <div className="text-xs text-gray-500 uppercase font-medium">Finalizadas</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <Edit3 className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            {inspectionsLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <div className="text-2xl font-bold text-gray-900" data-testid="stat-drafts">
                {draftInspections.length}
              </div>
            )}
            <div className="text-xs text-gray-500 uppercase font-medium">Rascunhos</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            {inspectionsLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <div className="text-2xl font-bold text-gray-900" data-testid="stat-score">
                {averageScore}%
              </div>
            )}
            <div className="text-xs text-gray-500 uppercase font-medium">Score Médio</div>
          </div>
        </div>

        {/* Plan Badge */}
        {subscription && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
            subscription.plan?.slug === "free" 
              ? "bg-gray-100 border border-gray-200" 
              : "bg-[#FFD100]/10 border border-[#FFD100]/30"
          }`}>
            <div className="flex items-center gap-3">
              <Crown className={`w-5 h-5 ${subscription.plan?.slug === "free" ? "text-gray-400" : "text-[#FFD100]"}`} />
              <div>
                <div className="font-semibold text-gray-900">{subscription.plan?.name}</div>
                <div className="text-sm text-gray-500">
                  {subscription.usage?.inspectionsThisMonth || 0} / {subscription.plan?.monthlyLimit === -1 ? "∞" : subscription.plan?.monthlyLimit} inspeções este mês
                </div>
              </div>
            </div>
            {subscription.plan?.slug === "free" && (
              <Link href="/pricing">
                <Button size="sm" className="bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00] font-bold" data-testid="button-upgrade">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Inspections List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Suas Inspeções</h2>
          </div>
          
          {inspectionsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : allInspections.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">Nenhuma inspeção ainda</p>
              <Button
                variant="ghost"
                className="text-[#FFD100]"
                onClick={handleNewInspection}
                data-testid="button-create-first"
              >
                Criar sua primeira inspeção
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {allInspections.map((inspection: any) => {
                const isCompleted = inspection.status === "completed";
                return (
                  <div key={inspection.id}>
                    <Link
                      href={isCompleted ? `/inspection/${inspection.id}/view` : `/inspection/${inspection.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      data-testid={`link-inspection-${inspection.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isCompleted ? "bg-green-100" : "bg-orange-100"
                        }`}>
                          {isCompleted ? (
                            <Eye className="w-5 h-5 text-green-600" />
                          ) : (
                            <Edit3 className="w-5 h-5 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{inspection.title || "Inspeção"}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(inspection.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isCompleted 
                            ? "bg-green-100 text-green-700" 
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {isCompleted ? "Finalizada" : "Rascunho"}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>

                    {/* Delete Confirmation */}
                    {deleteConfirm === inspection.id && (
                      <div className="bg-red-50 border-t border-red-200 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-red-700 font-medium">Deseja deletar esta inspeção?</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-900"
                            data-testid={`button-cancel-delete-${inspection.id}`}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-500 text-white hover:bg-red-600"
                            onClick={() => deleteInspectionMutation.mutate(inspection.id)}
                            disabled={deleteInspectionMutation.isPending}
                            data-testid={`button-confirm-delete-${inspection.id}`}
                          >
                            {deleteInspectionMutation.isPending ? "Deletando..." : "Deletar"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Delete Button (visible when not confirming) */}
                    {deleteConfirm !== inspection.id && (
                      <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(inspection.id)}
                          data-testid={`button-delete-${inspection.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Deletar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
