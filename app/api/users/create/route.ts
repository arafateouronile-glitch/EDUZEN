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
      allowedValues: ["super_admin", "admin", "teacher", "student"],
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
            // Utiliser Resend si disponible
            const { Resend } = await import("resend");
            const resend = new Resend(resendApiKey);
            
            await resend.emails.send({
              from: organization?.email || `noreply@${process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', '').replace('http://', '') || 'eduzen.com'}`,
              to: String(email),
              subject: `Votre compte EDUZEN a été créé - ${organization?.name || 'EDUZEN'}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #335ACF 0%, #6B46C1 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Bienvenue sur EDUZEN</h1>
                  </div>
                  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Bonjour ${String(full_name)},</p>
                    <p>Votre compte a été créé avec succès sur <strong>${organization?.name || 'EDUZEN'}</strong> en tant que <strong>${roleLabel}</strong>.</p>
                    <p>Vous pouvez maintenant accéder à votre compte en utilisant :</p>
                    <ul style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <li><strong>Email :</strong> ${String(email)}</li>
                      <li><strong>Mot de passe :</strong> Le mot de passe qui vous a été assigné</li>
                    </ul>
                    <p>Pour vous connecter, cliquez sur le bouton ci-dessous :</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${loginUrl}" style="display: inline-block; background: #335ACF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon compte</a>
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 30px;">Ou copiez-collez ce lien dans votre navigateur :</p>
                    <p style="font-size: 12px; color: #335ACF; word-break: break-all;">${loginUrl}</p>
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                      <p style="margin: 0; font-size: 14px;"><strong>💡 Astuce :</strong> Si vous souhaitez changer votre mot de passe, vous pouvez utiliser la fonctionnalité "Mot de passe oublié" sur la page de connexion.</p>
                    </div>
                    <p style="margin-top: 30px;">Si vous n'avez pas demandé la création de ce compte, veuillez contacter l'administrateur.</p>
                    <p style="margin-top: 20px;">Cordialement,<br>L'équipe EDUZEN</p>
                  </div>
                </body>
                </html>
              `,
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
    } catch (error: any) {
      logger.error("User Create - Creation failed", error as Error, {
        errorDetails: error,
      });

      // Si c'est une erreur de validation, retourner 400
      if (error?.code === 'VALIDATION_ERROR' || error?.message?.includes('validation')) {
        return NextResponse.json(
          {
            error: error.message || "Erreur de validation des données",
            details: error.errors || error.details,
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
          details: error?.code || error?.hint || null,
        },
        { status: error?.status || 500 },
      );
    }
  });
}
