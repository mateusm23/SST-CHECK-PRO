import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import { generateActionPlans } from "./geminiService";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { subscriptionPlans } from "@shared/schema";
import { db } from "./db";

// VIP emails with full unlimited access
const VIP_EMAILS = [
  "mateusnunesmonteiro@gmail.com",
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.subscription.current.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = (req.user.email || req.user.claims?.email || "").toLowerCase().trim();
      
      // Check if user is VIP (full unlimited access)
      const isVIP = VIP_EMAILS.some(vip => vip.toLowerCase() === userEmail);
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
    } catch (error) {
      console.error("Checkout error:", error);
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
      const isVIP = VIP_EMAILS.some(vip => vip.toLowerCase() === userEmail);
      
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
      const inspection = await storage.getInspection(Number(req.params.id));
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
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
      const input = api.inspections.update.input.parse(req.body);
      const inspection = await storage.updateInspection(Number(req.params.id), input);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inspection" });
    }
  });

  app.delete(api.inspections.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspection(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inspection" });
    }
  });

  app.post(api.inspections.complete.path, isAuthenticated, async (req: any, res) => {
    try {
      const inspection = await storage.updateInspection(Number(req.params.id), { 
        status: "completed" 
      });
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
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
  if (existingPlans.length === 0) {
    await db.insert(subscriptionPlans).values([
      {
        name: "Grátis",
        slug: "free",
        monthlyLimit: 1,
        canUploadLogo: false,
        price: 0,
      },
      {
        name: "Profissional",
        slug: "professional",
        monthlyLimit: 30,
        canUploadLogo: true,
        price: 2990,
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || null,
      },
      {
        name: "Negócios",
        slug: "business",
        monthlyLimit: -1,
        canUploadLogo: true,
        price: 14990,
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
          { id: "nr6-1", text: "EPIs disponíveis e em bom estado", required: true },
          { id: "nr6-2", text: "CA (Certificado de Aprovação) válido", required: true },
          { id: "nr6-3", text: "Trabalhadores treinados no uso de EPIs", required: true },
          { id: "nr6-4", text: "Registro de entrega de EPIs", required: true },
          { id: "nr6-5", text: "Higienização adequada dos EPIs", required: false },
        ],
      },
      {
        nrNumber: "NR-10",
        nrName: "Segurança em Instalações e Serviços em Eletricidade",
        category: "Eletricidade",
        items: [
          { id: "nr10-1", text: "Profissionais habilitados e autorizados", required: true },
          { id: "nr10-2", text: "Prontuário de instalações elétricas atualizado", required: true },
          { id: "nr10-3", text: "Esquemas unifilares atualizados", required: true },
          { id: "nr10-4", text: "Procedimentos de trabalho documentados", required: true },
          { id: "nr10-5", text: "Sinalização de segurança adequada", required: true },
        ],
      },
      {
        nrNumber: "NR-12",
        nrName: "Segurança no Trabalho em Máquinas e Equipamentos",
        category: "Máquinas",
        items: [
          { id: "nr12-1", text: "Proteções fixas e móveis instaladas", required: true },
          { id: "nr12-2", text: "Dispositivos de parada de emergência funcionando", required: true },
          { id: "nr12-3", text: "Manual de instruções disponível", required: true },
          { id: "nr12-4", text: "Sinalização de segurança nas máquinas", required: true },
          { id: "nr12-5", text: "Manutenção preventiva em dia", required: true },
        ],
      },
      {
        nrNumber: "NR-35",
        nrName: "Trabalho em Altura",
        category: "Altura",
        items: [
          { id: "nr35-1", text: "Trabalhadores com treinamento válido", required: true },
          { id: "nr35-2", text: "Análise de Risco realizada", required: true },
          { id: "nr35-3", text: "Permissão de Trabalho emitida", required: true },
          { id: "nr35-4", text: "Equipamentos de proteção contra quedas", required: true },
          { id: "nr35-5", text: "Ponto de ancoragem adequado", required: true },
        ],
      },
    ];

    for (const nr of nrData) {
      await storage.createNrChecklist(nr);
    }
    console.log("Seeded NR checklists");
  }
}
