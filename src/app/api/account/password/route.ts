import { getAuthenticatedUser } from "@/lib/auth/session";
import { changeUserPassword } from "@/lib/services/account-security-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await changeUserPassword({
      userId: user.id,
      currentPassword: String(body.currentPassword ?? ""),
      newPassword: String(body.newPassword ?? ""),
      confirmPassword: String(body.confirmPassword ?? ""),
      actorId: user.id,
      actorName: user.name,
    });

    if (!result.ok) {
      return Response.json({ message: result.message }, { status: 400 });
    }

    return Response.json({ message: result.message }, { status: 200 });
  } catch {
    return Response.json({ message: "Unable to change password at this time." }, { status: 500 });
  }
}
