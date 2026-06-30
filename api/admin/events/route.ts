import {
  createEventWithPositions,
  requireAdmin,
  updateEventWithPositions,
} from "@/lib/portal";

export async function POST(request: Request) {
  const { account, response } = await requireAdmin(request);

  if (response || !account) {
    return response;
  }

  return createEventWithPositions(await request.json(), account);
}

export async function PATCH(request: Request) {
  const { account, response } = await requireAdmin(request);

  if (response || !account) {
    return response;
  }

  return updateEventWithPositions(await request.json(), account);
}
