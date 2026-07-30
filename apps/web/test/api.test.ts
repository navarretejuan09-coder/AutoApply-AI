import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import {
  createJob,
  deleteJob,
  enqueueHealthPing,
  fetchCurrentUser,
  fetchJobs,
  fetchResumes,
  uploadResume,
} from "../src/lib/api.js";

const originalFetch = globalThis.fetch;
const API_URL = "http://localhost:4000";

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
  mock.restoreAll();
});

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    return handler(String(input), init);
  }) as typeof fetch;
}

describe("web api client", () => {
  it("throws when NEXT_PUBLIC_API_URL is missing", async () => {
    await assert.rejects(() => fetchCurrentUser("token"), /NEXT_PUBLIC_API_URL/);
  });

  it("fetchCurrentUser returns parsed JSON on success", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;

    mockFetch((url, init) => {
      assert.equal(url, `${API_URL}/api/users/me`);
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer token-1");
      return new Response(JSON.stringify({ id: "u1", email: "a@b.com", name: "A" }), {
        status: 200,
      });
    });

    const user = await fetchCurrentUser("token-1");
    assert.equal(user.email, "a@b.com");
  });

  it("fetchCurrentUser throws on non-ok response", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    mockFetch(() => new Response("", { status: 401 }));

    await assert.rejects(() => fetchCurrentUser("token"), /401/);
  });

  it("enqueueHealthPing posts to queue ping endpoint", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;

    mockFetch((url, init) => {
      assert.equal(url, `${API_URL}/api/users/queue/ping`);
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify({ jobId: "q1", queue: "health", name: "ping" }), {
        status: 200,
      });
    });

    const result = await enqueueHealthPing("token");
    assert.equal(result.jobId, "q1");
  });

  it("fetchResumes and fetchJobs return list payloads", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;

    mockFetch((url) => {
      if (url.endsWith("/api/resumes")) {
        return new Response(JSON.stringify({ resumes: [] }), { status: 200 });
      }
      if (url.endsWith("/api/jobs")) {
        return new Response(JSON.stringify({ jobs: [] }), { status: 200 });
      }
      return new Response("", { status: 404 });
    });

    assert.deepEqual(await fetchResumes("token"), { resumes: [] });
    assert.deepEqual(await fetchJobs("token"), { jobs: [] });
  });

  it("fetchResumes throws on non-ok response", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    mockFetch(() => new Response("", { status: 500 }));
    await assert.rejects(() => fetchResumes("token"), /500/);
  });

  it("uploadResume throws with response text on failure", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    mockFetch(() => new Response("bad file", { status: 400 }));

    const file = new File(["pdf"], "cv.pdf", { type: "application/pdf" });
    await assert.rejects(() => uploadResume("token", file), /bad file/);
  });

  it("uploadResume sends multipart form data", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;

    mockFetch((url, init) => {
      assert.equal(url, `${API_URL}/api/resumes`);
      assert.equal(init?.method, "POST");
      assert.ok(init?.body instanceof FormData);
      return new Response(JSON.stringify({ resume: { id: "r1" }, jobId: "q1", queue: "resume" }), {
        status: 200,
      });
    });

    const file = new File(["pdf"], "cv.pdf", { type: "application/pdf" });
    const result = await uploadResume("token", file);
    assert.equal(result.resume.id, "r1");
  });

  it("createJob sends JSON body", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;

    mockFetch((url, init) => {
      assert.equal(url, `${API_URL}/api/jobs`);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)) as { title: string };
      assert.equal(body.title, "Engineer");
      return new Response(JSON.stringify({ job: { id: "j1" }, queueJobId: "q1", queue: "jobs" }), {
        status: 200,
      });
    });

    const result = await createJob("token", {
      title: "Engineer",
      company: "Acme",
      description: "Build",
    });
    assert.equal(result.job.id, "j1");
  });

  it("deleteJob succeeds on ok response", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;

    mockFetch((url, init) => {
      assert.equal(url, `${API_URL}/api/jobs/j1`);
      assert.equal(init?.method, "DELETE");
      return new Response("", { status: 200 });
    });

    await deleteJob("token", "j1");
  });

  it("deleteJob throws with response text on failure", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    mockFetch(() => new Response("not found", { status: 404 }));

    await assert.rejects(() => deleteJob("token", "j1"), /not found/);
  });

  it("fetchJobs throws on non-ok response", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    mockFetch(() => new Response("", { status: 500 }));

    await assert.rejects(() => fetchJobs("token"), /500/);
  });

  it("createJob surfaces error text from response body", async () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    mockFetch(() => new Response("validation failed", { status: 400 }));

    await assert.rejects(
      () =>
        createJob("token", {
          title: "Engineer",
          company: "Acme",
          description: "Build",
        }),
      /validation failed/,
    );
  });
});
