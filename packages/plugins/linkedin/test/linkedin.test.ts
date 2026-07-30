import { assertNotImplementedPlugin } from "@autoapply/contracts/testing";

import { createLinkedInPlugin } from "../src/index.js";

assertNotImplementedPlugin(createLinkedInPlugin, "linkedin");
