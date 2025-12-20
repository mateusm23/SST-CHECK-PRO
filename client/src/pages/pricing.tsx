import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href={isAuthenticated ? "/dashboard" : "/"}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">SST Check Pro</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Escolha seu Plano</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Selecione o plano ideal para suas necessidades. Você pode fazer upgrade ou cancelar a qualquer momento.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {(plans as any[])?.map((plan: any) => {
              const details = planDetails.find((d) => d.slug === plan.slug);
              const isCurrentPlan = currentSubscription?.plan?.slug === plan.slug;
              const isPopular = plan.slug === "professional";

              return (
                <Card
                  key={plan.id}
                  className={isPopular ? "border-primary shadow-lg relative" : ""}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Mais Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        {plan.price === 0 ? "Grátis" : formatPrice(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">/mês</span>
                      )}
                    </div>
                    <CardDescription>
                      {plan.monthlyLimit === -1
                        ? "Inspeções ilimitadas"
                        : `${plan.monthlyLimit} inspeção${plan.monthlyLimit > 1 ? "s" : ""} por mês`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {details?.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Plano Atual
                      </Button>
                    ) : plan.slug === "free" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        asChild
                        data-testid={`button-select-${plan.slug}`}
                      >
                        <Link href={isAuthenticated ? "/dashboard" : "/api/login"}>
                          {isAuthenticated ? "Ir para Dashboard" : "Começar Grátis"}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => checkoutMutation.mutate(plan.slug)}
                        disabled={checkoutMutation.isPending || !isAuthenticated}
                        data-testid={`button-select-${plan.slug}`}
                      >
                        {!isAuthenticated ? (
                          <Link href="/api/login">Fazer Login</Link>
                        ) : checkoutMutation.isPending ? (
                          "Processando..."
                        ) : (
                          "Assinar Agora"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
