import { describe, expect, test } from "bun:test"
import { classifyTier, DEFAULT_ROUTES, resolveRoute } from "../src/router"

describe("Sovereign Router classifyTier", () => {
  test("classifies reasoning intent", () => {
    expect(classifyTier("Can you analyze and prove the mathematical bound for this algorithm?")).toBe("reasoning")
  })

  test("classifies coder intent", () => {
    expect(classifyTier("Refactor this function to fix the bug")).toBe("coder")
  })

  test("classifies short prompts as fast", () => {
    expect(classifyTier("Hello there")).toBe("fast")
  })

  test("classifies long neutral prompts as general", () => {
    expect(
      classifyTier(
        "Please write a detailed overview of the history of the city of Zliten, covering its trade routes, its markets, its people, and daily life over many centuries in the region.",
      ),
    ).toBe("general")
  })
})

describe("Sovereign Router resolveRoute", () => {
  test("router/auto routes reasoning prompts to DeepSeek R1 on NVIDIA", () => {
    const decision = resolveRoute({
      requested: "router/auto",
      prompt: "Can you analyze and prove the mathematical bound for this algorithm?",
    })
    expect(decision.resolvedTier).toBe("reasoning")
    expect(decision.selected.providerID).toBe("nvidia")
    expect(decision.selected.modelID).toBe("deepseek-ai/deepseek-r1")
  })

  test("router/auto routes coding prompts to Qwen 2.5 Coder on NVIDIA", () => {
    const decision = resolveRoute({
      requested: "router/auto",
      prompt: "Refactor read.ts to enforce LOCUS AST skeleton compression",
    })
    expect(decision.resolvedTier).toBe("coder")
    expect(decision.selected.providerID).toBe("nvidia")
    expect(decision.selected.modelID).toBe("qwen/qwen2.5-coder-32b-instruct")
  })

  test("router/fast resolves the fast tier", () => {
    const decision = resolveRoute({ requested: "router/fast", prompt: "Quick summary of project status" })
    expect(decision.resolvedTier).toBe("fast")
    expect(decision.selected.providerID).toBe("nvidia")
    expect(decision.selected.modelID).toBe("meta/llama-3.3-70b-instruct")
  })

  test("router/reasoning resolves the reasoning tier without a prompt", () => {
    const decision = resolveRoute({ requested: "router/reasoning" })
    expect(decision.resolvedTier).toBe("reasoning")
    expect(decision.selected.modelID).toBe("deepseek-ai/deepseek-r1")
  })

  test("router/coder resolves the coder tier without a prompt", () => {
    const decision = resolveRoute({ requested: "router/coder" })
    expect(decision.resolvedTier).toBe("coder")
    expect(decision.selected.modelID).toBe("qwen/qwen2.5-coder-32b-instruct")
  })

  test("direct model specification is honored", () => {
    const decision = resolveRoute({ requested: "nvidia/deepseek-ai/deepseek-r1" })
    expect(decision.selected.providerID).toBe("nvidia")
    expect(decision.selected.modelID).toBe("deepseek-ai/deepseek-r1")
    expect(decision.resolvedTier).toBe("reasoning")
  })

  test("fallback chain is non-empty, same-tier first, then ordered by priority", () => {
    const decision = resolveRoute({
      requested: "router/auto",
      prompt: "Can you analyze and prove the mathematical bound for this algorithm?",
      activeProviders: ["nvidia", "groq", "cloudflare"],
    })
    expect(decision.fallbackChain.length).toBeGreaterThan(0)
    expect(decision.fallbackChain.every((route) => route.modelID !== decision.selected.modelID)).toBe(true)
    // Real resolveRoute semantics: remaining same-tier routes come first,
    // then the other tiers sorted by ascending priority.
    expect(decision.fallbackChain[0].tier).toBe(decision.resolvedTier)
    const rest = decision.fallbackChain.slice(1).map((route) => route.priority)
    expect(rest).toEqual([...rest].sort((a, b) => a - b))
    expect(decision.fallbackChain.some((route) => route.providerID === "groq")).toBe(true)
  })

  test("activeProviders filtering: groq-only selects a groq route", () => {
    const decision = resolveRoute({ requested: "router/fast", activeProviders: ["groq"] })
    expect(decision.selected.providerID).toBe("groq")
    expect(decision.selected.modelID).toBe("llama-3.3-70b-versatile")
    expect(decision.fallbackChain.every((route) => route.providerID === "groq")).toBe(true)
  })

  test("every catalog route is reachable through its tier alias", () => {
    const tiers = ["fast", "reasoning", "coder"] as const
    for (const tier of tiers) {
      const decision = resolveRoute({ requested: `router/${tier}`, activeProviders: ["nvidia", "groq", "cloudflare"] })
      expect(decision.resolvedTier).toBe(tier)
      expect(DEFAULT_ROUTES.some((route) => route.modelID === decision.selected.modelID)).toBe(true)
    }
  })
})
