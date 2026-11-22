import { getAuthToken } from "./authStorage";
import { uploadTaskPhoto } from "./api";

jest.mock("./authStorage", () => ({ getAuthToken: jest.fn() }));

const mockFetch = jest.fn();
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = "http://localhost:3000";
  jest.mocked(getAuthToken).mockResolvedValue("test-token");
  mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);
  globalThis.fetch = mockFetch as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  globalThis.fetch = originalFetch;
});

test("sube un Blob como archivo multipart con token", async () => {
  const append = jest.spyOn(FormData.prototype, "append");
  const photo = new Blob(["photo"], { type: "image/jpeg" });

  await uploadTaskPhoto("42", photo);

  expect(append).toHaveBeenCalledWith("photo", photo, "photo.jpg");
  const [url, init] = mockFetch.mock.calls[0] as [RequestInfo, RequestInit];
  expect(url).toBe("http://localhost:3000/tasks/42/photo");
  expect(init.method).toBe("POST");
  const headers = new Headers(init.headers);
  expect(headers.get("Authorization")).toBe("Bearer test-token");
  expect(headers.has("Content-Type")).toBe(false);
});
