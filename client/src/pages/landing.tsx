import { useEffect, useRef, useState } from "react";
import { Check, Camera, Smartphone, Mail, MapPin, BarChart3, ClipboardList, FileText, HardHat, Shield, AlertTriangle, Lock, Loader2, X } from "lucide-react";
import { SiGoogle } from "react-icons/si";

const features = [
  {
    icon: ClipboardList,
    title: "Checklists Personalizáveis",
    description: "Crie seus próprios formulários de inspeção ou utilize modelos prontos baseados nas NRs. Adapte às necessidades específicas de cada obra.",
  },
  {
    icon: Camera,
    title: "Registro Fotográfico",
    description: "Documente cada não conformidade com fotos direto do celular. Evidências visuais que fortalecem seus laudos técnicos.",
  },
  {
    icon: FileText,
    title: "Relatórios em PDF",
    description: "Gere laudos profissionais automaticamente com logo da empresa, fotos, localização GPS e assinatura digital.",
  },
  {
    icon: Mail,
    title: "Envio Instantâneo",
    description: "Compartilhe relatórios por e-mail ou WhatsApp direto do canteiro de obras. Agilidade na comunicação com a equipe.",
  },
  {
    icon: MapPin,
    title: "Geolocalização",
    description: "Registre automaticamente a localização de cada inspeção. Comprove presença em campo com coordenadas GPS.",
  },
  {
    icon: BarChart3,
    title: "Dashboard de Métricas",
    description: "Acompanhe indicadores de conformidade, evolução das obras e histórico de inspeções em tempo real.",
  },
];

const steps = [
  { number: "1", title: "Selecione o Checklist", description: "Escolha o modelo de inspeção adequado para o tipo de obra ou serviço." },
  { number: "2", title: "Faça a Inspeção", description: "Percorra os itens marcando conformidades e não conformidades." },
  { number: "3", title: "Registre com Fotos", description: "Fotografe as evidências diretamente pelo aplicativo." },
  { number: "4", title: "Gere e Envie", description: "Relatório em PDF pronto para enviar em segundos." },
];

const benefits = [
  { title: "Economia de Tempo", description: "Reduza em até 70% o tempo gasto na elaboração de relatórios." },
  { title: "Profissionalismo", description: "Laudos padronizados com a identidade visual da sua empresa." },
  { title: "Trabalhe Offline", description: "Faça inspeções mesmo sem internet. Sincronize quando conectar." },
  { title: "Histórico Completo", description: "Todas as inspeções armazenadas na nuvem com busca rápida." },
  { title: "Conformidade Legal", description: "Checklists alinhados com as Normas Regulamentadoras vigentes." },
];

const nrs = [
  { number: "NR 1", title: "Disposições Gerais e Gerenciamento de Riscos" },
  { number: "NR 6", title: "Equipamentos de Proteção Individual" },
  { number: "NR 10", title: "Segurança em Instalações Elétricas" },
  { number: "NR 12", title: "Máquinas e Equipamentos" },
  { number: "NR 17", title: "Ergonomia no Trabalho" },
  { number: "NR 18", title: "Construção Civil - Canteiros de Obras" },
  { number: "NR 23", title: "Proteção Contra Incêndios" },
  { number: "NR 33", title: "Espaços Confinados" },
  { number: "NR 35", title: "Trabalho em Altura" },
  { number: "+20", title: "Outros Modelos Disponíveis" },
];

export default function LandingPage() {
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.message || "Erro ao fazer login");
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setLoginError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-8");
          }
        });
      },
      { threshold: 0.1 }
    );

    fadeRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const addFadeRef = (el: HTMLDivElement | null) => {
    if (el && !fadeRefs.current.includes(el)) {
      fadeRefs.current.push(el);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1D23] text-white overflow-x-hidden">
      {/* Safety Stripes */}
      <div className="safety-stripes" />

      {/* Navigation */}
      <nav className="fixed top-2 left-0 right-0 z-50 bg-[#1A1D23]/95 backdrop-blur-md px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FFD100] rounded-lg flex items-center justify-center">
              <Check className="w-7 h-7 text-[#1A1D23] stroke-[3]" />
            </div>
            <span className="font-display text-2xl tracking-wider">
              SST<span className="text-[#FFD100]">Check</span>Pro
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="font-medium hover:text-[#FFD100] transition-colors" data-testid="link-features">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="font-medium hover:text-[#FFD100] transition-colors" data-testid="link-how-it-works">
              Como Funciona
            </a>
            <a href="#beneficios" className="font-medium hover:text-[#FFD100] transition-colors" data-testid="link-benefits">
              Benefícios
            </a>
            <a href="#nrs" className="font-medium hover:text-[#FFD100] transition-colors" data-testid="link-nrs">
              NRs Atendidas
            </a>
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 bg-white text-[#1A1D23] px-5 py-2.5 rounded font-bold tracking-wide hover:bg-gray-100 transition-all hover:-translate-y-0.5"
              data-testid="button-nav-cta"
            >
              <SiGoogle className="w-4 h-4 text-[#4285F4]" />
              Entrar
            </a>
          </div>
          <a
            href="/api/auth/google"
            className="md:hidden inline-flex items-center gap-2 bg-white text-[#1A1D23] px-4 py-2 rounded font-bold text-sm"
            data-testid="button-mobile-cta"
          >
            <SiGoogle className="w-4 h-4 text-[#4285F4]" />
            Entrar
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen pt-32 pb-20 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-bl from-[#2D3139] to-transparent clip-path-hero -z-10" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Hero Content */}
          <div className="animate-slide-left">
            <div className="inline-flex items-center gap-2 bg-[#FFD100]/15 border border-[#FFD100] text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <HardHat className="w-4 h-4" />
              Checklist Digital para Obras
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl leading-none mb-6 tracking-wide">
              INSPEÇÃO DE <span className="text-[#FFD100]">SEGURANÇA</span> NA PALMA DA MÃO
            </h1>
            
            <p className="text-lg text-[#8B9099] mb-8 max-w-lg leading-relaxed">
              Realize visitas técnicas semanais, registre não conformidades com fotos, gere relatórios profissionais em PDF e envie direto do canteiro de obras.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-12">
              <a
                href="/api/auth/google"
                className="inline-flex items-center gap-3 bg-white text-[#1A1D23] px-7 py-4 rounded font-bold tracking-wide hover:bg-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                data-testid="button-hero-primary"
              >
                <SiGoogle className="w-5 h-5 text-[#4285F4]" />
                Entrar com Google
              </a>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 border-2 border-white px-7 py-4 rounded font-semibold hover:bg-white hover:text-[#1A1D23] transition-all"
                data-testid="button-hero-secondary"
              >
                Ver Demonstração
              </a>
            </div>
            
            <div className="flex gap-12 pt-8 border-t border-[#2D3139]">
              <div>
                <div className="font-display text-4xl text-[#FFD100]">500+</div>
                <div className="text-sm text-[#8B9099]">Obras Monitoradas</div>
              </div>
              <div>
                <div className="font-display text-4xl text-[#FFD100]">10k+</div>
                <div className="text-sm text-[#8B9099]">Inspeções Realizadas</div>
              </div>
              <div>
                <div className="font-display text-4xl text-[#FFD100]">98%</div>
                <div className="text-sm text-[#8B9099]">Satisfação</div>
              </div>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="relative flex justify-center animate-slide-right">
            {/* Floating Badge 1 */}
            <div className="absolute top-[15%] -left-4 lg:left-0 bg-white rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-float z-10">
              <div className="w-10 h-10 rounded-lg bg-[#34C759]/15 flex items-center justify-center">
                <Check className="w-5 h-5 text-[#34C759]" />
              </div>
              <div>
                <div className="font-bold text-[#1A1D23] text-sm">Relatório Gerado</div>
                <div className="text-xs text-[#4A4E57]">PDF enviado com sucesso</div>
              </div>
            </div>

            {/* Phone */}
            <div className="w-72 md:w-80 bg-[#1A1D23] rounded-[40px] border-4 border-[#2D3139] p-3 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                {/* Phone Header */}
                <div className="bg-[#FFD100] p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1A1D23] rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-[#FFD100]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1D23]">Inspeção Semanal</div>
                    <div className="text-xs text-[#1A1D23]/70">Obra: Edifício Aurora</div>
                  </div>
                </div>
                
                {/* Phone Content */}
                <div className="p-4 space-y-3">
                  {[
                    { ok: true, text: "EPIs disponíveis" },
                    { ok: true, text: "Sinalização adequada" },
                    { ok: false, text: "Guarda-corpo instalado" },
                    { ok: true, text: "Extintores em dia" },
                    { ok: false, text: "Proteção periférica" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-l-4 ${
                        item.ok ? "border-[#34C759]" : "border-[#FF3B30]"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                          item.ok ? "bg-[#34C759]" : "bg-[#FF3B30]"
                        }`}
                      >
                        {item.ok ? "✓" : "✗"}
                      </div>
                      <span className="flex-1 text-[#1A1D23] text-sm font-medium">{item.text}</span>
                      <div className="w-8 h-8 bg-[#FFD100] rounded-lg flex items-center justify-center">
                        <Camera className="w-4 h-4 text-[#1A1D23]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Badge 2 */}
            <div className="absolute bottom-[25%] -right-4 lg:right-0 bg-white rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-float-delayed z-10">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div>
                <div className="font-bold text-[#1A1D23] text-sm">2 Não Conformidades</div>
                <div className="text-xs text-[#4A4E57]">Ação imediata necessária</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-24 px-4 md:px-8 bg-[#2D3139] relative">
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-block bg-[#FFD100] text-[#1A1D23] px-4 py-1.5 rounded font-bold text-sm uppercase tracking-wider mb-4">
              Funcionalidades
            </div>
            <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              TUDO QUE VOCÊ PRECISA PARA SUAS INSPEÇÕES
            </h2>
            <p className="text-[#8B9099] text-lg">
              Ferramenta completa para profissionais de SST que buscam agilidade e profissionalismo em suas visitas técnicas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                ref={addFadeRef}
                className="bg-[#1A1D23] rounded-2xl p-8 border border-white/5 transition-all duration-300 hover:-translate-y-2 hover:border-[#FFD100] hover:shadow-xl group relative overflow-hidden opacity-0 translate-y-8"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFD100] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                <div className="w-16 h-16 bg-[#FFD100]/10 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-[#FFD100]" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[#8B9099] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-24 px-4 md:px-8 bg-[#1A1D23]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-block bg-[#FFD100] text-[#1A1D23] px-4 py-1.5 rounded font-bold text-sm uppercase tracking-wider mb-4">
              Como Funciona
            </div>
            <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              SIMPLES COMO DEVE SER
            </h2>
            <p className="text-[#8B9099] text-lg">
              Em 4 passos você finaliza sua inspeção e envia o relatório profissional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-[50px] left-[12.5%] right-[12.5%] h-1 bg-[#2D3139]" />
            
            {steps.map((step, i) => (
              <div
                key={step.number}
                ref={addFadeRef}
                className="text-center relative opacity-0 translate-y-8 transition-all duration-500"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="w-24 h-24 bg-[#2D3139] rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 transition-all duration-300 hover:bg-[#FFD100] hover:scale-110 group">
                  <span className="font-display text-4xl text-[#FFD100] group-hover:text-[#1A1D23] transition-colors">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-[#8B9099] text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-24 px-4 md:px-8 bg-gradient-to-br from-[#2D3139] to-[#1A1D23]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Benefits List */}
          <div>
            <div className="inline-block bg-[#FFD100] text-[#1A1D23] px-4 py-1.5 rounded font-bold text-sm uppercase tracking-wider mb-4">
              Benefícios
            </div>
            <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-8">
              POR QUE PROFISSIONAIS ESCOLHEM O SST CHECK PRO
            </h2>
            
            <div className="space-y-4">
              {benefits.map((benefit, i) => (
                <div
                  key={benefit.title}
                  ref={addFadeRef}
                  className="flex gap-4 p-5 bg-white/[0.03] rounded-xl border border-white/5 transition-all duration-300 hover:bg-[#FFD100]/5 hover:border-[#FFD100] opacity-0 translate-y-8"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="w-8 h-8 bg-[#FFD100] rounded-lg flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-[#1A1D23] stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{benefit.title}</h4>
                    <p className="text-[#8B9099] text-sm">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Preview */}
          <div
            ref={addFadeRef}
            className="opacity-0 translate-y-8 transition-all duration-700"
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl transform perspective-1000 lg:rotate-y-[-5deg]">
              {/* Report Header */}
              <div className="bg-[#1A1D23] p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FFD100] rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-[#1A1D23] stroke-[3]" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">Relatório de Inspeção SST</div>
                  <div className="text-[#8B9099] text-sm">Obra: Residencial Park Sul</div>
                </div>
                <div className="text-[#FFD100] font-semibold">19/12/2025</div>
              </div>
              
              {/* Report Body */}
              <div className="p-6">
                <div className="mb-6">
                  <div className="font-bold text-[#1A1D23] text-sm mb-3 pb-2 border-b-2 border-gray-100 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Itens Verificados
                  </div>
                  <div className="space-y-3">
                    {[
                      { ok: true, text: "Equipamentos de Proteção Individual" },
                      { ok: true, text: "Sinalização de Segurança" },
                      { ok: false, text: "Proteção contra Quedas" },
                      { ok: true, text: "Ordem e Limpeza do Canteiro" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.ok ? "bg-[#34C759]" : "bg-[#FF3B30]"}`} />
                        <span className="flex-1 text-[#1A1D23] text-sm">{item.text}</span>
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          item.ok 
                            ? "bg-[#34C759]/10 text-[#34C759]" 
                            : "bg-[#FF3B30]/10 text-[#FF3B30]"
                        }`}>
                          {item.ok ? "Conforme" : "Não Conforme"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NRs Section */}
      <section id="nrs" className="py-24 px-4 md:px-8 bg-[#1A1D23]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-block bg-[#FFD100] text-[#1A1D23] px-4 py-1.5 rounded font-bold text-sm uppercase tracking-wider mb-4">
              Normas Regulamentadoras
            </div>
            <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              CHECKLISTS BASEADOS NAS NRs
            </h2>
            <p className="text-[#8B9099] text-lg">
              Modelos prontos desenvolvidos por especialistas em segurança do trabalho.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {nrs.map((nr, i) => (
              <div
                key={nr.number}
                ref={addFadeRef}
                className="bg-[#2D3139] rounded-xl p-6 text-center border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#FFD100] hover:shadow-lg group opacity-0 translate-y-8"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="font-display text-3xl text-[#FFD100] mb-2 group-hover:scale-110 transition-transform">
                  {nr.number}
                </div>
                <div className="text-xs text-[#8B9099] leading-tight">{nr.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8 bg-[#FFD100]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl text-[#1A1D23] tracking-wide mb-6">
            COMECE A USAR HOJE MESMO
          </h2>
          <p className="text-[#1A1D23]/70 text-lg mb-10 max-w-2xl mx-auto">
            Junte-se a centenas de profissionais que já transformaram suas inspeções de segurança do trabalho.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 bg-[#1A1D23] text-white px-8 py-4 rounded font-bold uppercase tracking-wide hover:bg-[#2D3139] transition-all hover:-translate-y-0.5"
              data-testid="button-cta-primary"
            >
              <Smartphone className="w-5 h-5" />
              Começar Grátis
            </a>
            <a
              href="#funcionalidades"
              className="inline-flex items-center gap-2 border-2 border-[#1A1D23] text-[#1A1D23] px-8 py-4 rounded font-semibold hover:bg-[#1A1D23] hover:text-white transition-all"
              data-testid="button-cta-secondary"
            >
              Falar com Consultor
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 md:px-8 bg-[#1A1D23] border-t border-[#2D3139]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#FFD100] rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-[#1A1D23] stroke-[3]" />
                </div>
                <span className="font-display text-xl tracking-wider">
                  SST<span className="text-[#FFD100]">Check</span>Pro
                </span>
              </div>
              <p className="text-[#8B9099] text-sm leading-relaxed">
                Aplicativo 100% brasileiro desenvolvido para profissionais de SST que buscam agilidade, profissionalismo e conformidade em suas inspeções de campo.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-3 text-[#8B9099]">
                <li><a href="#funcionalidades" className="hover:text-[#FFD100] transition-colors">Funcionalidades</a></li>
                <li><a href="/pricing" className="hover:text-[#FFD100] transition-colors">Planos e Preços</a></li>
                <li><a href="#nrs" className="hover:text-[#FFD100] transition-colors">Modelos de Checklist</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Suporte</h4>
              <ul className="space-y-3 text-[#8B9099]">
                <li><a href="#" className="hover:text-[#FFD100] transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-[#FFD100] transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-[#FFD100] transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-3 text-[#8B9099]">
                <li><a href="#" className="hover:text-[#FFD100] transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-[#FFD100] transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-[#FFD100] transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#2D3139] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#8B9099] text-sm">
              © 2025 SST Check Pro. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAdminModal(true)}
                className="text-[#4A4E57] hover:text-[#8B9099] text-xs transition-colors"
                data-testid="button-admin-login"
              >
                Admin
              </button>
              <div className="flex gap-3">
                {["in", "ig", "yt"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-10 h-10 bg-[#2D3139] rounded-lg flex items-center justify-center text-white font-bold text-sm hover:bg-[#FFD100] hover:text-[#1A1D23] transition-all"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1A1D23] rounded-2xl max-w-md w-full p-6 border border-[#2D3139] relative">
            <button
              onClick={() => {
                setShowAdminModal(false);
                setLoginError("");
                setAdminEmail("");
                setAdminPassword("");
              }}
              className="absolute top-4 right-4 text-[#8B9099] hover:text-white transition-colors"
              data-testid="button-close-admin-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#FFD100] rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#1A1D23]" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Acesso Admin</h2>
                <p className="text-[#8B9099] text-sm">Login para testes</p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-[#8B9099] mb-2">Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-[#2D3139] border border-[#4A4E57] rounded-lg px-4 py-3 text-white placeholder-[#6b7280] focus:outline-none focus:border-[#FFD100]"
                  placeholder="admin@sstcheckpro.com"
                  required
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8B9099] mb-2">Senha</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-[#2D3139] border border-[#4A4E57] rounded-lg px-4 py-3 text-white placeholder-[#6b7280] focus:outline-none focus:border-[#FFD100]"
                  placeholder="Senha de admin"
                  required
                  data-testid="input-admin-password"
                />
              </div>

              {loginError && (
                <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#FFD100] text-[#1A1D23] font-bold py-3 rounded-lg hover:bg-[#E6BC00] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-admin-submit"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Entrar como Admin
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
