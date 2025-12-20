import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./googleAuth";

const ADMIN_USER_ID = "admin-test-user";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // Return the full authenticated user object from session
      // This includes claims, expires_at, and other auth info
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        provider: user.provider,
        claims: user.claims,
        expires_at: user.expires_at,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin login for testing
  app.post("/api/auth/admin-login", async (req: any, res) => {
    try {
      const { email, password } = req.body;

      const adminEmail = process.env.ADMIN_TEST_EMAIL;
      const adminPassword = process.env.ADMIN_TEST_PASSWORD;

      if (!adminEmail || !adminPassword) {
        return res.status(503).json({ message: "Login de admin não configurado" });
      }

      if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Upsert admin user in database
      await authStorage.upsertUser({
        id: ADMIN_USER_ID,
        email: adminEmail,
        firstName: "Administrador",
        lastName: "SST Check Pro",
        profileImageUrl: null,
      });

      // Set up session like Replit Auth does
      const futureExpiry = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 1 week
      req.user = {
        claims: {
          sub: ADMIN_USER_ID,
          email: adminEmail,
          first_name: "Administrador",
          last_name: "SST Check Pro",
          exp: futureExpiry,
        },
        expires_at: futureExpiry,
        isAdmin: true,
      };

      // Serialize user to session
      req.login(req.user, (err: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Erro ao fazer login" });
        }
        res.json({ 
          success: true, 
          user: {
            id: ADMIN_USER_ID,
            email: adminEmail,
            firstName: "Administrador",
            lastName: "SST Check Pro",
          }
        });
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Erro no login de admin" });
    }
  });
}
