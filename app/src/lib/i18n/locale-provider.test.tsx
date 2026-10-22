import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { authKeys } from "@/lib/auth/queries";
import { settleReactWork } from "../../../tests/settle-react-work";
import { LocaleProvider, t, useLocale } from "./index";

const originalFetch = globalThis.fetch;
let originalLanguages: readonly string[];
const clients: QueryClient[] = [];
let fetchHandler: (url: string, init?: RequestInit) => Promise<Response>;

beforeAll(() => {
  GlobalRegistrator.register({ url: "http://localhost/" });
  originalLanguages = navigator.languages ? [...navigator.languages] : ["en"];
});

beforeEach(() => {
  fetchHandler = async (url) => {
    if (url === "/api/me") {
      return Response.json({ user: null }, { status: 401 });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  };

  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost").pathname;
      return fetchHandler(url, init);
    },
    { preconnect: originalFetch.preconnect },
  );
});

afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  globalThis.fetch = originalFetch;
  Object.defineProperty(navigator, "languages", {
    value: ["en"],
    configurable: true,
  });
  // Restore module-level currentLocale to default English so other test suites aren't tainted
  const resetClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  resetClient.setQueryData(authKeys.currentUser(), null);
  render(
    <QueryClientProvider client={resetClient}>
      <LocaleProvider>
        <div />
      </LocaleProvider>
    </QueryClientProvider>,
  );
  cleanup();
  resetClient.clear();
  Object.defineProperty(navigator, "languages", {
    value: originalLanguages,
    configurable: true,
  });
});

afterAll(async () => {
  await settleReactWork();
  GlobalRegistrator.unregister();
});

function createTestClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  clients.push(client);
  return client;
}

function TestConsumer() {
  const { locale, preference } = useLocale();
  return (
    <div data-testid="child">
      <span data-testid="translated">{t("Save")}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="preference">{preference}</span>
    </div>
  );
}

test("guest (/api/me -> 401 or no user): children render in browser language", async () => {
  Object.defineProperty(navigator, "languages", {
    value: ["zh-CN"],
    configurable: true,
  });

  fetchHandler = async (url) => {
    if (url === "/api/me") {
      return Response.json({ user: null }, { status: 401 });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  };

  const client = createTestClient();
  const view = render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  const child = await view.findByTestId("child");
  expect(child).not.toBeNull();
  expect(view.getByTestId("locale").textContent).toBe("zh-CN");
  expect(view.getByTestId("translated").textContent).toBe("保存");
  expect(view.getByTestId("preference").textContent).toBe("system");
});

test("signed in: children not rendered until preferences resolve, then render with preference locale", async () => {
  Object.defineProperty(navigator, "languages", {
    value: ["en"],
    configurable: true,
  });

  const preferencesRequested = Promise.withResolvers<void>();
  const preferencesDeferred = Promise.withResolvers<Response>();

  fetchHandler = async (url) => {
    if (url === "/api/me") {
      return Response.json({
        user: {
          id: "user_1",
          email: "alice@example.com",
          role: "user",
          onboarding: null,
        },
      });
    }
    if (url === "/api/settings/preferences") {
      preferencesRequested.resolve();
      return preferencesDeferred.promise;
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  };

  const client = createTestClient();
  const view = render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  // Wait until preferences query has actually started before asserting children are not yet rendered
  await preferencesRequested.promise;
  expect(view.queryByTestId("child")).toBeNull();

  // Resolve preferences query with zh-CN locale
  await act(async () => {
    preferencesDeferred.resolve(
      Response.json({
        preferences: {
          locale: "zh-CN",
        },
      }),
    );
  });

  const child = await view.findByTestId("child");
  expect(child).not.toBeNull();
  expect(view.getByTestId("locale").textContent).toBe("zh-CN");
  expect(view.getByTestId("translated").textContent).toBe("保存");
  expect(view.getByTestId("preference").textContent).toBe("zh-CN");
});

test("while user query is pending, children are not rendered", async () => {
  const meDeferred = Promise.withResolvers<Response>();
  fetchHandler = async (url) => {
    if (url === "/api/me") {
      return meDeferred.promise;
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  };

  const client = createTestClient();
  const view = render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  expect(view.queryByTestId("child")).toBeNull();

  await act(async () => {
    meDeferred.resolve(Response.json({ user: null }, { status: 401 }));
  });

  const child = await view.findByTestId("child");
  expect(child).not.toBeNull();
});

test("guest (/api/me -> 200 with user: null): children render in browser language", async () => {
  Object.defineProperty(navigator, "languages", {
    value: ["zh-CN"],
    configurable: true,
  });

  fetchHandler = async (url) => {
    if (url === "/api/me") {
      return Response.json({ user: null });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  };

  const client = createTestClient();
  const view = render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  const child = await view.findByTestId("child");
  expect(child).not.toBeNull();
  expect(view.getByTestId("locale").textContent).toBe("zh-CN");
  expect(view.getByTestId("translated").textContent).toBe("保存");
  expect(view.getByTestId("preference").textContent).toBe("system");
});

test("signed in but preferences request errors: children still render", async () => {
  Object.defineProperty(navigator, "languages", {
    value: ["zh-CN"],
    configurable: true,
  });

  fetchHandler = async (url) => {
    if (url === "/api/me") {
      return Response.json({
        user: {
          id: "user_2",
          email: "bob@example.com",
          role: "user",
          onboarding: null,
        },
      });
    }
    if (url === "/api/settings/preferences") {
      return Response.json(
        { error: "Failed to load preferences" },
        { status: 500 },
      );
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  };

  const client = createTestClient();
  const view = render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  const child = await view.findByTestId("child");
  expect(child).not.toBeNull();
  expect(view.getByTestId("locale").textContent).toBe("zh-CN");
  expect(view.getByTestId("translated").textContent).toBe("保存");
});

test("current-user query itself errors (500 or network error): children still render in browser language", async () => {
  Object.defineProperty(navigator, "languages", {
    value: ["zh-CN"],
    configurable: true,
  });

  fetchHandler = async (url) => {
    if (url === "/api/me") {
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  };

  const client = createTestClient();
  const view = render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  const child = await view.findByTestId("child");
  expect(child).not.toBeNull();
  expect(view.getByTestId("locale").textContent).toBe("zh-CN");
  expect(view.getByTestId("translated").textContent).toBe("保存");
  expect(view.getByTestId("preference").textContent).toBe("system");
});
