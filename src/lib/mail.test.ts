import { afterEach, expect, test, vi } from "vitest";
import { sendMail } from "@/lib/mail";

const message = { to: "owner@flowday.test", subject: "Hello", text: "Open https://flowday.test/link" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("without a key, development prints the mail instead of sending it", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  await sendMail(message);

  expect(log.mock.calls[0][0]).toContain("https://flowday.test/link");
});

test("without a key, production fails loudly and logs nothing", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("NODE_ENV", "production");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  await expect(sendMail(message)).rejects.toThrow("RESEND_API_KEY");
  expect(log).not.toHaveBeenCalled();
});

test("with a key, the mail goes to Resend", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await sendMail(message);

  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://api.resend.com/emails");
  expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-key");
  expect(JSON.parse(String(init.body))).toMatchObject({ to: message.to, text: message.text });
});

test("a rejection from Resend is an error, not a silent success", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));

  await expect(sendMail(message)).rejects.toThrow("403");
});
