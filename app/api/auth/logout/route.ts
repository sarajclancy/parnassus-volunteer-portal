import { clearSessionCookie, logout } from "@/lib/portal";

export async function POST(request: Request) {
  await logout(request);

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    }
  );
}
