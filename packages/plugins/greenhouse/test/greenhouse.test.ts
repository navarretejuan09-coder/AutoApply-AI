import { assertNotImplementedPlugin } from "@autoapply/contracts/testing";

import { createGreenhousePlugin } from "../src/index.js";

assertNotImplementedPlugin(createGreenhousePlugin, "greenhouse");
