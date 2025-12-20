import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ClipboardCheck, FileText, Brain, Check, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: ClipboardCheck,
    title: "Checklists de NRs",
    description: "NR-6, NR-10, NR-12, NR-35 e muito mais. Checklists prontos e personalizáveis.",
  },
  {
    icon: FileText,
    title: "Relatórios PDF",
    description: "Gere laudos profissionais com logo da empresa, fotos e estatísticas.",
  },
  {
    icon: Brain,
    title: "IA para Planos de Ação",
    description: "Gemini AI analisa sua inspeção e sugere planos de ação específicos.",
  },
  {
    icon: Shield,
    title: "Conformidade Legal",
    description: "Mantenha sua empresa em conformidade com as normas regulamentadoras.",
  },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "Para experimentar a plataforma",
    features: ["1 inspeção por mês", "Checklists básicos", "Relatório PDF simples"],
    cta: "Começar Grátis",
    popular: false,
  },
  {
    name: "Profissional",
    price: "R$ 49,90",
    period: "/mês",
    description: "Para profissionais de SST",
    features: [
      "30 inspeções por mês",
      "Todos os checklists de NRs",
      "Upload de logo personalizada",
      "Planos de ação com IA",
      "Suporte prioritário",
    ],
    cta: "Assinar Agora",
    popular: true,
  },
  {
    name: "Negócios",
    price: "R$ 149,90",
    period: "/mês",
    description: "Para empresas e consultorias",
    features: [
      "Inspeções ilimitadas",
      "Múltiplas empresas",
      "API de integração",
      "Dashboard avançado",
      "Suporte dedicado",
    ],
    cta: "Falar com Vendas",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">SST Check Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild data-testid="link-login">
              <a href="/api/login">Entrar</a>
            </Button>
            <Button asChild data-testid="link-signup">
              <a href="/api/login">Começar Grátis</a>
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            Plataforma de Inspeção de Segurança do Trabalho
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Inspeções de Segurança{" "}
            <span className="text-primary">Mais Rápidas e Inteligentes</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Digitalize suas inspeções de SST com checklists de NRs, fotos, relatórios PDF profissionais 
            e planos de ação gerados por Inteligência Artificial.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild data-testid="button-hero-cta">
              <a href="/api/login">
                Começar Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" data-testid="button-hero-demo">
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tudo que você precisa para inspeções de SST
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Planos e Preços</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Escolha o plano ideal para suas necessidades. Cancele quando quiser.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={plan.popular ? "border-primary shadow-lg relative" : ""}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    <a href="/api/login">{plan.cta}</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">SST Check Pro</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 SST Check Pro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
