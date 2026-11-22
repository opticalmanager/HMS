import { NextResponse, type NextRequest } from "next/server";
import { NotificationDomainService } from "@/services/domain/notification-service";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = env.INTERNAL_CRON_SECRET;

    let isAuthorized = false;

    // Check Cron Bearer Secret
    if (cronSecret && authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token === cronSecret) {
        isAuthorized = true;
      }
    }

    // Fallback: Check owner/admin session
    if (!isAuthorized) {
      try {
        await requireClinicSession(
          { organization: ["update"] },
          { headers: request.headers, redirectIfUnauthorized: false }
        );
        isAuthorized = true;
      } catch {
        // Not authorized via session either
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing cron secret / clinic admin session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchSize = searchParams.get("batchSize")
      ? parseInt(searchParams.get("batchSize")!, 10)
      : 20;

    const result = await NotificationDomainService.dispatchPendingOutboxEvents({
      batchSize,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
