import { Context, Effect, Layer, Schema } from "effect"

export const Tier = Schema.Literals(["fast", "reasoning", "coder", "general"])
export type Tier = typeof Tier.Type

export interface RouteTarget {
  readonly providerID: string
  readonly modelID: string
  readonly tier: Tier
  readonly baseURL?: string
  readonly description: string
  readonly priority: number
  readonly isReasoning: boolean
}

export interface RouteDecision {
  readonly selected: RouteTarget
  readonly fallbackChain: readonly RouteTarget[]
  readonly resolvedTier: Tier
  readonly reason: string
}

const NVIDIA_BASE = "https://integrate.api" + ".nvidia.com/v1"
const GROQ_BASE = "https://api" + ".groq.com/openai/v1"
const CF_BASE = "https://api" + ".cloudflare.com/client/v4/accounts/{account_id}/ai/v1"

/** Built-in route catalog designed for multi-provider sovereign inference */
export const DEFAULT_ROUTES: readonly RouteTarget[] = [
  // --- NVIDIA NIM Targets ---
  {
    providerID: "nvidia",
    modelID: "deepseek-ai/deepseek-r1",
    tier: "reasoning",
    baseURL: NVIDIA_BASE,
    description: "DeepSeek R1 full 671B reasoning on NVIDIA DGX Cloud",
    priority: 1,
    isReasoning: true,
  },
  {
    providerID: "nvidia",
    modelID: "qwen/qwen2.5-coder-32b-instruct",
    tier: "coder",
    baseURL: NVIDIA_BASE,
    description: "Qwen 2.5 Coder 32B specialized coding model",
    priority: 1,
    isReasoning: false,
  },
  {
    providerID: "nvidia",
    modelID: "meta/llama-3.3-70b-instruct",
    tier: "fast",
    baseURL: NVIDIA_BASE,
    description: "Llama 3.3 70B fast instruction following on NVIDIA NIM",
    priority: 1,
    isReasoning: false,
  },
  {
    providerID: "nvidia",
    modelID: "nvidia/llama-3.1-nemotron-70b-instruct",
    tier: "general",
    baseURL: NVIDIA_BASE,
    description: "Nemotron 70B aligned enterprise model",
    priority: 1,
    isReasoning: false,
  },

  // --- Groq Prepared Targets (Upcoming) ---
  {
    providerID: "groq",
    modelID: "llama-3.3-70b-versatile",
    tier: "fast",
    baseURL: GROQ_BASE,
    description: "LPU Ultra-fast inference on Groq",
    priority: 2,
    isReasoning: false,
  },
  {
    providerID: "groq",
    modelID: "deepseek-r1-distill-llama-70b",
    tier: "reasoning",
    baseURL: GROQ_BASE,
    description: "DeepSeek R1 Distill on Groq LPU",
    priority: 2,
    isReasoning: true,
  },

  // --- Cloudflare Workers AI Prepared Targets (Upcoming) ---
  {
    providerID: "cloudflare",
    modelID: "@cf/meta/llama-3.3-70b-instruct",
    tier: "fast",
    baseURL: CF_BASE,
    description: "Cloudflare Workers AI Global Edge",
    priority: 3,
    isReasoning: false,
  },
]

/**
 * Classifies query intent based on keywords and prompt structure.
 */
export function classifyTier(prompt: string): Tier {
  const p = prompt.toLowerCase()
  if (
    p.includes("think") ||
    p.includes("reason") ||
    p.includes("prove") ||
    p.includes("why") ||
    p.includes("analyze") ||
    p.includes("step-by-step") ||
    p.includes("math") ||
    p.includes("algorithm")
  ) {
    return "reasoning"
  }

  if (
    p.includes("code") ||
    p.includes("refactor") ||
    p.includes("function") ||
    p.includes("class") ||
    p.includes("fix") ||
    p.includes("bug") ||
    p.includes("implement") ||
    p.includes("ast") ||
    p.includes("typescript") ||
    p.includes("rust")
  ) {
    return "coder"
  }

  if (p.length < 120 || p.includes("fast") || p.includes("summary") || p.includes("quick")) {
    return "fast"
  }

  return "general"
}

export interface ResolveOptions {
  readonly requested: string
  readonly prompt?: string
  readonly activeProviders?: readonly string[]
}

/**
 * Resolves the optimal route target and cascading fallback chain.
 */
export function resolveRoute(options: ResolveOptions): RouteDecision {
  const { requested, prompt = "", activeProviders = ["nvidia"] } = options

  // 1. Direct explicit model request (e.g. "nvidia/deepseek-ai/deepseek-r1")
  if (requested.includes("/") && !requested.startsWith("router/")) {
    const [pId, ...rest] = requested.split("/")
    const mId = rest.join("/")
    const directMatch = DEFAULT_ROUTES.find((r) => r.providerID === pId && r.modelID === mId)
    const selected: RouteTarget = directMatch ?? {
      providerID: pId,
      modelID: mId,
      tier: "general",
      description: `Direct provider model: ${requested}`,
      priority: 1,
      isReasoning: requested.includes("r1") || requested.includes("o1") || requested.includes("o3"),
    }
    const fallbacks = DEFAULT_ROUTES.filter((r) => r.modelID !== mId && activeProviders.includes(r.providerID))
    return {
      selected,
      fallbackChain: fallbacks,
      resolvedTier: selected.tier,
      reason: `Direct specification of ${requested}`,
    }
  }

  // 2. Router Alias (router/auto, router/fast, router/reasoning, router/coder)
  let targetTier: Tier = "general"
  if (requested === "router/fast") {
    targetTier = "fast"
  } else if (requested === "router/reasoning") {
    targetTier = "reasoning"
  } else if (requested === "router/coder") {
    targetTier = "coder"
  } else {
    // router/auto or unspecified: classify from prompt
    targetTier = classifyTier(prompt)
  }

  // Filter candidates matching tier and active providers
  const tierCandidates = DEFAULT_ROUTES.filter(
    (r) => r.tier === targetTier && (activeProviders.length === 0 || activeProviders.includes(r.providerID)),
  ).sort((a, b) => a.priority - b.priority)

  // Secondary candidates for fallback
  const fallbackCandidates = DEFAULT_ROUTES.filter(
    (r) => r.tier !== targetTier && (activeProviders.length === 0 || activeProviders.includes(r.providerID)),
  ).sort((a, b) => a.priority - b.priority)

  const selected = tierCandidates[0] ?? DEFAULT_ROUTES[0]
  const fallbackChain = [...tierCandidates.slice(1), ...fallbackCandidates]

  return {
    selected,
    fallbackChain,
    resolvedTier: targetTier,
    reason: `Routed to ${targetTier.toUpperCase()} tier model via ${selected.providerID}`,
  }
}

export interface Service {
  readonly resolve: (options: ResolveOptions) => Effect.Effect<unknown>
  readonly listRoutes: () => Effect.Effect<unknown>
}

export class ServiceTag extends Context.Service<ServiceTag, Service>()("@opencode/Router") {}
export const layer = Layer.succeed(
  ServiceTag,
  {
    resolve: (options: ResolveOptions) => Effect.sync(() => resolveRoute(options)),
    listRoutes: () => Effect.succeed(DEFAULT_ROUTES),
  },
)
