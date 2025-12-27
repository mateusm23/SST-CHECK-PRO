import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Smartphone, Crown } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const planDetails = [
  {
    slug: "free",
    features: [
      "1 laudo por mês",
      "Checklists de NRs",
      "Upload de fotos com GPS",
      "PDF com marca d'água",
      "Modo offline",
      "Suporte por email"
    ],
  },
  {
    slug: "professional",
    features: [
      "30 laudos por mês",
      "Todos os checklists de NRs",
      "Upload de fotos com GPS",
      "PDF sem marca d'água",
      "Logo da sua empresa",
      "Planos de ação inteligentes",
      "Dashboard com métricas",
      "Modo offline",
      "Suporte prioritário"
    ],
  },
  {
    slug: "business",
    features: [
      "Laudos ilimitados",
      "Múltiplas empresas/CNPJs",
      "Todos os checklists de NRs",
      "Upload de fotos com GPS",
      "PDF sem marca d'água + Logo",
      "Planos de ação inteligentes",
      "API de integração",
      "Dashboard avançado",
      "Modo offline",
      "Suporte dedicado"
    ],
  },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: currentSubscription } = useQuery<{ plan?: { slug: string } }>({
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
        title: "Erro ao processar pagamento",
        description: error.message || "Tente novamente ou entre em contato com o suporte",
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

  const getDisplayPrice = (plan: any) => {
    if (plan.price === 0) return 'Grátis';
    return formatPrice(plan.price);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a1d23] text-white">
        <div className="max-w-[600px] mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href={isAuthenticated ? "/dashboard" : "/"}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFD100] rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-[#1a1d23] stroke-[3]" />
              </div>
              <span className="font-bold text-lg">
                SST<span className="text-[#FFD100]">Check</span>Pro
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#FFD100] text-[#1a1d23] px-4 py-1.5 rounded-full font-bold text-sm uppercase tracking-wider mb-4">
            <Crown className="w-4 h-4" />
            Planos e Preços
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Escolha seu Plano
          </h1>
          <p className="text-gray-500">
            Selecione o plano ideal para suas necessidades
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD100]" />
          </div>
        ) : (
          <div className="space-y-4">
            {(plans as any[])?.map((plan: any) => {
              const details = planDetails.find((d) => d.slug === plan.slug);
              const isCurrentPlan = currentSubscription?.plan?.slug === plan.slug;
              const isPopular = plan.slug === "professional";

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl shadow-sm overflow-hidden ${
                    isPopular ? "ring-2 ring-[#FFD100]" : ""
                  }`}
                >
                  {plan.price > 0 && (
                    <div className="bg-red-500 text-white text-center py-1.5 text-xs font-bold uppercase tracking-wide">
                      20% de Desconto
                    </div>
                  )}
                  {isPopular && !plan.price && (
                    <div className="bg-[#FFD100] text-[#1a1d23] text-center py-1.5 text-xs font-bold uppercase tracking-wide">
                      Mais Popular
                    </div>
                  )}
                  {isPopular && plan.price > 0 && (
                    <div className="bg-[#FFD100] text-[#1a1d23] text-center py-1.5 text-xs font-bold uppercase tracking-wide">
                      Mais Popular
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                        <p className="text-sm text-gray-500">
                          {plan.monthlyLimit === -1
                            ? "Inspeções ilimitadas"
                            : `${plan.monthlyLimit} inspeção${plan.monthlyLimit > 1 ? "s" : ""} por mês`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">
                          {getDisplayPrice(plan)}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-sm text-gray-500">/mês</span>
                        )}
                      </div>
                    </div>
                    
                    <ul className="space-y-2 mb-4">
                      {details?.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-green-600 stroke-[3]" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    {isCurrentPlan ? (
                      <Button 
                        variant="secondary" 
                        className="w-full bg-gray-100 text-gray-500 cursor-default" 
                        disabled
                      >
                        Plano Atual
                      </Button>
                    ) : plan.slug === "free" ? (
                      <Link href={isAuthenticated ? "/dashboard" : "/api/auth/google"}>
                        <Button
                          variant="outline"
                          className="w-full border-gray-300 text-gray-700"
                          data-testid={`button-select-${plan.slug}`}
                        >
                          {isAuthenticated ? "Ir para Dashboard" : "Começar Grátis"}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        className={`w-full font-bold ${
                          isPopular
                            ? "bg-[#FFD100] text-[#1a1d23] hover:bg-[#E6BC00]"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          // Track InitiateCheckout event
                          if (typeof window !== 'undefined' && (window as any).gtag) {
                            (window as any).gtag('event', 'begin_checkout', {
                              currency: 'BRL',
                              value: plan.price / 100,
                              items: [{
                                item_id: plan.slug,
                                item_name: plan.name,
                                price: plan.price / 100
                              }]
                            });
                          }

                          // Meta Pixel - InitiateCheckout
                          if (typeof window !== 'undefined' && (window as any).fbq) {
                            (window as any).fbq('track', 'InitiateCheckout', {
                              currency: 'BRL',
                              value: plan.price / 100
                            });
                          }

                          // Se usuário estiver logado, usa API de checkout (com metadata do userId)
                          if (isAuthenticated) {
                            console.log('Usuário logado - usando API de checkout para plano:', plan.slug);
                            checkoutMutation.mutate(plan.slug);
                          } else {
                            // Usuário não logado - redireciona para login primeiro
                            console.log('Usuário não logado - redirecionando para login');
                            toast({
                              title: "Login necessário",
                              description: "Faça login para continuar com a assinatura",
                            });
                            // Salva o plano desejado no localStorage para redirecionar após login
                            localStorage.setItem('pendingPlanSlug', plan.slug);
                            window.location.href = '/api/auth/google';
                          }
                        }}
                        data-testid={`button-select-${plan.slug}`}
                        type="button"
                      >
                        Assinar Agora
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Dúvidas?</h2>
            <p className="text-gray-500 mb-4 text-sm">
              Nossa equipe está pronta para ajudar você
            </p>
            <Button 
              variant="outline" 
              className="border-[#FFD100] text-[#1a1d23] hover:bg-[#FFD100]"
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
