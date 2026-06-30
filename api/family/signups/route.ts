import {
  claimPosition,
  releaseSignup,
  requestSignupSwap,
  requireFamily,
} from "@/lib/portal";

export async function POST(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return claimPosition(await request.json(), account);
}

export async function DELETE(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return releaseSignup(await request.json(), account);
}

export async function PATCH(request: Request) {
  const { account, response } = await requireFamily(request);

  if (response || !account) {
    return response;
  }

  return requestSignupSwap(await request.json(), account);
}
