// app/routes/auth.$.jsx
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { ensureFraudpopMetafields } from "../lib/ensureFraudpopMetafields.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Run once per shop (optional flag)
  const flags = session?.state?.flags || {};
  if (!flags.fraudpopMetafieldsInitialized) {
    try {
      await ensureFraudpopMetafields(admin);
      flags.fraudpopMetafieldsInitialized = true;
      await session.update({ ...session.state, flags });
    } catch (e) {
      console.error("Metafield setup failed:", e);
      // don’t block auth on non-fatal definition errors
    }
  }

  return redirect("/app");
};
