import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { logger, maskId, sanitizeError } from "@/lib/utils/logger";
import { createAdminClient } from "@/lib/supabase/admin";
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

        if (emails.length > 50) {
          return { isValid: false, errors: ["Trop de destinataires (max 50)"] };
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
    template_type: {
      type: "string",
      required: false,
      maxLength: 100,
    },
  };

  return withBodyValidation(request, schema, async (req, validatedData, rawBody) => {
    try {
      // Pièces jointes : non validées par le schéma (contenu base64 volumineux), lues depuis le body brut
      const attachments = Array.isArray(rawBody?.attachments)
        ? (rawBody.attachments as EmailAttachment[])
        : undefined;

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
      const { to, subject, html, text, cc, bcc, replyTo, template_type } = validatedData;

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

      const organization = (userData.organization as {
        name?: string;
        email?: string;
        phone?: string;
      } | null) ?? {};
      // Reply-to = email de l'organisation pour que les réponses aillent au bon contact
      const orgEmail =
        organization.email ?? process.env.EMAIL_FROM ?? "noreply@eduzen.io";

      const recipients = Array.isArray(to) ? to : [String(to)];
      // Domaine vérifié Resend : eduzen.io. Tous les envois partent de noreply@eduzen.io (ou EMAIL_FROM si défini), quel que soit l'organisation.
      const fromAddress =
        process.env.EMAIL_FROM || "noreply@eduzen.io";
      const emailData = {
        from: fromAddress,
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
        replyTo: replyTo || orgEmail,
      };

      // Vérifier si Resend est configuré : sans clé = mode test (aucun envoi réel)
      const resendApiKey = process.env.RESEND_API_KEY;
      const isTestMode = !resendApiKey;

      if (isTestMode) {
        // Mode test : log l'email au lieu de l'envoyer
        logger.info("Email Send - Test mode", {
          to: recipients,
          subject: String(subject),
          from: emailData.from,
          attachmentsCount: attachments?.length || 0,
          organizationId: maskId(userData.organization_id),
        });

        // Insérer dans email_logs même en mode test pour traçabilité sur /dashboard/suivi
        // Utilise l'admin client pour bypasser la RLS (pas de policy INSERT pour authenticated)
        try {
          await createAdminClient().from("email_logs").insert({
            recipient: recipients[0],
            subject: String(subject),
            template_type: template_type ? String(template_type) : null,
            organization_id: userData.organization_id,
            resend_id: null,
            status: "sent",
            metadata: { recipients, test_mode: true },
          });
        } catch (logError) {
          logger.warn("Email Send - Failed to insert test email_log", { error: logError instanceof Error ? logError.message : String(logError) });
        }

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
        } as Parameters<typeof resend.emails.send>[0]);

        if (error) {
          const rawMessage =
            typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: unknown }).message)
              : "Erreur Resend";
          const errMessage =
            rawMessage.includes("only send testing emails to your own")
              ? "Avec l'adresse de test Resend (onboarding@resend.dev), vous ne pouvez envoyer qu'à l'adresse de votre compte Resend. Pour envoyer à d'autres destinataires (ex. apprenants), vérifiez un domaine sur https://resend.com/domains et utilisez une adresse de ce domaine."
              : rawMessage.includes("domain is not verified")
                ? "Le domaine de l'adresse d'envoi n'est pas vérifié chez Resend. Ajoutez et vérifiez votre domaine sur https://resend.com/domains, ou en développement utilisez l'adresse de test (voir .env EMAIL_FROM)."
                : rawMessage;
          logger.error("Email Send - Resend error", error as Error, {
            to: recipients,
            subject: String(subject),
          });
          return NextResponse.json(
            {
              error: "Erreur lors de l'envoi de l'email",
              message: errMessage,
            },
            { status: 500 },
          );
        }

        logger.info("Email Send - Success via Resend", {
          to: recipients,
          subject: String(subject),
          resendId: data?.id,
        });

        // Insérer dans email_logs pour traçabilité (checklist Qualiopi, timeline CRM, etc.)
        // Utilise l'admin client pour bypasser la RLS (pas de policy INSERT pour authenticated)
        try {
          await createAdminClient().from("email_logs").insert({
            recipient: recipients[0],
            subject: String(subject),
            template_type: template_type ? String(template_type) : null,
            organization_id: userData.organization_id,
            resend_id: data?.id ?? null,
            status: "sent",
            metadata: { recipients },
          });
        } catch (logError) {
          // Non-bloquant : l'email est envoyé, on logue juste l'erreur
          logger.error("Email Send - Failed to insert email_log", logError as Error);
        }

        return NextResponse.json({
          success: true,
          message: "Email envoyé avec succès",
          data: {
            id: data?.id,
            to: recipients,
          },
        });
      } catch (resendError) {
        const errMessage =
          resendError instanceof Error
            ? resendError.message
            : typeof resendError === "object" &&
                resendError !== null &&
                "message" in resendError
              ? String((resendError as { message: unknown }).message)
              : "Erreur lors de l'envoi (Resend)";
        logger.error("Email Send - Send failed", resendError as Error, {
          error: sanitizeError(resendError),
        });
        return NextResponse.json(
          {
            error: "Erreur lors de l'envoi de l'email",
            message: errMessage,
          },
          { status: 500 },
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Erreur inconnue";
      logger.error("Email Send - Failed", error as Error, {
        error: sanitizeError(error),
      });
      return NextResponse.json(
        {
          error: "Erreur lors de l'envoi de l'email",
          message,
        },
        { status: 500 },
      );
    }
  });
}
