import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  withBodyValidation,
  type ValidationSchema,
} from "@/lib/utils/api-validation";
import { logger, maskId } from "@/lib/utils/logger";
import { withDistributedRateLimit } from "@/lib/utils/rate-limiter-distributed";

async function postCreateUser(request: NextRequest) {
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
      // Pas de validation de format : accepter n'importe quel format de téléphone
      // Le téléphone est optionnel et non bloquant
      customValidator: (value: unknown) => {
        if (!value || value === '' || value === null) {
          return { isValid: true, sanitized: undefined };
        }
        // Accepter n'importe quel format de téléphone sans validation stricte
        const phoneStr = String(value).trim();
        if (phoneStr === '') {
          return { isValid: true, sanitized: undefined };
        }
        // Retourner la valeur telle quelle, sans validation de format
        return { isValid: true, sanitized: phoneStr };
      },
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
        if (!value) return { isValid: true, sanitized: undefined };

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
      allowedValues: ["super_admin", "admin", "teacher", "secretary", "accountant", "parent", "student"],
    },
    is_active: {
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
            set(name: string, value: string, _options?: unknown) {
              // Les cookies seront gérés par le middleware
            },
            remove(name: string, _options?: unknown) {
              // Les cookies seront gérés par le middleware
            },
          },
        },
      );

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
      } = validatedData;

      // Vérifier que l'utilisateur a les permissions et appartient à l'organisation cible
      const { data: currentUser } = await supabase
        .from("users")
        .select("role, organization_id")
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

      // Un admin ne peut créer des utilisateurs que dans sa propre organisation (sauf super_admin)
      if (currentUser.role !== "super_admin" && currentUser.organization_id !== organization_id) {
        return NextResponse.json(
          { error: "Vous ne pouvez créer des utilisateurs que dans votre organisation" },
          { status: 403 },
        );
      }

      // Créer l'utilisateur dans Auth (service role obligatoire, pas de fallback anon)
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseServiceKey) {
        logger.error("User Create - SUPABASE_SERVICE_ROLE_KEY non configurée");
        return NextResponse.json(
          { error: "Configuration serveur manquante" },
          { status: 503 }
        );
      }

      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseServiceKey,
        {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Créer l'utilisateur avec mot de passe (toujours requis)
      if (!password) {
        return NextResponse.json(
          { error: "Un mot de passe est requis" },
          { status: 400 },
        );
      }

      logger.info("User Create - Creating auth user with password");

      const { data: authData, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: String(email),
          password: String(password),
          email_confirm: true,
          user_metadata: {
            full_name: String(full_name),
            phone: phone ? String(phone) : undefined,
          },
        });

      if (createAuthError) {
        logger.error(
          "User Create - Auth creation failed",
          createAuthError as Error,
        );
        throw createAuthError;
      }

      const authUser = authData.user;
      logger.info("User Create - Auth user created", {
        userId: maskId(authUser.id),
      });

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
          ? (typeof is_active === 'string' ? is_active === "true" : is_active === true)
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

      // Envoyer un email de confirmation automatiquement (sauf pour les étudiants)
      if (userRole !== 'student') {
        try {
          // Récupérer les informations de l'organisation pour l'email
          const { data: organization } = await supabaseAdmin
            .from('organizations')
            .select('name, email')
            .eq('id', organization_id)
            .single();

          const { APP_URLS } = await import('@/lib/config/app-config')
          const loginUrl = `${APP_URLS.getBaseUrl()}/auth/login`;
          const roleLabel = userRole === 'admin' ? 'Administrateur' : userRole === 'teacher' ? 'Enseignant' : userRole === 'secretary' ? 'Secrétaire' : userRole === 'accountant' ? 'Comptable' : userRole;

          // Envoyer l'email de confirmation
          const resendApiKey = process.env.RESEND_API_KEY;
          
          if (resendApiKey) {
            // Utiliser Resend si disponible — toujours envoyer depuis un domaine vérifié (audit B7)
            const { Resend } = await import("resend");
            const resend = new Resend(resendApiKey);
            const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'EDUZEN <noreply@eduzen.io>';

            await resend.emails.send({
              from: fromEmail,
              to: String(email),
              subject: `Votre compte EDUZEN a été créé - ${organization?.name || 'EDUZEN'}`,
              html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${String(full_name)},</p>

            <p style="margin:0 0 20px;">Votre compte a été créé sur <strong>${organization?.name || 'EduZen'}</strong> en tant que <strong>${roleLabel}</strong>.</p>

            <p style="margin:0 0 20px;">Vous pouvez vous connecter avec :<br>
            Email : ${String(email)}<br>
            Mot de passe : le mot de passe qui vous a été assigné</p>

            <p style="margin:0 0 20px;">
              <a href="${loginUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Accéder à mon compte</a>
            </p>

            <p style="margin:0 0 20px;font-size:14px;color:#555;">Ou copiez-collez ce lien dans votre navigateur : <a href="${loginUrl}" style="color:#555;word-break:break-all;">${loginUrl}</a></p>

            <p style="margin:0 0 20px;font-size:14px;color:#555;">Si vous souhaitez changer votre mot de passe, utilisez la fonctionnalité "Mot de passe oublié" sur la page de connexion.</p>

            <p style="margin:0 0 20px;">Si vous n'avez pas demandé la création de ce compte, veuillez contacter l'administrateur.</p>

            <p style="margin:0 0 40px;">Cordialement,</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              L'équipe EduZen
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
              text: `
                Bienvenue sur EDUZEN

                Bonjour ${String(full_name)},

                Votre compte a été créé avec succès sur ${organization?.name || 'EDUZEN'} en tant que ${roleLabel}.

                Vous pouvez maintenant accéder à votre compte en utilisant :
                - Email : ${String(email)}
                - Mot de passe : Le mot de passe qui vous a été assigné

                Pour vous connecter, accédez à : ${loginUrl}

                Astuce : Si vous souhaitez changer votre mot de passe, vous pouvez utiliser la fonctionnalité "Mot de passe oublié" sur la page de connexion.

                Si vous n'avez pas demandé la création de ce compte, veuillez contacter l'administrateur.

                Cordialement,
                L'équipe EDUZEN
              `,
            });

            logger.info("User Create - Confirmation email sent successfully via Resend", {
              email: String(email),
            });
          } else {
            // Mode test : logger l'email
            logger.info("User Create - Confirmation email (test mode)", {
              email: String(email),
              loginUrl,
              organization: organization?.name,
              role: roleLabel,
            });
          }
        } catch (emailError) {
          logger.error("User Create - Failed to send confirmation email", emailError as Error);
          // Ne pas bloquer la création si l'envoi d'email échoue
        }
      }

      return NextResponse.json({
        user: newUser,
        message: userRole !== 'student'
          ? "Utilisateur créé avec succès. Un email de confirmation a été envoyé."
          : "Utilisateur créé avec succès",
      });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; errors?: unknown; details?: unknown; hint?: string; status?: number }
      logger.error("User Create - Creation failed", error as Error, {
        errorDetails: error,
      });

      // Si c'est une erreur de validation, retourner 400
      if (err?.code === 'VALIDATION_ERROR' || (typeof err?.message === 'string' && err.message.includes('validation'))) {
        return NextResponse.json(
          {
            error: err?.message ?? "Erreur de validation des données",
            details: err?.errors ?? err?.details,
          },
          { status: 400 },
        );
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur lors de la création de l'utilisateur";

      return NextResponse.json(
        {
          error: errorMessage,
          details: err?.code ?? err?.hint ?? null,
        },
        { status: err?.status ?? 500 },
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withDistributedRateLimit(request, 'auth', (req) =>
    postCreateUser(req as NextRequest)
  );
}
