import { Resend } from "resend";
import { env } from "./env";
import { featureFlags } from "./featureFlags";

export const resend = featureFlags.email.enabled ? new Resend(env.RESEND_API_KEY) : null;
