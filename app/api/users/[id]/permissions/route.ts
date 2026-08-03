import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logger, maskId } from "@/lib/utils/logger";
import { withDistributedRateLimit } from "@/lib/utils/rate-limiter-distributed";

// Rôles pouvant configurer les accès des autres utilisateurs de leur organisation
const ADMIN_ROLES = ["super_admin", "admin", "secretary", "accountant"];

async function patchPermissions(request: NextRequest, targetUserId: string) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const navAccess = (body as { nav_access?: unknown } | null)?.nav_access ?? null;
    if (
      navAccess !== null &&
      (!Array.isArray(navAccess) || navAccess.some((h) => typeof h !== "string" || !h.startsWith("/")))
    ) {
      return NextResponse.json(
        { error: "nav_access doit être un tableau de chemins ou null" },
        { status: 400 },
      );
    }

    // Client lié à la session de l'appelant (cookies), pour l'authentifier
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      },
    );

    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: callerRow } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", caller.id)
      .single();

    if (!callerRow || !ADMIN_ROLES.includes(callerRow.role)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      logger.error("User Permissions - SUPABASE_SERVICE_ROLE_KEY non configurée");
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 503 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from("users")
      .select("id, role, organization_id")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (targetUser.organization_id !== callerRow.organization_id) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    if (targetUser.role === "super_admin") {
      return NextResponse.json(
        { error: "Impossible de restreindre les accès d'un super administrateur" },
        { status: 403 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ permissions: navAccess === null ? null : { nav_access: navAccess } })
      .eq("id", targetUserId);

    if (updateError) {
      logger.error("User Permissions - Update failed", updateError as Error, {
        targetUserId: maskId(targetUserId),
      });
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    logger.info("User Permissions - Updated", {
      callerId: maskId(caller.id),
      targetUserId: maskId(targetUserId),
      navAccessCount: navAccess === null ? null : navAccess.length,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error("User Permissions - Unexpected error", error as Error);
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withDistributedRateLimit(request, "mutation", (req) =>
    patchPermissions(req as NextRequest, id),
  );
}
