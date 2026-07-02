import { requireFamily, submitFamilyDocument } from "@/lib/portal";

export async function POST(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return submitFamilyDocument(await request.json(), account);
}
