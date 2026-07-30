import { assertNotImplementedPlugin } from "@autoapply/contracts/testing";

import { createLeverPlugin } from "../src/index.js";

assertNotImplementedPlugin(createLeverPlugin, "lever");
