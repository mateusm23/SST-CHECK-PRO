import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  monthlyLimit: integer("monthly_limit").notNull(),
  canUploadLogo: boolean("can_upload_logo").default(false),
  stripePriceId: text("stripe_price_id"),
  price: integer("price").default(0),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  companyId: integer("company_id").references(() => companies.id),
  title: text("title").notNull(),
  location: text("location"),
  inspectorName: text("inspector_name"),
  inspectionDate: timestamp("inspection_date").default(sql`CURRENT_TIMESTAMP`),
  status: text("status").default("draft"),
  checklistData: jsonb("checklist_data"),
  overallScore: integer("overall_score"),
  observations: text("observations"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const inspectionPhotos = pgTable("inspection_photos", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  category: text("category"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const actionPlans = pgTable("action_plans", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  issue: text("issue").notNull(),
  recommendation: text("recommendation").notNull(),
  priority: text("priority").default("medium"),
  responsible: text("responsible"),
  deadline: timestamp("deadline"),
  status: text("status").default("pending"),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const nrChecklists = pgTable("nr_checklists", {
  id: serial("id").primaryKey(),
  nrNumber: text("nr_number").notNull(),
  nrName: text("nr_name").notNull(),
  category: text("category").notNull(),
  items: jsonb("items").notNull(),
});

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  company: one(companies, {
    fields: [inspections.companyId],
    references: [companies.id],
  }),
  photos: many(inspectionPhotos),
  actionPlans: many(actionPlans),
}));

export const inspectionPhotosRelations = relations(inspectionPhotos, ({ one }) => ({
  inspection: one(inspections, {
    fields: [inspectionPhotos.inspectionId],
    references: [inspections.id],
  }),
}));

export const actionPlansRelations = relations(actionPlans, ({ one }) => ({
  inspection: one(inspections, {
    fields: [actionPlans.inspectionId],
    references: [inspections.id],
  }),
}));

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertInspectionSchema = createInsertSchema(inspections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInspectionPhotoSchema = createInsertSchema(inspectionPhotos).omit({ id: true, createdAt: true });
export const insertActionPlanSchema = createInsertSchema(actionPlans).omit({ id: true, createdAt: true });
export const insertNrChecklistSchema = createInsertSchema(nrChecklists).omit({ id: true });

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type InspectionPhoto = typeof inspectionPhotos.$inferSelect;
export type InsertInspectionPhoto = z.infer<typeof insertInspectionPhotoSchema>;
export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = z.infer<typeof insertActionPlanSchema>;
export type NrChecklist = typeof nrChecklists.$inferSelect;
export type InsertNrChecklist = z.infer<typeof insertNrChecklistSchema>;

export type CreateInspectionRequest = InsertInspection;
export type UpdateInspectionRequest = Partial<InsertInspection>;
export type InspectionResponse = Inspection;
export type CreateActionPlanRequest = InsertActionPlan;
export type CreateCompanyRequest = InsertCompany;
