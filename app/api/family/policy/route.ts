import { acknowledgeVolunteerPolicy, requireFamily } from "@/lib/portal";

export async function POST(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return acknowledgeVolunteerPolicy(await request.json(), account);
}
