import { db } from "./db";
import {
  subscriptionPlans,
  userSubscriptions,
  companies,
  inspections,
  inspectionPhotos,
  actionPlans,
  nrChecklists,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UserSubscription,
  type InsertUserSubscription,
  type Company,
  type InsertCompany,
  type Inspection,
  type InsertInspection,
  type InspectionPhoto,
  type InsertInspectionPhoto,
  type ActionPlan,
  type InsertActionPlan,
  type NrChecklist,
  type InsertNrChecklist,
} from "@shared/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

export interface IStorage {
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlanBySlug(slug: string): Promise<SubscriptionPlan | undefined>;
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  createUserSubscription(sub: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(userId: string, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined>;
  getInspectionsCountThisMonth(userId: string): Promise<number>;

  getCompanies(userId: string): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company | undefined>;

  getInspections(userId: string): Promise<Inspection[]>;
  getInspection(id: number): Promise<Inspection | undefined>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: number, updates: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: number): Promise<void>;

  getInspectionPhotos(inspectionId: number): Promise<InspectionPhoto[]>;
  createInspectionPhoto(photo: InsertInspectionPhoto): Promise<InspectionPhoto>;
  deleteInspectionPhoto(id: number): Promise<void>;

  getActionPlans(inspectionId: number): Promise<ActionPlan[]>;
  createActionPlan(plan: InsertActionPlan): Promise<ActionPlan>;
  updateActionPlan(id: number, updates: Partial<InsertActionPlan>): Promise<ActionPlan | undefined>;

  getNrChecklists(): Promise<NrChecklist[]>;
  getNrChecklist(id: number): Promise<NrChecklist | undefined>;
  createNrChecklist(checklist: InsertNrChecklist): Promise<NrChecklist>;

  getDashboardStats(userId: string): Promise<{
    totalInspections: number;
    completedThisMonth: number;
    pendingActionPlans: number;
    averageScore: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans);
  }

  async getSubscriptionPlanBySlug(slug: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, slug));
    return plan;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return sub;
  }

  async createUserSubscription(sub: InsertUserSubscription): Promise<UserSubscription> {
    const [created] = await db.insert(userSubscriptions).values(sub).returning();
    return created;
  }

  async updateUserSubscription(userId: string, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined> {
    const [updated] = await db.update(userSubscriptions).set(updates).where(eq(userSubscriptions.userId, userId)).returning();
    return updated;
  }

  async getInspectionsCountThisMonth(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(inspections)
      .where(and(
        eq(inspections.userId, userId),
        gte(inspections.createdAt, startOfMonth)
      ));
    return result[0]?.count || 0;
  }

  async getCompanies(userId: string): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.userId, userId)).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    return updated;
  }

  async getInspections(userId: string): Promise<Inspection[]> {
    return await db.select().from(inspections).where(eq(inspections.userId, userId)).orderBy(desc(inspections.createdAt));
  }

  async getInspection(id: number): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
    return inspection;
  }

  async createInspection(inspection: InsertInspection): Promise<Inspection> {
    const [created] = await db.insert(inspections).values(inspection).returning();
    return created;
  }

  async updateInspection(id: number, updates: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const [updated] = await db.update(inspections).set({ ...updates, updatedAt: new Date() }).where(eq(inspections.id, id)).returning();
    return updated;
  }

  async deleteInspection(id: number): Promise<void> {
    await db.delete(inspections).where(eq(inspections.id, id));
  }

  async getInspectionPhotos(inspectionId: number): Promise<InspectionPhoto[]> {
    return await db.select().from(inspectionPhotos).where(eq(inspectionPhotos.inspectionId, inspectionId));
  }

  async createInspectionPhoto(photo: InsertInspectionPhoto): Promise<InspectionPhoto> {
    const [created] = await db.insert(inspectionPhotos).values(photo).returning();
    return created;
  }

  async deleteInspectionPhoto(id: number): Promise<void> {
    await db.delete(inspectionPhotos).where(eq(inspectionPhotos.id, id));
  }

  async getActionPlans(inspectionId: number): Promise<ActionPlan[]> {
    return await db.select().from(actionPlans).where(eq(actionPlans.inspectionId, inspectionId));
  }

  async createActionPlan(plan: InsertActionPlan): Promise<ActionPlan> {
    const [created] = await db.insert(actionPlans).values(plan).returning();
    return created;
  }

  async updateActionPlan(id: number, updates: Partial<InsertActionPlan>): Promise<ActionPlan | undefined> {
    const [updated] = await db.update(actionPlans).set(updates).where(eq(actionPlans.id, id)).returning();
    return updated;
  }

  async getNrChecklists(): Promise<NrChecklist[]> {
    return await db.select().from(nrChecklists);
  }

  async getNrChecklist(id: number): Promise<NrChecklist | undefined> {
    const [checklist] = await db.select().from(nrChecklists).where(eq(nrChecklists.id, id));
    return checklist;
  }

  async createNrChecklist(checklist: InsertNrChecklist): Promise<NrChecklist> {
    const [created] = await db.insert(nrChecklists).values(checklist).returning();
    return created;
  }

  async getDashboardStats(userId: string): Promise<{
    totalInspections: number;
    completedThisMonth: number;
    pendingActionPlans: number;
    averageScore: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(inspections)
      .where(eq(inspections.userId, userId));

    const [completedResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(inspections)
      .where(and(
        eq(inspections.userId, userId),
        eq(inspections.status, "completed"),
        gte(inspections.createdAt, startOfMonth)
      ));

    const [pendingResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(actionPlans)
      .innerJoin(inspections, eq(actionPlans.inspectionId, inspections.id))
      .where(and(
        eq(inspections.userId, userId),
        eq(actionPlans.status, "pending")
      ));

    const [avgResult] = await db.select({ avg: sql<number>`coalesce(avg(overall_score), 0)::int` })
      .from(inspections)
      .where(and(
        eq(inspections.userId, userId),
        sql`overall_score IS NOT NULL`
      ));

    return {
      totalInspections: totalResult?.count || 0,
      completedThisMonth: completedResult?.count || 0,
      pendingActionPlans: pendingResult?.count || 0,
      averageScore: avgResult?.avg || 0,
    };
  }
}

export const storage = new DatabaseStorage();
