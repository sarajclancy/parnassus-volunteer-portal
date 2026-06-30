import { getPortalData, requireAccount } from "@/lib/portal";

export async function GET(request: Request) {
  const { account, response } = await requireAccount(request);

  if (response || !account) {
    return response;
  }

  return Response.json(await getPortalData(account));
}
