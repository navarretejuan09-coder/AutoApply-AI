import { assertNotImplementedPlugin } from "@autoapply/contracts/testing";

import { createWorkdayPlugin } from "../src/index.js";

assertNotImplementedPlugin(createWorkdayPlugin, "workday");
