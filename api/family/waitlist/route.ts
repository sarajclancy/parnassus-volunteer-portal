import { joinWaitlist, leaveWaitlist, requireFamily } from "@/lib/portal";

export async function POST(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return joinWaitlist(await request.json(), account);
}

export async function DELETE(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return leaveWaitlist(await request.json(), account);
}
