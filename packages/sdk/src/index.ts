import * as user from "@autoapply/user";
import * as resume from "@autoapply/resume";
import * as jobs from "@autoapply/jobs";
import * as applications from "@autoapply/applications";
import * as analytics from "@autoapply/analytics";
import * as notifications from "@autoapply/notifications";
import * as automation from "@autoapply/automation";
import * as ai from "@autoapply/ai";
import { commandBus, type ApplyJobCommand, type RegisterUserCommand } from "@autoapply/commands";
import { createDomainEvent, EventTypes } from "@autoapply/events";
import { config as configService } from "@autoapply/config";

export const sdk = {
  user,
  resume,
  jobs,
  applications,
  analytics,
  notifications,
  automation,
  ai,
  commands: commandBus,
  events: {
    create: createDomainEvent,
    types: EventTypes,
  },
  config: {
    get database() {
      return configService.database;
    },
    get redis() {
      return configService.redis;
    },
    get auth() {
      return configService.auth;
    },
    get api() {
      return configService.api;
    },
    get web() {
      return configService.web;
    },
    get ai() {
      return configService.ai;
    },
    get browser() {
      return configService.browser;
    },
    get resume() {
      return configService.resume;
    },
    get nodeEnv() {
      return configService.nodeEnv;
    },
    validateAll: () => configService.validateAll(),
  },
};

export type { ApplyJobCommand, RegisterUserCommand };
