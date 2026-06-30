import { createSessionCookie, login } from "@/lib/portal";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const result = await login(payload.email ?? "", payload.password ?? "");

  if (!result) {
    return Response.json(
      { error: "Email or password did not match." },
      { status: 401 }
    );
  }

  return Response.json(
    { account: result.account },
    {
      headers: {
        "Set-Cookie": createSessionCookie(result.token),
      },
    }
  );
}
