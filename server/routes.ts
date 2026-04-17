import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./auth";
import { generateActionPlans } from "./geminiService";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { subscriptionPlans, customTemplates, templateSections, templateItems } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// VIP emails with full unlimited access (configure via VIP_EMAILS env var, comma-separated)
const VIP_EMAILS = (process.env.VIP_EMAILS || "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.subscription.current.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = (req.user.email || req.user.claims?.email || "").toLowerCase().trim();
      
      // Check if user is VIP (full unlimited access)
      const isVIP = VIP_EMAILS.some((vip: string) => vip === userEmail);
      console.log("VIP check:", { userEmail, isVIP, vipList: VIP_EMAILS });
      
      if (isVIP) {
        // VIP users get unlimited business plan access
        return res.json({
          plan: {
            id: 999,
            name: "VIP Business",
            slug: "business",
            monthlyLimit: -1,
            canUploadLogo: true,
          },
          usage: {
            inspectionsThisMonth: 0,
            remaining: -1,
          },
          isVIP: true,
        });
      }
      
      let userSub = await storage.getUserSubscription(userId);
      
      if (!userSub) {
        const freePlan = await storage.getSubscriptionPlanBySlug("free");
        if (freePlan) {
          userSub = await storage.createUserSubscription({
            userId,
            planId: freePlan.id,
            status: "active",
          });
        }
      }

      const plans = await storage.getSubscriptionPlans();
      const currentPlan = plans.find(p => p.id === userSub?.planId) || plans[0];
      const inspectionsThisMonth = await storage.getInspectionsCountThisMonth(userId);
      const remaining = currentPlan.monthlyLimit === -1 ? -1 : Math.max(0, currentPlan.monthlyLimit - inspectionsThisMonth);

      res.json({
        plan: {
          id: currentPlan.id,
          name: currentPlan.name,
          slug: currentPlan.slug,
          monthlyLimit: currentPlan.monthlyLimit,
          canUploadLogo: currentPlan.canUploadLogo,
        },
        usage: {
          inspectionsThisMonth,
          remaining,
        },
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.get(api.subscription.plans.path, async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post(api.subscription.checkout.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planSlug } = req.body;
      
      const plan = await storage.getSubscriptionPlanBySlug(planSlug);
      if (!plan || !plan.stripePriceId) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      const stripe = await getUncachableStripeClient();
      let userSub = await storage.getUserSubscription(userId);
      
      let customerId = userSub?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId },
        });
        customerId = customer.id;
        
        if (userSub) {
          await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/dashboard?success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/pricing?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", {
        message: error?.message,
        type: error?.type,
        code: error?.code,
        stripeKey: process.env.STRIPE_SECRET_KEY ? `...${process.env.STRIPE_SECRET_KEY.slice(-4)}` : "MISSING",
        professionalPriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "MISSING",
        businessPriceId: process.env.STRIPE_BUSINESS_PRICE_ID || "MISSING",
      });
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post(api.subscription.portal.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userSub = await storage.getUserSubscription(userId);
      
      if (!userSub?.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: userSub.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/dashboard`,
      });

      res.json({ url: session.url });
    } catch (error) {
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  app.get(api.companies.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companiesList = await storage.getCompanies(userId);
      res.json(companiesList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post(api.companies.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.companies.create.input.parse({ ...req.body, userId });
      const company = await storage.createCompany(input);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.get(api.companies.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const company = await storage.getCompany(Number(req.params.id));
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.put(api.companies.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.companies.update.input.parse(req.body);
      const company = await storage.updateCompany(Number(req.params.id), input);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.get(api.inspections.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inspectionsList = await storage.getInspections(userId);
      res.json(inspectionsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inspections" });
    }
  });

  app.post(api.inspections.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = (req.user.email || req.user.claims?.email || "").toLowerCase().trim();
      
      // VIP users bypass all limits
      const isVIP = VIP_EMAILS.some((vip: string) => vip === userEmail);
      
      if (!isVIP) {
        let userSub = await storage.getUserSubscription(userId);
        if (!userSub) {
          const freePlan = await storage.getSubscriptionPlanBySlug("free");
          if (freePlan) {
            userSub = await storage.createUserSubscription({
              userId,
              planId: freePlan.id,
              status: "active",
            });
          }
        }

        const plans = await storage.getSubscriptionPlans();
        const currentPlan = plans.find(p => p.id === userSub?.planId);
        
        if (currentPlan && currentPlan.monthlyLimit !== -1) {
          const count = await storage.getInspectionsCountThisMonth(userId);
          if (count >= currentPlan.monthlyLimit) {
            return res.status(403).json({ 
              message: `Limite de ${currentPlan.monthlyLimit} inspeções/mês atingido. Faça upgrade do seu plano.` 
            });
          }
        }
      }

      const input = api.inspections.create.input.parse({ ...req.body, userId });
      const inspection = await storage.createInspection(input);
      res.status(201).json(inspection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create inspection" });
    }
  });

  app.get(api.inspections.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inspection = await storage.getInspection(Number(req.params.id));
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      if (inspection.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const photos = await storage.getInspectionPhotos(inspection.id);
      const actionPlansList = await storage.getActionPlans(inspection.id);

      res.json({ ...inspection, photos, actionPlans: actionPlansList });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inspection" });
    }
  });

  app.put(api.inspections.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getInspection(Number(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const input = api.inspections.update.input.parse(req.body);
      const inspection = await storage.updateInspection(Number(req.params.id), input);
      res.json(inspection);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inspection" });
    }
  });

  app.delete(api.inspections.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getInspection(Number(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteInspection(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inspection" });
    }
  });

  app.post(api.inspections.complete.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getInspection(Number(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const inspection = await storage.updateInspection(Number(req.params.id), {
        status: "completed"
      });
      res.json(inspection);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete inspection" });
    }
  });

  app.get(api.photos.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const photos = await storage.getInspectionPhotos(Number(req.params.inspectionId));
      res.json(photos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post(api.photos.upload.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.photos.upload.input.parse({
        ...req.body,
        inspectionId: Number(req.params.inspectionId),
      });
      const photo = await storage.createInspectionPhoto(input);
      res.status(201).json(photo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  app.delete(api.photos.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspectionPhoto(Number(req.params.photoId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  app.get(api.actionPlans.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const plans = await storage.getActionPlans(Number(req.params.inspectionId));
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch action plans" });
    }
  });

  app.post(api.actionPlans.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.actionPlans.create.input.parse({
        ...req.body,
        inspectionId: Number(req.params.inspectionId),
      });
      const plan = await storage.createActionPlan(input);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create action plan" });
    }
  });

  app.post(api.actionPlans.generateAI.path, isAuthenticated, async (req: any, res) => {
    try {
      const inspection = await storage.getInspection(Number(req.params.inspectionId));
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }

      const suggestions = await generateActionPlans(
        inspection.checklistData,
        inspection.observations || "",
        inspection.location || ""
      );

      const createdPlans = [];
      for (const suggestion of suggestions) {
        const plan = await storage.createActionPlan({
          inspectionId: inspection.id,
          issue: suggestion.issue,
          recommendation: suggestion.recommendation,
          priority: suggestion.priority,
          aiGenerated: true,
        });
        createdPlans.push(plan);
      }

      res.json(createdPlans);
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({ message: "Failed to generate action plans" });
    }
  });

  app.put(api.actionPlans.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.actionPlans.update.input.parse(req.body);
      const plan = await storage.updateActionPlan(Number(req.params.planId), input);
      if (!plan) {
        return res.status(404).json({ message: "Action plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to update action plan" });
    }
  });

  app.get(api.nrChecklists.list.path, async (req, res) => {
    try {
      const checklists = await storage.getNrChecklists();
      res.json(checklists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch NR checklists" });
    }
  });

  app.get(api.nrChecklists.get.path, async (req, res) => {
    try {
      const checklist = await storage.getNrChecklist(Number(req.params.id));
      if (!checklist) {
        return res.status(404).json({ message: "NR checklist not found" });
      }
      res.json(checklist);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch NR checklist" });
    }
  });

  app.get(api.stats.dashboard.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ── Templates customizados ─────────────────────────────────────

  // Listar templates do usuário
  app.get("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await db
        .select()
        .from(customTemplates)
        .where(eq(customTemplates.userId, userId))
        .orderBy(customTemplates.createdAt);
      // Contar itens de cada template
      const result = await Promise.all(
        templates.map(async (t) => {
          const sections = await db
            .select()
            .from(templateSections)
            .where(eq(templateSections.templateId, t.id));
          const itemCount = await Promise.all(
            sections.map((s) =>
              db.select().from(templateItems).where(eq(templateItems.sectionId, s.id))
            )
          );
          return { ...t, sectionCount: sections.length, itemCount: itemCount.flat().length };
        })
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar templates" });
    }
  });

  // Buscar template completo (com seções e itens)
  app.get("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateId = Number(req.params.id);
      const [template] = await db
        .select()
        .from(customTemplates)
        .where(and(eq(customTemplates.id, templateId), eq(customTemplates.userId, userId)));
      if (!template) return res.status(404).json({ message: "Template não encontrado" });

      const sections = await db
        .select()
        .from(templateSections)
        .where(eq(templateSections.templateId, templateId))
        .orderBy(templateSections.order);

      const sectionsWithItems = await Promise.all(
        sections.map(async (s) => {
          const items = await db
            .select()
            .from(templateItems)
            .where(eq(templateItems.sectionId, s.id))
            .orderBy(templateItems.order);
          return { ...s, items };
        })
      );

      res.json({ ...template, sections: sectionsWithItems });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar template" });
    }
  });

  // Criar template
  app.post("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, description } = req.body;
      const [template] = await db
        .insert(customTemplates)
        .values({ userId, name, description })
        .returning();
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar template" });
    }
  });

  // Salvar template completo (upsert seções + itens)
  app.put("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateId = Number(req.params.id);
      const { name, description, sections } = req.body;

      const [template] = await db
        .select()
        .from(customTemplates)
        .where(and(eq(customTemplates.id, templateId), eq(customTemplates.userId, userId)));
      if (!template) return res.status(404).json({ message: "Template não encontrado" });

      // Atualiza metadados
      await db
        .update(customTemplates)
        .set({ name, description, updatedAt: new Date() })
        .where(eq(customTemplates.id, templateId));

      // Remove seções/itens antigos e recria (replace strategy)
      const oldSections = await db
        .select()
        .from(templateSections)
        .where(eq(templateSections.templateId, templateId));
      for (const s of oldSections) {
        await db.delete(templateItems).where(eq(templateItems.sectionId, s.id));
      }
      await db.delete(templateSections).where(eq(templateSections.templateId, templateId));

      // Insere novas seções e itens
      for (let si = 0; si < (sections || []).length; si++) {
        const sec = sections[si];
        const [newSection] = await db
          .insert(templateSections)
          .values({ templateId, name: sec.name, order: si })
          .returning();
        for (let ii = 0; ii < (sec.items || []).length; ii++) {
          const item = sec.items[ii];
          await db.insert(templateItems).values({
            sectionId: newSection.id,
            text: item.text,
            responseType: item.responseType || "conformity",
            weight: item.weight ?? 1,
            obsRequired: item.obsRequired || "if_nc",
            photoRequired: item.photoRequired || "never",
            order: ii,
          });
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao salvar template" });
    }
  });

  // Deletar template
  app.delete("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateId = Number(req.params.id);
      const [template] = await db
        .select()
        .from(customTemplates)
        .where(and(eq(customTemplates.id, templateId), eq(customTemplates.userId, userId)));
      if (!template) return res.status(404).json({ message: "Template não encontrado" });

      const sections = await db
        .select()
        .from(templateSections)
        .where(eq(templateSections.templateId, templateId));
      for (const s of sections) {
        await db.delete(templateItems).where(eq(templateItems.sectionId, s.id));
      }
      await db.delete(templateSections).where(eq(templateSections.templateId, templateId));
      await db.delete(customTemplates).where(eq(customTemplates.id, templateId));

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar template" });
    }
  });

  // ──────────────────────────────────────────────────────────────

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      res.status(500).json({ message: "Stripe not configured" });
    }
  });

  return httpServer;
}

export async function seedDatabase() {
  const existingPlans = await storage.getSubscriptionPlans();
  // Fix free plan limit if it was previously set to 1
  const freePlan = existingPlans.find(p => p.slug === "free");
  if (freePlan && (freePlan as any).monthlyLimit === 1) {
    await db.update(subscriptionPlans)
      .set({ monthlyLimit: 3 } as any)
      .where(eq((subscriptionPlans as any).slug, "free"));
    console.log("Updated free plan monthlyLimit from 1 to 3");
  }

  if (existingPlans.length === 0) {
    await db.insert(subscriptionPlans).values([
      {
        name: "Grátis",
        slug: "free",
        monthlyLimit: 3,
        canUploadLogo: false,
        price: 0,
      },
      {
        name: "Profissional",
        slug: "professional",
        monthlyLimit: 30,
        canUploadLogo: true,
        price: 900,
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || null,
      },
      {
        name: "Negócios",
        slug: "business",
        monthlyLimit: -1,
        canUploadLogo: true,
        price: 2990,
        stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || null,
      },
    ]);
    console.log("Seeded subscription plans");
  }

  const existingChecklists = await storage.getNrChecklists();
  if (existingChecklists.length === 0) {
    const nrData = [
      {
        nrNumber: "NR-6",
        nrName: "Equipamento de Proteção Individual",
        category: "EPI",
        items: [
          { id: "nr6-1", text: "Todos os EPIs necessários para a atividade estão disponíveis", required: true },
          { id: "nr6-2", text: "Os EPIs possuem CA (Certificado de Aprovação) válido e legível", required: true },
          { id: "nr6-3", text: "Os EPIs estão em bom estado de conservação e higiene", required: true },
          { id: "nr6-4", text: "Os trabalhadores estão utilizando os EPIs corretamente durante a atividade", required: true },
          { id: "nr6-5", text: "Existe ficha de controle de entrega de EPI assinada por cada trabalhador", required: true },
          { id: "nr6-6", text: "Os trabalhadores foram treinados sobre o uso, guarda e conservação dos EPIs", required: true },
          { id: "nr6-7", text: "Capacete de segurança (classe A ou B) disponível e em uso", required: true },
          { id: "nr6-8", text: "Calçado de segurança adequado para o risco (botina, bota) em uso", required: true },
          { id: "nr6-9", text: "Protetor auricular disponível em áreas com nível de ruído ≥ 85 dB", required: true },
          { id: "nr6-10", text: "Luvas de proteção adequadas ao tipo de risco estão disponíveis e em uso", required: false },
          { id: "nr6-11", text: "Óculos de proteção disponíveis para atividades com risco de projeção", required: false },
          { id: "nr6-12", text: "Protetor respiratório disponível quando há exposição a poeiras, vapores ou gases", required: false },
          { id: "nr6-13", text: "EPIs com prazo de validade dentro do limite (verificar embalagem)", required: true },
          { id: "nr6-14", text: "EPIs danificados ou vencidos são substituídos imediatamente", required: true },
        ],
      },
      {
        nrNumber: "NR-10",
        nrName: "Segurança em Instalações e Serviços em Eletricidade",
        category: "Eletricidade",
        items: [
          { id: "nr10-1", text: "Somente profissionais habilitados (NR-10) e autorizados realizam serviços elétricos", required: true },
          { id: "nr10-2", text: "Prontuário das instalações elétricas está atualizado e disponível", required: true },
          { id: "nr10-3", text: "Diagrama unifilar das instalações elétricas está atualizado", required: true },
          { id: "nr10-4", text: "Procedimentos de trabalho (PTW/APR) documentados para serviços em eletricidade", required: true },
          { id: "nr10-5", text: "Sinalização de segurança (perigo elétrico) adequada e visível", required: true },
          { id: "nr10-6", text: "Quadros e painéis elétricos estão fechados, identificados e com acesso restrito", required: true },
          { id: "nr10-7", text: "Dispositivos de proteção (DR, disjuntores) estão instalados e em funcionamento", required: true },
          { id: "nr10-8", text: "Instalações elétricas provisórias atendem às normas (sem gambiarras ou emendas expostas)", required: true },
          { id: "nr10-9", text: "Equipamentos e ferramentas utilizados são adequados para trabalho em eletricidade (isolados)", required: true },
          { id: "nr10-10", text: "EPIs específicos para eletricidade disponíveis (luva isolante, capacete classe B, tapete isolante)", required: true },
          { id: "nr10-11", text: "Aterramento das instalações e equipamentos elétricos está realizado", required: true },
          { id: "nr10-12", text: "Bloqueio e etiquetagem (LOTO) aplicados antes de intervenções em circuitos energizados", required: true },
          { id: "nr10-13", text: "Distâncias de segurança das zonas de risco, controlada e livre são respeitadas", required: true },
        ],
      },
      {
        nrNumber: "NR-12",
        nrName: "Segurança no Trabalho em Máquinas e Equipamentos",
        category: "Máquinas",
        items: [
          { id: "nr12-1", text: "Proteções fixas instaladas em zonas de perigo das máquinas (partes móveis, transmissões)", required: true },
          { id: "nr12-2", text: "Proteções móveis com intertravamento funcionando corretamente", required: true },
          { id: "nr12-3", text: "Dispositivos de parada de emergência (cogumelo vermelho) visíveis e acessíveis", required: true },
          { id: "nr12-4", text: "Parada de emergência testada e em pleno funcionamento", required: true },
          { id: "nr12-5", text: "Manual de operação da máquina disponível em português", required: true },
          { id: "nr12-6", text: "Sinalização de segurança (riscos, advertências) afixada nas máquinas", required: true },
          { id: "nr12-7", text: "Operadores treinados e capacitados para operação da máquina", required: true },
          { id: "nr12-8", text: "Plano de manutenção preventiva elaborado e executado regularmente", required: true },
          { id: "nr12-9", text: "Registro de manutenções realizadas (diário de bordo ou similar)", required: true },
          { id: "nr12-10", text: "Área ao redor das máquinas está limpa, organizada e demarcada", required: true },
          { id: "nr12-11", text: "Iluminação adequada na área de operação das máquinas", required: false },
          { id: "nr12-12", text: "Ruído gerado pela máquina está dentro dos limites ou há proteção auditiva disponível", required: false },
          { id: "nr12-13", text: "Máquinas possuem dispositivos de controle de duas mãos onde aplicável", required: false },
        ],
      },
      {
        nrNumber: "NR-18",
        nrName: "Segurança e Saúde no Trabalho na Indústria da Construção",
        category: "Construção Civil",
        items: [
          { id: "nr18-1", text: "PCMAT (Programa de Cond. e Meio Ambiente de Trabalho) elaborado e aprovado", required: true },
          { id: "nr18-2", text: "Guarda-corpos instalados em todas as bordas e aberturas (altura mínima 1,20m)", required: true },
          { id: "nr18-3", text: "Rodapé de proteção (15cm) instalado junto aos guarda-corpos", required: true },
          { id: "nr18-4", text: "Aberturas no piso protegidas com tampas resistentes e sinalizadas", required: true },
          { id: "nr18-5", text: "Redes de proteção instaladas e em bom estado nos andares superiores", required: true },
          { id: "nr18-6", text: "Escadas de mão em bom estado com sapatas antiderrapantes e traves de fixação", required: true },
          { id: "nr18-7", text: "Escadas fixas com corrimão em ambos os lados e piso antiderrapante", required: true },
          { id: "nr18-8", text: "Quadros elétricos do canteiro fechados, identificados e aterrados", required: true },
          { id: "nr18-9", text: "Instalações de vivência (vestiário, refeitório, sanitários) em condições adequadas", required: true },
          { id: "nr18-10", text: "Canteiro de obras limpo, organizado e sem acúmulo de entulho", required: true },
          { id: "nr18-11", text: "Vias de circulação de pedestres e veículos demarcadas e desobstruídas", required: true },
          { id: "nr18-12", text: "Sinalização de segurança adequada e visível em todo o canteiro", required: true },
          { id: "nr18-13", text: "Extintores de incêndio sinalizados, acessíveis e dentro da validade", required: true },
          { id: "nr18-14", text: "Andaimes e plataformas de trabalho em bom estado e com proteção lateral", required: true },
          { id: "nr18-15", text: "Equipamentos de escavação e terraplanagem com cabine de proteção (ROPS/FOPS)", required: false },
          { id: "nr18-16", text: "Materiais armazenados de forma segura, estável e organizada", required: true },
          { id: "nr18-17", text: "CREA ou responsável técnico identificado na obra", required: true },
        ],
      },
      {
        nrNumber: "NR-23",
        nrName: "Proteção Contra Incêndios",
        category: "Incêndio",
        items: [
          { id: "nr23-1", text: "Extintores de incêndio instalados nos locais definidos no projeto de prevenção", required: true },
          { id: "nr23-2", text: "Extintores dentro do prazo de validade e com lacre intacto", required: true },
          { id: "nr23-3", text: "Extintores sinalizados com placa fotoluminescente e acessíveis (sem obstrução)", required: true },
          { id: "nr23-4", text: "Tipo de extintor adequado para os riscos do local (A, B, C, D)", required: true },
          { id: "nr23-5", text: "Saídas de emergência desobstruídas, sinalizadas e iluminadas", required: true },
          { id: "nr23-6", text: "Rotas de fuga demarcadas e conhecidas pelos trabalhadores", required: true },
          { id: "nr23-7", text: "Portas corta-fogo em bom estado e sem trancas ou obstruções", required: true },
          { id: "nr23-8", text: "Sistema de alarme de incêndio instalado, funcional e testado", required: false },
          { id: "nr23-9", text: "Hidrantes ou mangotinhos disponíveis e acessíveis (onde aplicável)", required: false },
          { id: "nr23-10", text: "Trabalhadores treinados em combate a incêndio e primeiros socorros", required: true },
          { id: "nr23-11", text: "Plano de emergência/evacuação elaborado, afixado e de conhecimento de todos", required: true },
          { id: "nr23-12", text: "Simulacro de incêndio/evacuação realizado nos últimos 12 meses", required: false },
          { id: "nr23-13", text: "Armazenamento de materiais inflamáveis em local adequado e sinalizado", required: true },
          { id: "nr23-14", text: "Iluminação de emergência instalada e em funcionamento nas rotas de fuga", required: true },
        ],
      },
      {
        nrNumber: "NR-35",
        nrName: "Trabalho em Altura",
        category: "Altura",
        items: [
          { id: "nr35-1", text: "Trabalhadores com treinamento NR-35 válido (certificado dentro de 2 anos)", required: true },
          { id: "nr35-2", text: "Análise de Risco (AR) elaborada e assinada para a atividade em altura", required: true },
          { id: "nr35-3", text: "Permissão de Trabalho (PT) emitida, aprovada e afixada no local", required: true },
          { id: "nr35-4", text: "Cinturão de segurança tipo paraquedista em uso e em bom estado", required: true },
          { id: "nr35-5", text: "Ponto de ancoragem resistente (mínimo 15 kN) identificado e utilizado", required: true },
          { id: "nr35-6", text: "Trava-quedas ou talabarte com absorvedor de energia em uso", required: true },
          { id: "nr35-7", text: "Linha de vida instalada corretamente quando necessário", required: false },
          { id: "nr35-8", text: "Capacete com jugular afivela e em bom estado", required: true },
          { id: "nr35-9", text: "Área abaixo do trabalho em altura isolada e sinalizada", required: true },
          { id: "nr35-10", text: "Plano de resgate elaborado e equipe de resgate disponível", required: true },
          { id: "nr35-11", text: "Condições climáticas verificadas (não realizar em tempestade, raios ou vento forte)", required: true },
          { id: "nr35-12", text: "Trabalhador apto medicamente para trabalho em altura (ASO válido)", required: true },
          { id: "nr35-13", text: "Ferramentas e materiais amarrados para evitar queda de objetos", required: true },
        ],
      },
    ];

    for (const nr of nrData) {
      await storage.createNrChecklist(nr);
    }
    console.log("Seeded NR checklists");
  }
}
