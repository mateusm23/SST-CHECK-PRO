import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: sessionTtl,
    },
  });
}

export async function setupGoogleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: "/api/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || "";
          const lastName = profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" ") || "";
          const profileImageUrl = profile.photos?.[0]?.value || null;

          await authStorage.upsertUser({
            id: `google-${profile.id}`,
            email: email || "",
            firstName,
            lastName,
            profileImageUrl,
          });

          const user = {
            id: `google-${profile.id}`,
            email,
            firstName,
            lastName,
            profileImageUrl,
            provider: "google",
            claims: {
              sub: `google-${profile.id}`,
              email,
              first_name: firstName,
              last_name: lastName,
              exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
            },
            expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          };

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  app.get("/api/auth/google", (req, res, next) => {
    // Salva o plano desejado na session (se fornecido)
    const planSlug = req.query.plan as string;
    if (planSlug && (planSlug === 'professional' || planSlug === 'business')) {
      (req.session as any).pendingPlanSlug = planSlug;
    }

    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account" // Força Google a sempre mostrar seleção de conta
    })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=auth_failed" }),
    async (req, res) => {
      // Verifica se há um plano pendente na session
      const pendingPlanSlug = (req.session as any).pendingPlanSlug;

      if (pendingPlanSlug) {
        // Remove da session
        delete (req.session as any).pendingPlanSlug;

        try {
          // Importa as dependências necessárias
          const { storage } = await import("../storage");
          const { getUncachableStripeClient } = await import("../stripeClient");

          const user = req.user as any;
          const userId = user.claims.sub;

          // Busca o plano no banco
          const plan = await storage.getSubscriptionPlanBySlug(pendingPlanSlug);

          if (!plan || !plan.stripePriceId) {
            console.error(`Plano ${pendingPlanSlug} não encontrado ou sem Price ID`);
            return res.redirect(`/pricing?error=invalid_plan`);
          }

          const stripe = await getUncachableStripeClient();
          let userSub = await storage.getUserSubscription(userId);

          // Cria ou recupera Customer ID no Stripe
          let customerId = userSub?.stripeCustomerId;
          if (!customerId) {
            const customer = await stripe.customers.create({
              metadata: { userId },
              email: user.email,
            });
            customerId = customer.id;

            if (userSub) {
              await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
            }
          }

          // Cria sessão de checkout do Stripe
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: plan.stripePriceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${req.protocol}://${req.get('host')}/dashboard?success=true`,
            cancel_url: `${req.protocol}://${req.get('host')}/pricing?canceled=true`,
          });

          // Redireciona DIRETO para o Stripe Checkout
          return res.redirect(session.url!);

        } catch (error) {
          console.error("Erro ao criar checkout após login:", error);
          return res.redirect(`/pricing?error=checkout_failed`);
        }
      }

      // Se não há plano pendente, redireciona normalmente pro dashboard
      res.redirect("/dashboard");
    }
  );

  app.get("/api/login", (req, res) => {
    res.redirect("/api/auth/google");
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (user.expires_at && now > user.expires_at) {
    return res.status(401).json({ message: "Session expired" });
  }

  return next();
};
