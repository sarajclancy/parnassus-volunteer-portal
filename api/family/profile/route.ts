import { requireFamily, updateFamilyProfile } from "@/lib/portal";

export async function PATCH(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return updateFamilyProfile(await request.json(), account);
}
