import { publishPortalDocument, requireAdmin } from "@/lib/portal";

export async function POST(request: Request) {
  const { account, response } = await requireAdmin(request);

  if (response || !account) {
    return response;
  }

  return publishPortalDocument(await request.json(), account);
}
