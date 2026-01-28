import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";
import { logger, maskId, sanitizeError } from "@/lib/utils/logger";
import {
  withBodyValidation,
  type ValidationSchema,
} from "@/lib/utils/api-validation";
import {
  validateEmail,
  validateString,
  type ValidationResult,
} from "@/lib/utils/input-validation";

// Configuration Resend
// Pour activer l'envoi réel d'emails :
// 1. Créez un compte sur https://resend.com
// 2. Obtenez votre clé API
// 3. Ajoutez RESEND_API_KEY dans .env.local
// 4. Le code utilisera automatiquement Resend si la clé est présente

interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export async function POST(request: NextRequest) {
  // Schéma de validation pour l'envoi d'email
  const schema: ValidationSchema = {
    to: {
      type: "string",
      required: true,
      customValidator: (value: unknown) => {
        // Peut être une chaîne ou un tableau d'emails
        const emails = typeof value === "string" ? [value] : value;
        if (!Array.isArray(emails)) {
          return { isValid: false, errors: ["Destinataire invalide"] };
        }

        const errors: string[] = [];
        for (const email of emails) {
          try {
            validateEmail(String(email));
          } catch {
            errors.push(`Email invalide: ${email}`);
          }
        }

        if (errors.length > 0) {
          return { isValid: false, errors };
        }

        return { isValid: true, sanitized: emails.join(',') };
      },
    },
    subject: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 200,
    },
    html: {
      type: "html",
      required: false,
      maxLength: 100000, // 100KB
    },
    text: {
      type: "string",
      required: false,
      maxLength: 50000,
    },
    cc: {
      type: "string",
      required: false,
    },
    bcc: {
      type: "string",
      required: false,
    },
    replyTo: {
      type: "email",
      required: false,
    },
  };

  return withBodyValidation(request, schema, async (req, validatedData) => {
    try {
      // Créer le client Supabase avec les cookies de la requête
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies
                .getAll()
                .map((c) => ({ name: c.name, value: c.value }));
            },
            setAll(cookiesToSet) {
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
        logger.error("Email Send - Auth failed", authError as Error);
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
      }

      logger.info("Email Send - Request received", {
        userId: maskId(user.id),
      });

      // Utiliser les données validées
      const { to, subject, html, text, cc, bcc, replyTo } = validatedData;
      const attachments = (validatedData as any).attachments as
        | EmailAttachment[]
        | undefined;

      // Récupérer l'organisation de l'utilisateur
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id, organization:organizations(*)")
        .eq("id", user.id)
        .single();

      if (!userData?.organization_id) {
        return NextResponse.json(
          { error: "Organisation non trouvée" },
          { status: 400 },
        );
      }

      const organization = userData.organization as {
        name: string;
        email?: string;
        phone?: string;
      };

      // NOTE: Fonctionnalité prévue - Intégrer avec un service d'email réel
      // Options: Resend (recommandé), SendGrid, ou AWS SES
      // Configurer les variables d'environnement: RESEND_API_KEY ou SENDGRID_API_KEY
      // Pour l'instant, on simule l'envoi et on log

      const recipients = Array.isArray(to) ? to : [String(to)];
      const emailData = {
        from:
          organization.email ||
          `noreply@${organization.name.toLowerCase().replace(/\s+/g, "")}.com`,
        to: recipients,
        subject: String(subject),
        html: html ? String(html) : text ? String(text) : undefined,
        text: text
          ? String(text)
          : html
            ? String(html).replace(/<[^>]*>/g, "")
            : undefined,
        attachments: attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
        })),
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        replyTo: replyTo || organization.email,
      };

      // Vérifier si Resend est configuré
      const resendApiKey = process.env.RESEND_API_KEY;
      const isTestMode =
        !resendApiKey || process.env.NODE_ENV === "development";

      if (isTestMode) {
        // Mode test : log l'email au lieu de l'envoyer
        logger.info("Email Send - Test mode", {
          to: recipients,
          subject: String(subject),
          from: emailData.from,
          attachmentsCount: attachments?.length || 0,
          organizationId: maskId(userData.organization_id),
        });

        // En mode test, on simule un envoi réussi
        return NextResponse.json({
          success: true,
          message:
            "Email simulé avec succès (mode test - aucun email réel envoyé)",
          testMode: true,
          emailData: {
            to: recipients,
            subject,
            from: emailData.from,
          },
        });
      }

      // Mode production : utiliser Resend
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        const { data, error } = await resend.emails.send({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          attachments: emailData.attachments?.map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.content, "base64"),
          })),
          cc: emailData.cc,
          bcc: emailData.bcc,
          replyTo: emailData.replyTo as string | undefined,
        } as any);

        if (error) {
          logger.error("Email Send - Resend error", error as Error, {
            to: recipients,
            subject: String(subject),
          });
          throw error;
        }

        logger.info("Email Send - Success via Resend", {
          to: recipients,
          subject: String(subject),
          resendId: data?.id,
        });

        return NextResponse.json({
          success: true,
          message: "Email envoyé avec succès",
          data: {
            id: data?.id,
            to: recipients,
          },
        });
      } catch (resendError) {
        logger.error("Email Send - Send failed", resendError as Error, {
          error: sanitizeError(resendError),
        });
        throw resendError;
      }
    } catch (error) {
      logger.error("Email Send - Failed", error as Error, {
        error: sanitizeError(error),
      });
      return NextResponse.json(
        {
          error: "Erreur lors de l'envoi de l'email",
          message: error instanceof Error ? error.message : "Erreur inconnue",
        },
        { status: 500 },
      );
    }
  });
}
