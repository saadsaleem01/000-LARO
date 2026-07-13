import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { listOnboardingSteps, getOnboardingState, setOnboardingComplete } from "../onboarding";

/**
 * Phase 105 — onboarding & first-run wizard.
 *
 * Steps are public (they are generic guidance); per-user completion state is
 * protected. The renderer uses `state` to decide whether to show the wizard.
 */
export const onboardingRouter = router({
  steps: publicProcedure.query(() => listOnboardingSteps()),
  state: protectedProcedure.query(({ ctx }) => getOnboardingState(ctx.user.id)),
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    await setOnboardingComplete(ctx.user.id, true);
    return { complete: true as const };
  }),
});
