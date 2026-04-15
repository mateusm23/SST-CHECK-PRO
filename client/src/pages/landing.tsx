import { useEffect, useRef, useState } from "react";
import { Check, Camera, X, Lock, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

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
    <div className="min-h-screen bg-[#1A1D23] text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#1A1D23]/95 backdrop-blur-md border-b border-[#FFD100]/10 px-4 md:px-8 py-5">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#FFD100] rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-[#1A1D23] stroke-[3]" />
            </div>
            <span className="font-bold text-xl md:text-2xl">
              SST<span className="text-[#FFD100]">Check</span> Pro
            </span>
          </div>
          <a
            href="/api/auth/google"
            className="text-white hover:bg-white/10 transition-all px-4 md:px-5 py-2 md:py-2.5 rounded border border-[#FFD100]/20 hover:border-[#FFD100] font-medium"
            data-testid="button-nav-login"
          >
            Área de Membros
          </a>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="px-4 md:px-8 py-16 md:py-24 bg-gradient-to-br from-[#1A1D23] to-[#2D3139] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,209,0,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 md:gap-16 items-center relative z-10">
          {/* Hero Content */}
          <div>
            <div className="inline-block bg-gradient-to-r from-[#FFD100] to-[#FFA500] text-[#1A1D23] px-4 md:px-6 py-2 md:py-3 rounded-full font-bold text-sm md:text-base mb-4 md:mb-6 shadow-lg">
              ⚡ Aprovado por 150+ Empresas de Construção Civil
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 md:mb-6">
              Laudos de SST em <span className="text-[#FFD100]">10 Minutos</span>,<br className="hidden md:block"/>Não 4 Horas
            </h1>

            <p className="text-lg md:text-xl text-[#B8BCC4] mb-6 md:mb-8 leading-relaxed max-w-lg">
              Pare de perder tempo criando laudos manualmente. Sistema completo para profissionais de Segurança do Trabalho.
            </p>

            <div className="bg-[#34C759]/15 border-l-4 border-[#34C759] px-4 md:px-6 py-3 md:py-4 rounded-lg mb-6 md:mb-10">
              <p className="font-semibold text-[#D0F5DC]">
                ⏱️ Economize até 90% do tempo + Aumente sua produtividade em 5x
              </p>
            </div>

            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 md:gap-3 bg-[#FFD100] text-[#1A1D23] px-6 md:px-10 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-[#E6BC00] transition-all shadow-[0_8px_25px_rgba(255,209,0,0.4)] hover:shadow-[0_12px_35px_rgba(255,209,0,0.5)] hover:-translate-y-1"
              data-testid="button-hero-cta"
            >
              🚀 Começar Grátis - 3 Laudos Sem Cartão
            </a>

            {/* Trust Indicators */}
            <div className="mt-10 md:mt-12 pt-8 md:pt-10 border-t border-white/10">
              <p className="text-center text-xs md:text-sm font-semibold text-[#FFD100] mb-4 md:mb-6 uppercase tracking-wider">
                Números que Impressionam
              </p>
              <div className="grid grid-cols-3 gap-4 md:gap-12">
                <div className="text-center">
                  <div className="text-2xl md:text-4xl font-black text-[#FFD100]">5.000+</div>
                  <div className="text-xs md:text-sm text-[#B8BCC4] mt-1">Laudos Gerados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-4xl font-black text-[#FFD100]">150+</div>
                  <div className="text-xs md:text-sm text-[#B8BCC4] mt-1">Empresas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-4xl font-black text-[#FFD100]">10min</div>
                  <div className="text-xs md:text-sm text-[#B8BCC4] mt-1">Tempo Médio</div>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="relative flex justify-center">
            {/* Floating Badge 1 */}
            <div className="hidden lg:flex absolute top-[15%] -left-4 bg-white rounded-xl p-4 shadow-2xl items-center gap-3 z-10 animate-float">
              <div className="w-10 h-10 rounded-xl bg-[#34C759]/15 flex items-center justify-center shrink-0">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <div className="font-bold text-[#1A1D23] text-sm">Relatório Gerado</div>
                <div className="text-xs text-[#4A4E57]">PDF enviado com sucesso</div>
              </div>
            </div>

            {/* Phone */}
            <div className="w-full max-w-[300px] bg-[#1A1D23] rounded-[40px] border-4 border-[#2D3139] p-3 shadow-2xl">
              <div className="w-full bg-white rounded-[32px] overflow-hidden">
                {/* Phone Header */}
                <div className="bg-[#FFD100] p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1A1D23] rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-[#FFD100]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1D23] text-sm">Inspeção Semanal</div>
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
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          item.ok ? "bg-[#34C759]" : "bg-[#FF3B30]"
                        }`}
                      >
                        {item.ok ? "✓" : "✗"}
                      </div>
                      <span className="flex-1 text-[#1A1D23] text-sm font-medium">{item.text}</span>
                      <div className="w-8 h-8 bg-[#FFD100] rounded-lg flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4 text-[#1A1D23]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Badge 2 */}
            <div className="hidden lg:flex absolute bottom-[25%] -right-4 bg-white rounded-xl p-4 shadow-2xl items-center gap-3 z-10 animate-float-delayed">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/15 flex items-center justify-center shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <div className="font-bold text-[#1A1D23] text-sm">2 Não Conformidades</div>
                <div className="text-xs text-[#4A4E57]">Ação imediata necessária</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VS Manual - A Dor */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#1A1D23]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              O Problema
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 text-[#FF6B6B]">
              Você Está Perdendo Dinheiro com Laudos Manuais
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4] max-w-2xl mx-auto">
              Cada hora gasta em formatação é uma hora que você poderia estar faturando em campo
            </p>
          </div>

          {/* Visual Comparison */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 mb-12 md:mb-16">
            {/* Old Way */}
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold mb-6 text-[#FF6B6B]">❌ Método Antigo</div>
              <div className="w-32 md:w-40 h-40 md:h-48 bg-white rounded-xl mx-auto mb-6 relative shadow-lg">
                <div className="absolute top-0 right-0 w-8 h-8 md:w-9 md:h-9 bg-gray-100" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
                <div className="p-5 md:p-6">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className={`h-1 bg-gray-200 rounded mb-2 ${i % 3 === 2 ? "w-3/5" : "w-full"}`} />
                  ))}
                </div>
              </div>
              <p className="text-[#B8BCC4] text-base md:text-lg mb-4">
                Word + Excel + Formatação Manual
              </p>
              <div className="inline-block bg-[#FF6B6B]/15 border-2 border-[#FF6B6B] text-[#FFB3B3] px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-sm md:text-base">
                💸 R$200+ de custo por laudo (3-4h × R$50/h)
              </div>
            </div>

            {/* New Way */}
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold mb-6 text-[#34C759]">✅ SST Check Pro</div>
              <div className="w-48 md:w-52 mx-auto mb-6">
                <div className="bg-[#1A1D23] rounded-3xl border-3 border-[#2D3139] p-2 shadow-lg">
                  <div className="bg-white rounded-2xl overflow-hidden">
                    <div className="bg-[#FFD100] p-3 text-center">
                      <div className="font-bold text-[#1A1D23] text-sm">SST Check Pro</div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border-l-4 border-[#34C759]">
                        <div className="w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center text-white text-xs">✓</div>
                        <span className="flex-1 text-[#1A1D23] text-xs">EPI OK</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border-l-4 border-[#34C759]">
                        <div className="w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center text-white text-xs">✓</div>
                        <span className="flex-1 text-[#1A1D23] text-xs">Sinalização</span>
                      </div>
                      <div className="bg-[#FFD100] text-[#1A1D23] p-3 rounded-lg text-center font-bold text-xs">
                        Gerar PDF
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[#B8BCC4] text-base md:text-lg mb-4">
                App Móvel + Sistema
              </p>
              <div className="inline-block bg-[#34C759]/15 border-2 border-[#34C759] text-[#A7F3D0] px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-sm md:text-base">
                💰 R$30 de custo + 6x mais laudos/dia = Mais lucro
              </div>
            </div>
          </div>

          {/* Text Comparison */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Manual */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-6 text-center">❌ Método Manual (Tradicional)</h3>
              <ul className="space-y-3 md:space-y-4">
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#FF6B6B] font-bold shrink-0">✗</span>
                  <span><strong>3-4 horas por laudo</strong> - tempo que poderia estar faturando</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#FF6B6B] font-bold shrink-0">✗</span>
                  <span><strong>Custo elevado:</strong> R$150-200 por laudo em tempo investido</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#FF6B6B] font-bold shrink-0">✗</span>
                  <span>Word + Excel + formatação manual infinita</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#FF6B6B] font-bold shrink-0">✗</span>
                  <span>Riscos de erros que geram retrabalho</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#FF6B6B] font-bold shrink-0">✗</span>
                  <span>Difícil organizar fotos e evidências</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#FF6B6B] font-bold shrink-0">✗</span>
                  <span>Sem histórico centralizado</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#FF6B6B] font-bold shrink-0">✗</span>
                  <span><strong>Máximo 2 laudos por dia</strong></span>
                </li>
              </ul>
            </div>

            {/* SST Check Pro */}
            <div className="bg-[#FFD100]/5 border-2 border-[#FFD100] rounded-2xl p-6 md:p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FFD100] to-[#FFA500] text-[#1A1D23] px-4 md:px-6 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-black uppercase tracking-wide">
                ✨ MELHOR ESCOLHA
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-6 text-center mt-2">✅ SST Check Pro (Automatizado)</h3>
              <ul className="space-y-3 md:space-y-4">
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#34C759] font-bold shrink-0">✓</span>
                  <span><strong>10 minutos por laudo completo</strong></span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#34C759] font-bold shrink-0">✓</span>
                  <span><strong>Custo fixo:</strong> Apenas R$29,90/mês ilimitado</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#34C759] font-bold shrink-0">✓</span>
                  <span>Checklists prontos de todas NRs</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#34C759] font-bold shrink-0">✓</span>
                  <span>Relatório profissional gerado automaticamente</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#34C759] font-bold shrink-0">✓</span>
                  <span>Upload de fotos integrado com geolocação</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#34C759] font-bold shrink-0">✓</span>
                  <span>Todos laudos salvos na nuvem com busca</span>
                </li>
                <li className="flex gap-3 text-sm md:text-base">
                  <span className="text-[#34C759] font-bold shrink-0">✓</span>
                  <span><strong>Até 12+ laudos por dia = 6x mais receita</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#2D3139]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Como Funciona
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              SIMPLES COMO <span className="text-[#FFD100]">1, 2, 3</span>
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4] max-w-2xl mx-auto">
              Do campo ao PDF profissional em 3 etapas automatizadas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Arrows */}
            <div className="hidden md:block absolute top-[80px] left-[29%] text-5xl text-[#FFD100]/30 font-bold">→</div>
            <div className="hidden md:block absolute top-[80px] right-[29%] text-5xl text-[#FFD100]/30 font-bold">→</div>

            {/* Step 1 */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-10 text-center hover:border-[#FFD100]/50 transition-all">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-[#FFD100] to-[#FFA500] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl md:text-4xl font-black text-[#1A1D23]">1</span>
              </div>
              <div className="text-4xl md:text-5xl mb-4 md:mb-6">📱</div>
              <h3 className="text-lg md:text-xl font-bold mb-3 text-[#FFD100]">Você Coleta os Dados</h3>
              <p className="text-sm md:text-base text-[#B8BCC4] leading-relaxed">
                No canteiro de obras, use o celular para marcar itens do checklist e tirar fotos das não conformidades diretamente no laudo.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-10 text-center hover:border-[#FFD100]/50 transition-all">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-[#FFD100] to-[#FFA500] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl md:text-4xl font-black text-[#1A1D23]">2</span>
              </div>
              <div className="text-4xl md:text-5xl mb-4 md:mb-6">⚙️</div>
              <h3 className="text-lg md:text-xl font-bold mb-3 text-[#FFD100]">Sistema Processa Tudo</h3>
              <p className="text-sm md:text-base text-[#B8BCC4] leading-relaxed">
                Nossa plataforma analisa suas respostas, organiza as fotos e gera automaticamente o relatório técnico completo e profissional.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-10 text-center hover:border-[#FFD100]/50 transition-all">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-[#FFD100] to-[#FFA500] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl md:text-4xl font-black text-[#1A1D23]">3</span>
              </div>
              <div className="text-4xl md:text-5xl mb-4 md:mb-6">📄</div>
              <h3 className="text-lg md:text-xl font-bold mb-3 text-[#FFD100]">Recebe o PDF Pronto</h3>
              <p className="text-sm md:text-base text-[#B8BCC4] leading-relaxed">
                Em segundos, o laudo em PDF está pronto com logo, fotos organizadas e plano de ação. Compartilhe por email ou WhatsApp direto da plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#1A1D23]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Funcionalidades
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              TUDO QUE VOCÊ PRECISA, <span className="text-[#FFD100]">NUM SÓ LUGAR</span>
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4] max-w-2xl mx-auto">
              Plataforma completa para profissionais de SST modernos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: "📋", title: "Checklists Personalizáveis", desc: "Modelos prontos de todas as NRs ou crie os seus personalizados. Adaptáveis a qualquer tipo de obra ou indústria." },
              { icon: "📷", title: "Registro Fotográfico", desc: "Tire fotos direto do celular e vincule a cada não conformidade. Evidências visuais organizadas automaticamente no relatório." },
              { icon: "⚙️", title: "Geração Automatizada", desc: "Sistema analisa seus dados e gera automaticamente relatórios técnicos padronizados e profissionais em segundos." },
              { icon: "📄", title: "PDF Profissional", desc: "Laudos com logo da empresa, fotos organizadas das NCs, resumo de conformidade e espaço para assinatura." },
              { icon: "☁️", title: "Armazenamento Nuvem", desc: "Todos os laudos salvos com segurança na nuvem. Busca rápida por obra, data, NR ou palavra-chave. Acesso de qualquer lugar." },
              { icon: "📶", title: "Modo Offline", desc: "Faça inspeções mesmo sem internet. Os dados sincronizam automaticamente quando você conectar novamente." },
              { icon: "✉️", title: "Envio Instantâneo", desc: "Compartilhe relatórios por email ou WhatsApp direto do canteiro. Cliente recebe o laudo ainda quente." },
              { icon: "📊", title: "Dashboard Analytics", desc: "Métricas de conformidade, histórico de inspeções, tendências de não conformidades. Dados para decisões inteligentes." },
              { icon: "🔐", title: "Segurança de Dados", desc: "Criptografia ponta a ponta, backups automáticos e compliance com LGPD. Seus dados e dos clientes 100% protegidos." },
            ].map((feature, i) => (
              <div
                key={i}
                ref={addFadeRef}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 hover:border-[#FFD100]/30 hover:-translate-y-1 transition-all opacity-0 translate-y-8"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="text-4xl md:text-5xl mb-4 md:mb-5">{feature.icon}</div>
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">{feature.title}</h3>
                <p className="text-sm md:text-base text-[#B8BCC4] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Use Cases */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#2D3139]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Casos de Uso Reais
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              QUEM USA <span className="text-[#FFD100]">SST CHECK PRO</span>
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4] max-w-2xl mx-auto">
              Profissionais de diferentes áreas economizando tempo todos os dias
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: "👷", title: "Engenheiro de Obras", subtitle: "Construção Civil", text: "\"Visito 3 canteiros por semana. <strong>Antes gastava 12h/semana em laudos</strong>. Hoje gasto 30 minutos. Sobra tempo para focar na engenharia de verdade.\"" },
              { icon: "🦺", title: "Técnico de Segurança", subtitle: "Múltiplas Obras", text: "\"Atendo 5 obras diferentes por dia. <strong>Com o app móvel faço inspeções no local</strong> e envio os laudos antes de sair. Meus clientes adoram a agilidade.\"" },
              { icon: "💼", title: "Consultoria SST", subtitle: "15+ Clientes B2B", text: "\"Atendo 15 empresas. <strong>Todos os laudos organizados na nuvem</strong> com busca rápida. PDFs padronizados aumentaram minha credibilidade e permitiram escalar o negócio.\"" },
            ].map((useCase, i) => (
              <div
                key={i}
                ref={addFadeRef}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-10 hover:border-[#FFD100]/30 hover:-translate-y-1 transition-all opacity-0 translate-y-8"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-[#FFD100] to-[#FFA500] rounded-full flex items-center justify-center text-2xl md:text-3xl mb-6">
                  {useCase.icon}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#FFD100] mb-1 md:mb-2">{useCase.title}</h3>
                <p className="text-xs md:text-sm text-[#8B9099] mb-4 md:mb-5">{useCase.subtitle}</p>
                <p className="text-sm md:text-base text-[#B8BCC4] leading-relaxed" dangerouslySetInnerHTML={{ __html: useCase.text }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#1A1D23]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Depoimentos
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              O QUE NOSSOS <span className="text-[#FFD100]">CLIENTES DIZEM</span>
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4] max-w-2xl mx-auto">
              Resultados reais de profissionais que já transformaram seu trabalho
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { initial: "RC", name: "Roberto Costa", role: "Engenheiro de Segurança • São Paulo", text: "Antes levava 3 horas para formatar um laudo no Word. Agora faço em 10 minutos e o resultado fica até mais profissional. Minha produtividade aumentou demais.", result: "✓ 70% menos tempo em laudos" },
              { initial: "MF", name: "Mariana Fonseca", role: "Técnica de Segurança • Rio de Janeiro", text: "Consigo fazer muito mais inspeções por dia porque o preenchimento é muito mais rápido. O sistema gera relatórios bem completos e profissionais que impressionam os clientes.", result: "✓ 12 laudos/dia em vez de 2" },
              { initial: "PS", name: "Pedro Santos", role: "Consultor SST Autônomo • Minas Gerais", text: "Consegui aumentar meu faturamento em 300% porque agora consigo atender muito mais clientes por mês. O SST Check Pro pagou o investimento em 2 dias de uso.", result: "✓ 300% aumento no faturamento" },
            ].map((testimonial, i) => (
              <div
                key={i}
                ref={addFadeRef}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 hover:border-[#FFD100]/30 hover:-translate-y-1 transition-all opacity-0 translate-y-8 relative"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="text-5xl md:text-6xl text-[#FFD100]/20 mb-4">"</div>
                <p className="text-sm md:text-base text-[#D0D3D9] leading-relaxed mb-6">{testimonial.text}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#FFD100] to-[#FFA500] rounded-full flex items-center justify-center font-bold text-[#1A1D23] shrink-0">
                    {testimonial.initial}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{testimonial.name}</h4>
                    <p className="text-xs text-[#8B9099] mb-2">{testimonial.role}</p>
                    <div className="text-[#FFD100] text-sm mb-2">⭐⭐⭐⭐⭐</div>
                    <div className="inline-block bg-[#34C759]/15 border border-[#34C759] text-[#A7F3D0] px-3 py-1 rounded-lg text-xs font-semibold">
                      {testimonial.result}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Pricing */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#2D3139]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Planos
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              ESCOLHA SEU <span className="text-[#FFD100]">PLANO</span>
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4] max-w-2xl mx-auto">
              Comece grátis e escale quando precisar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white/[0.03] border-2 border-white/10 rounded-3xl p-6 md:p-12 text-center">
              <h3 className="text-xl md:text-2xl font-bold text-[#FFD100] mb-4">Plano Gratuito</h3>
              <div className="text-4xl md:text-5xl lg:text-6xl font-black mb-2">
                R$0<small className="text-xl md:text-2xl text-[#8B9099] font-medium">/mês</small>
              </div>
              <p className="text-sm md:text-base text-[#8B9099] mb-6 md:mb-8">3 laudos por mês</p>
              <ul className="text-left space-y-3 md:space-y-4 mb-6 md:mb-10">
                {["3 laudos/mês", "Checklists de NRs", "Upload de fotos nas NCs", "Geração automática de PDF", "Suporte por email"].map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm md:text-base">
                    <span className="text-[#34C759] font-bold shrink-0">✓</span>
                    <span className={feature.includes("3 laudos") ? "font-bold" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/api/auth/google"
                className="block w-full bg-transparent border-2 border-white/20 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:border-[#FFD100] hover:text-[#FFD100] transition-all"
                data-testid="button-pricing-free"
              >
                Começar Grátis
              </a>
            </div>

            {/* Professional Plan */}
            <div className="bg-[#FFD100]/5 border-2 border-[#FFD100] rounded-3xl p-6 md:p-12 text-center relative transform md:scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FFD100] to-[#FFA500] text-[#1A1D23] px-4 md:px-6 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-black uppercase tracking-wide">
                🔥 MAIS POPULAR
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#FFD100] mb-4 mt-2">Plano Profissional</h3>
              <div className="text-4xl md:text-5xl lg:text-6xl font-black mb-2">
                R$9<small className="text-xl md:text-2xl text-[#8B9099] font-medium">/mês</small>
              </div>
              <p className="text-sm md:text-base text-[#8B9099] mb-6 md:mb-8">30 laudos por mês</p>
              <ul className="text-left space-y-3 md:space-y-4 mb-6 md:mb-10">
                {["30 laudos/mês", "Todos os checklists de NRs", "Upload de fotos nas NCs", "PDF profissional", "Planos de ação gerados por IA", "Exportação em Excel", "Suporte por e-mail em até 24h"].map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm md:text-base">
                    <span className="text-[#34C759] font-bold shrink-0">✓</span>
                    <span className={feature.includes("30 laudos") || feature.includes("Planos de ação") || feature.includes("Excel") ? "font-bold" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/api/auth/google?plan=professional"
                className="block w-full bg-[#FFD100] text-[#1A1D23] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-[#E6BC00] transition-all shadow-lg"
                data-testid="button-pricing-pro"
              >
                Assinar Agora - R$9/mês
              </a>
            </div>

            {/* Business Plan */}
            <div className="bg-white/[0.03] border-2 border-white/10 rounded-3xl p-6 md:p-12 text-center">
              <h3 className="text-xl md:text-2xl font-bold text-[#FFD100] mb-4">Plano Negócios</h3>
              <div className="text-4xl md:text-5xl lg:text-6xl font-black mb-2">
                R$29,90<small className="text-xl md:text-2xl text-[#8B9099] font-medium">/mês</small>
              </div>
              <p className="text-sm md:text-base text-[#8B9099] mb-6 md:mb-8">Laudos ilimitados</p>
              <ul className="text-left space-y-3 md:space-y-4 mb-6 md:mb-10">
                {["Laudos ilimitados", "Múltiplas empresas/CNPJs", "Todos os checklists de NRs", "Upload de fotos nas NCs", "PDF profissional", "Planos de ação gerados por IA", "Exportação em Excel", "Suporte via WhatsApp"].map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm md:text-base">
                    <span className="text-[#34C759] font-bold shrink-0">✓</span>
                    <span className={feature.includes("ilimitados") || feature.includes("Múltiplas") || feature.includes("WhatsApp") ? "font-bold" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/api/auth/google?plan=business"
                className="block w-full bg-[#FFD100] text-[#1A1D23] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-[#E6BC00] transition-all"
                data-testid="button-pricing-business"
              >
                Assinar Agora - R$29,90/mês
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. NRs Section */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#1A1D23]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Normas Regulamentadoras
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              CHECKLISTS BASEADOS NAS <span className="text-[#FFD100]">NRs</span>
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4] max-w-2xl mx-auto">
              Modelos prontos desenvolvidos por especialistas em segurança do trabalho
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {[
              { number: "NR 10", title: "Segurança em Instalações Elétricas", popular: true },
              { number: "NR 18", title: "Construção Civil - Canteiros de Obras", popular: true },
              { number: "NR 35", title: "Trabalho em Altura", popular: true },
              { number: "NR 1", title: "Disposições Gerais e Gerenciamento de Riscos" },
              { number: "NR 6", title: "Equipamentos de Proteção Individual" },
              { number: "NR 12", title: "Máquinas e Equipamentos" },
              { number: "NR 17", title: "Ergonomia no Trabalho" },
              { number: "NR 23", title: "Proteção Contra Incêndios" },
              { number: "NR 33", title: "Espaços Confinados" },
              { number: "+20", title: "Outros Modelos Disponíveis" },
            ].map((nr, i) => (
              <div
                key={i}
                className={`bg-[#2D3139] rounded-xl p-6 md:p-8 text-center border transition-all hover:-translate-y-1 hover:border-[#FFD100]/30 hover:shadow-lg relative ${
                  nr.popular ? "border-[#FFD100]" : "border-white/5"
                }`}
              >
                {nr.popular && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#FFD100] text-[#1A1D23] rounded-full flex items-center justify-center text-xs font-black">
                    ★
                  </div>
                )}
                <div className="text-2xl md:text-3xl font-bold text-[#FFD100] mb-2">{nr.number}</div>
                <div className="text-xs text-[#B8BCC4] leading-tight">{nr.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="px-4 md:px-8 py-16 md:py-20 bg-[#2D3139]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block bg-[#FFD100]/15 text-[#FFD100] px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Perguntas Frequentes
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              TIRE SUAS <span className="text-[#FFD100]">DÚVIDAS</span>
            </h2>
            <p className="text-lg md:text-xl text-[#B8BCC4]">
              Respostas para as perguntas mais comuns
            </p>
          </div>

          <div className="space-y-4">
            {[
              { q: "Como funciona o plano gratuito?", a: "Você pode criar até 3 laudos completos por mês gratuitamente, sem precisar cadastrar cartão de crédito. Todos os recursos estão disponíveis: checklist de NRs, upload de fotos e geração de PDF. É perfeito para testar a plataforma antes de assinar." },
              { q: "Meus dados e dos meus clientes estão seguros?", a: "Sim! Utilizamos criptografia ponta a ponta, backups automáticos diários e estamos em compliance total com a LGPD. Seus dados ficam armazenados em servidores seguros na AWS (Amazon Web Services), a mesma infraestrutura usada por bancos e grandes empresas." },
              { q: "Funciona no celular?", a: "Sim! O SST Check Pro é um Progressive Web App (PWA) que funciona no navegador do celular, tablet ou computador. Acesse pelo navegador em qualquer dispositivo — sem precisar instalar nada." },
              { q: "O sistema realmente gera relatórios de qualidade?", a: "Sim! Nossa plataforma foi desenvolvida com base em milhares de laudos técnicos reais de engenheiros e técnicos de segurança. O sistema analisa suas respostas do checklist, organiza as fotos e gera um relatório técnico completo, profissional e padronizado seguindo as melhores práticas do setor." },
              { q: "Posso cancelar a qualquer momento?", a: "Sim, sem burocracia! O plano é mensal e você pode cancelar quando quiser direto no painel. Não há multas, taxas ou fidelidade. Mesmo após cancelar, você mantém acesso aos seus laudos já criados." },
              { q: "Posso personalizar com a logo da minha empresa?", a: "Sim! Nos planos pagos (Profissional e Negócios) você pode adicionar o logo da sua empresa em todos os PDFs, criando uma identidade visual única para seus laudos. Isso aumenta muito o profissionalismo e credibilidade." },
              { q: "Quanto tempo leva para aprender a usar?", a: "Menos de 5 minutos! A interface é super intuitiva. Se você já faz laudos manualmente, vai entender imediatamente. Além disso, temos tutoriais em vídeo e suporte por email para qualquer dúvida." },
              { q: "Funciona no computador ou só no celular?", a: "Funciona em ambos! Você pode acessar pelo navegador do computador (Windows, Mac, Linux) ou pelo app móvel (Android e iOS). Tudo sincroniza automaticamente entre os dispositivos." },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/[0.08] rounded-xl hover:border-[#FFD100]/30 transition-all overflow-hidden"
              >
                <div className="px-6 md:px-8 py-5 md:py-6 font-semibold text-base md:text-lg flex justify-between items-center cursor-pointer">
                  <span>{faq.q}</span>
                  <span className="text-2xl md:text-3xl text-[#FFD100] font-bold">+</span>
                </div>
                <div className="px-6 md:px-8 pb-5 md:pb-6 text-sm md:text-base text-[#B8BCC4] leading-relaxed">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Final CTA */}
      <section className="px-4 md:px-8 py-16 md:py-24 bg-gradient-to-br from-[#1A1D23] to-[#2D3139] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,209,0,0.1),transparent_50%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6">
            Pronto para Economizar <span className="text-[#FFD100]">Horas</span> de Trabalho?
          </h2>
          <p className="text-lg md:text-xl text-[#B8BCC4] mb-8 md:mb-10">
            Comece grátis hoje. Teste 3 laudos completos sem cartão de crédito.
          </p>
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-3 bg-[#FFD100] text-[#1A1D23] px-8 md:px-12 py-4 md:py-5 rounded-xl font-bold text-base md:text-lg hover:bg-[#E6BC00] transition-all shadow-[0_8px_25px_rgba(255,209,0,0.4)] hover:shadow-[0_12px_35px_rgba(255,209,0,0.5)] hover:-translate-y-1"
            data-testid="button-final-cta"
          >
            🚀 Começar Grátis Agora - 3 Laudos
          </a>
          <p className="mt-6 text-xs md:text-sm text-[#8B9099]">
            ✓ Sem cartão de crédito • ✓ Cancele quando quiser • ✓ Suporte em português
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-12 md:py-16 bg-[#0D0F12] border-t border-white/10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-8">
            <div>
              <h4 className="text-[#FFD100] text-lg font-bold mb-4">SST Check Pro</h4>
              <p className="text-sm text-[#B8BCC4] leading-relaxed">
                Plataforma completa de laudos de SST com Inteligência Artificial para profissionais que valorizam tempo e qualidade.
              </p>
            </div>
            <div>
              <h4 className="text-[#FFD100] text-lg font-bold mb-4">Produto</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Funcionalidades</a></li>
                <li><a href="/pricing" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Planos e Preços</a></li>
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Segurança</a></li>
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#FFD100] text-lg font-bold mb-4">Empresa</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Sobre</a></li>
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Blog</a></li>
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Contato</a></li>
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Privacidade</a></li>
                <li><a href="#" className="text-[#B8BCC4] hover:text-[#FFD100] transition-colors">Termos de Uso</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex justify-between items-center">
            <p className="text-sm text-[#8B9099]">© 2024 SST Check Pro. Todos os direitos reservados.</p>
            <button
              onClick={() => setShowAdminModal(true)}
              className="text-[#4A4E57] hover:text-[#8B9099] text-xs transition-colors"
              data-testid="button-admin"
            >
              Admin
            </button>
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
              data-testid="button-close-admin"
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

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 1.5s;
        }
      `}</style>
    </div>
  );
}
