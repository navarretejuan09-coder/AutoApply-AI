import type {
  ApplicationPlan,
  ApplicationResult,
  JobBoardPlugin,
  PluginContext,
  SearchCriteria,
} from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("plugin.linkedin");

const LOGIN_PATH = "/login";
const FIXTURE_EASY_APPLY = "[data-testid='easy-apply']";
const FIXTURE_NEXT = "[data-testid='easy-apply-next']";
const FIXTURE_SUBMIT = "[data-testid='easy-apply-submit']";
const FIXTURE_SUCCESS = "[data-testid='easy-apply-success']";

const LINKEDIN_EASY_APPLY = "button.jobs-apply-button";
const LINKEDIN_MODAL_NEXT = "button[aria-label='Continue to next step']";
const LINKEDIN_MODAL_REVIEW = "button[aria-label='Review your application']";
const LINKEDIN_MODAL_SUBMIT = "button[aria-label='Submit application']";

function isLoginUrl(url: string): boolean {
  return url.includes(LOGIN_PATH);
}

function jobUrlFromPlan(plan: ApplicationPlan): string {
  const jobUrl = plan.metadata?.jobUrl;
  if (typeof jobUrl !== "string" || !jobUrl.trim()) {
    throw new Error("ApplicationPlan.metadata.jobUrl is required");
  }
  return jobUrl.trim();
}

async function clickIfVisible(ctx: PluginContext, selector: string): Promise<boolean> {
  try {
    await ctx.page.waitForSelector(selector, { timeout: 3_000 });
    await ctx.page.click(selector);
    return true;
  } catch {
    return false;
  }
}

export function createLinkedInPlugin(): JobBoardPlugin {
  return {
    name: "linkedin",

    authenticate: async (ctx: PluginContext) => {
      await ctx.page.goto("https://www.linkedin.com/feed/");
      if (isLoginUrl(ctx.page.url())) {
        throw new Error("LinkedIn session expired or invalid cookies");
      }
      logger.info("LinkedIn session authenticated");
    },

    search: async (_criteria: SearchCriteria) => {
      throw new Error("Not implemented: linkedin.search");
    },

    prepareApplication: async (jobId: string) => ({
      jobId,
      steps: ["open_job", "easy_apply", "submit"],
      metadata: { provider: "linkedin" },
    }),

    executeApplication: async (plan: ApplicationPlan, ctx: PluginContext): Promise<ApplicationResult> => {
      const jobUrl = jobUrlFromPlan(plan);
      await ctx.page.goto(jobUrl);

      const usedFixture = await clickIfVisible(ctx, FIXTURE_EASY_APPLY);
      if (usedFixture) {
        await clickIfVisible(ctx, FIXTURE_NEXT);
        await clickIfVisible(ctx, FIXTURE_SUBMIT);
        await ctx.page.waitForSelector(FIXTURE_SUCCESS, { timeout: 5_000 });
        return { success: true, applicationId: `fixture-${plan.jobId}` };
      }

      const opened = await clickIfVisible(ctx, LINKEDIN_EASY_APPLY);
      if (!opened) {
        return { success: false, error: "Easy Apply button not found on job page" };
      }

      await clickIfVisible(ctx, LINKEDIN_MODAL_NEXT);
      await clickIfVisible(ctx, LINKEDIN_MODAL_REVIEW);
      const submitted = await clickIfVisible(ctx, LINKEDIN_MODAL_SUBMIT);
      if (!submitted) {
        return {
          success: false,
          error: "Could not complete Easy Apply flow (unsupported form steps)",
        };
      }

      return { success: true, applicationId: plan.jobId };
    },
  };
}
