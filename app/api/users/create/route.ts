import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import {
  withBodyValidation,
  type ValidationSchema,
} from "@/lib/utils/api-validation";
import { logger, maskId } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  // Schéma de validation pour la création d'utilisateur
  const schema: ValidationSchema = {
    email: {
      type: "email",
      required: true,
    },
    full_name: {
      type: "string",
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    phone: {
      type: "string",
      required: false,
      pattern: /^\+?[1-9]\d{1,14}$/,
    },
    organization_id: {
      type: "uuid",
      required: true,
    },
    password: {
      type: "string",
      required: false,
      minLength: 8,
      maxLength: 72, // Bcrypt max length
      customValidator: (value: unknown) => {
        if (!value) return { isValid: true, sanitized: value };

        const password = String(value);
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
          return {
            isValid: false,
            errors: [
              "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre",
            ],
          };
        }

        return { isValid: true, sanitized: password };
      },
    },
    role: {
      type: "string",
      required: false,
      allowedValues: ["super_admin", "admin", "teacher", "student"],
    },
    is_active: {
      type: "boolean",
      required: false,
    },
    send_invitation: {
      type: "boolean",
      required: false,
    },
  };

  return withBodyValidation(request, schema, async (req, validatedData) => {
    try {
      const cookies = req.cookies.getAll();
      logger.info("User Create - Request received", {
        hasCookies: cookies.length > 0,
      });

      // Créer le client Supabase avec les cookies de la requête directement (comme dans le middleware)
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              // Les cookies seront gérés par le middleware
            },
            remove(name: string, options: any) {
              // Les cookies seront gérés par le middleware
            },
          },
        },
      );

      // Vérifier d'abord la session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      logger.info("User Create - Session check", {
        hasSession: !!session,
      });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        logger.error("User Create - Auth failed", authError as Error);
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
      }

      logger.info("User Create - User authenticated", {
        userId: maskId(user.id),
      });

      // Utiliser les données validées
      const {
        email,
        full_name,
        phone,
        organization_id,
        password,
        role,
        is_active,
        send_invitation,
      } = validatedData;

      // Vérifier que l'utilisateur a les permissions pour créer des utilisateurs
      const { data: currentUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        !currentUser ||
        !["super_admin", "admin"].includes(currentUser.role)
      ) {
        return NextResponse.json(
          { error: "Permission refusée" },
          { status: 403 },
        );
      }

      // Créer l'utilisateur dans Auth
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

      const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      let authUser;
      if (password) {
        // Créer avec mot de passe
        logger.info("User Create - Creating auth user with password");

        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: String(email),
            password: String(password),
            email_confirm: true,
            user_metadata: {
              full_name: String(full_name),
              phone: phone ? String(phone) : undefined,
            },
          });

        if (authError) {
          logger.error(
            "User Create - Auth creation failed",
            authError as Error,
          );
          throw authError;
        }
        authUser = authData.user;
        logger.info("User Create - Auth user created", {
          userId: maskId(authUser.id),
        });
      } else if (send_invitation) {
        // Envoyer une invitation
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
              full_name,
              phone,
            },
          });

        if (authError) throw authError;
        authUser = authData.user;
      } else {
        return NextResponse.json(
          { error: "Un mot de passe ou une invitation est requis" },
          { status: 400 },
        );
      }

      if (!authUser) {
        return NextResponse.json(
          { error: "Erreur lors de la création de l'utilisateur" },
          { status: 500 },
        );
      }

      // Créer l'enregistrement dans la table users
      // Utiliser le client admin pour contourner les politiques RLS
      const userRole = role || "teacher";
      const isActive =
        is_active !== undefined
          ? is_active === "true" || is_active === true
          : true;

      logger.info("User Create - Inserting user record", {
        organizationId: maskId(String(organization_id)),
        role: String(userRole),
        isActive,
      });

      const insertData = {
        id: authUser.id,
        email: String(email),
        full_name: String(full_name),
        phone: phone ? String(phone) : null,
        organization_id: String(organization_id),
        role: String(userRole),
        is_active: isActive,
      };

      const { data: newUser, error: userError } = await supabaseAdmin
        .from("users")
        .insert(insertData)
        .select()
        .single();

      if (userError) {
        logger.error("User Create - DB insertion failed", userError as Error, {
          organizationId: maskId(String(organization_id)),
        });

        // Si l'insertion échoue, supprimer l'utilisateur Auth
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUser.id);
          logger.info("User Create - Auth user deleted after DB error");
        } catch (deleteError) {
          logger.error(
            "User Create - Failed to delete auth user",
            deleteError as Error,
          );
        }
        throw userError;
      }

      logger.info("User Create - User created successfully", {
        userId: maskId(newUser.id),
        organizationId: maskId(newUser.organization_id),
        role: newUser.role,
      });

      return NextResponse.json({
        user: newUser,
        message: send_invitation
          ? "Invitation envoyée avec succès"
          : "Utilisateur créé avec succès",
      });
    } catch (error: any) {
      logger.error("User Create - Creation failed", error as Error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur lors de la création de l'utilisateur";

      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 500 },
      );
    }
  });
}
