import { requireAdmin, updateFamilyAdminDetails } from "@/lib/portal";

export async function PATCH(request: Request) {
  const { account, response } = await requireAdmin(request);

  if (response || !account) {
    return response;
  }

  return updateFamilyAdminDetails(await request.json(), account);
}
