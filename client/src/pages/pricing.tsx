import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const planDetails = [
  {
    slug: "free",
    features: ["1 inspeção por mês", "Checklists básicos", "Relatório PDF simples"],
  },
  {
    slug: "professional",
    features: [
      "30 inspeções por mês",
      "Todos os checklists de NRs",
      "Upload de logo personalizada",
      "Planos de ação com IA",
      "Suporte prioritário",
    ],
  },
  {
    slug: "business",
    features: [
      "Inspeções ilimitadas",
      "Múltiplas empresas",
      "API de integração",
      "Dashboard avançado",
      "Suporte dedicado",
    ],
  },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planSlug: string) => {
      const res = await apiRequest("POST", "/api/subscription/checkout", { planSlug });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  return (
    <div className="min-h-screen bg-[#1A1D23] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1A1D23]/95 backdrop-blur-md border-b border-[#2D3139]">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <Link href={isAuthenticated ? "/dashboard" : "/"}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-[#2D3139]" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFD100] rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-[#1A1D23] stroke-[3]" />
              </div>
              <span className="font-display text-xl tracking-wider">
                SST<span className="text-[#FFD100]">Check</span>Pro
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-16">
          <div className="inline-block bg-[#FFD100] text-[#1A1D23] px-4 py-1.5 rounded font-bold text-sm uppercase tracking-wider mb-4">
            Planos e Preços
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
            ESCOLHA SEU PLANO
          </h1>
          <p className="text-[#8B9099] text-lg max-w-2xl mx-auto">
            Selecione o plano ideal para suas necessidades. Você pode fazer upgrade ou cancelar a qualquer momento.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD100]" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {(plans as any[])?.map((plan: any) => {
              const details = planDetails.find((d) => d.slug === plan.slug);
              const isCurrentPlan = currentSubscription?.plan?.slug === plan.slug;
              const isPopular = plan.slug === "professional";

              return (
                <div
                  key={plan.id}
                  className={`relative bg-[#2D3139] rounded-2xl border transition-all ${
                    isPopular 
                      ? "border-[#FFD100] shadow-lg shadow-[#FFD100]/10" 
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD100] text-[#1A1D23] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                      Mais Popular
                    </div>
                  )}
                  
                  <div className="p-8 text-center border-b border-white/5">
                    <h3 className="font-bold text-xl mb-4">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="font-display text-5xl text-[#FFD100]">
                        {plan.price === 0 ? "Grátis" : formatPrice(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-[#8B9099]">/mês</span>
                      )}
                    </div>
                    <p className="text-sm text-[#8B9099]">
                      {plan.monthlyLimit === -1
                        ? "Inspeções ilimitadas"
                        : `${plan.monthlyLimit} inspeção${plan.monthlyLimit > 1 ? "s" : ""} por mês`}
                    </p>
                  </div>
                  
                  <div className="p-8">
                    <ul className="space-y-4 mb-8">
                      {details?.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-[#FFD100] rounded flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-[#1A1D23] stroke-[3]" />
                          </div>
                          <span className="text-sm text-[#8B9099]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {isCurrentPlan ? (
                      <Button 
                        variant="secondary" 
                        className="w-full bg-[#4A4E57] text-white cursor-default" 
                        disabled
                      >
                        Plano Atual
                      </Button>
                    ) : plan.slug === "free" ? (
                      <Link href={isAuthenticated ? "/dashboard" : "/api/login"}>
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                          data-testid={`button-select-${plan.slug}`}
                        >
                          {isAuthenticated ? "Ir para Dashboard" : "Começar Grátis"}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        className={`w-full font-bold ${
                          isPopular 
                            ? "bg-[#FFD100] text-[#1A1D23] hover:bg-[#E6BC00]" 
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                        onClick={() => {
                          if (!isAuthenticated) {
                            window.location.href = "/api/login";
                          } else {
                            checkoutMutation.mutate(plan.slug);
                          }
                        }}
                        disabled={checkoutMutation.isPending}
                        data-testid={`button-select-${plan.slug}`}
                      >
                        {checkoutMutation.isPending ? "Processando..." : "Assinar Agora"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-[#FFD100]/20 to-[#FFD100]/5 rounded-2xl p-10 border border-[#FFD100]/30">
            <h2 className="font-display text-3xl mb-4">DÚVIDAS? FALE CONOSCO</h2>
            <p className="text-[#8B9099] mb-6 max-w-xl mx-auto">
              Nossa equipe está pronta para ajudar você a escolher o melhor plano para suas necessidades.
            </p>
            <Button 
              variant="outline" 
              className="border-[#FFD100] text-[#FFD100] hover:bg-[#FFD100] hover:text-[#1A1D23]"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Falar com Consultor
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
