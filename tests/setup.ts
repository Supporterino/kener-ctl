import { mock } from "bun:test"

mock.module("ky", () => ({
  default: {
    create: () => ({
      get: mock(),
      post: mock(),
      patch: mock(),
      delete: mock(),
      extend: mock(),
    }),
  },
  HTTPError: class extends Error {},
}))
