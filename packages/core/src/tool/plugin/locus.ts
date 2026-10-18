export * as LocusTool from "./locus.js"

import type { Context } from "@opencode/plugin/effect/plugin"
import { ToolFailure } from "@opencode/ai"
import { Effect, Schema } from "effect"
import { Locus } from "../../locus.js"
import { FileAccess } from "../../file-access.js"
import { Location } from "../../location.js"

export const name = "locus"

export const description = `Direct interface to the LOCUS Engine — ultra-fast deterministic code safety, AST invariants, cross-file symbol graphs, and impact blast-radius analysis.

Actions:
- "check": Deterministically verify 32 AST invariants (null deref, React hook rules, async mutex deadlocks, unhandled promises, XSS, SSRF, SQL injection) in <1ms.
- "graph": Construct full cross-file symbol dependency graph of a directory.
- "impact": Calculate blast-radius impact and breaking change risk of modifying a symbol.
- "refs": Find all inbound calls and references to a symbol across the project.
- "patch": Surgically replace an AST symbol with new code.`

export const Input = Schema.Struct({
  action: Schema.Literals(["check", "graph", "impact", "refs", "patch"]).annotate({
    description: "The LOCUS action to perform.",
  }),
  path: Schema.optional(Schema.String).annotate({
    description: "Target file or directory path.",
  }),
  symbol: Schema.optional(Schema.String).annotate({
    description: "Target symbol name (required for 'impact', 'refs', and 'patch').",
  }),
  depth: Schema.optional(Schema.Number).annotate({
    description: "Traversal depth for graph/impact/refs (defaults to 2).",
  }),
  code: Schema.optional(Schema.String).annotate({
    description: "Replacement code (required for 'patch').",
  }),
})

export const Output = Schema.Struct({
  success: Schema.Boolean,
  action: Schema.String,
  output: Schema.String,
})

export const Plugin = {
  id: "opencode.tool.locus",
  effect: Effect.fn("LocusTool.Plugin")(function* (ctx: Context) {
    const locus = yield* Locus.Service
    const access = yield* FileAccess.Service
    const location = yield* Location.Service

    yield* ctx.tool
      .transform((editor) =>
        editor.add({
          name,
          options: { codemode: false },
          description,
          input: Input,
          output: Output,
          execute: (input, context) =>
            Effect.gen(function* () {
              const targetPath = input.path
                ? (yield* access.authorizeRead(input.path, context)).absolute
                : location.directory

              switch (input.action) {
                case "check": {
                  const result = yield* locus.check(targetPath).pipe(
                    Effect.catchAll((err) =>
                      Effect.succeed({
                        passed: false,
                        output: `LOCUS check failed to execute: ${err.message}`,
                      }),
                    ),
                  )
                  return {
                    output: {
                      success: result.passed,
                      action: "check",
                      output: result.output || (result.passed ? "✓ All 32 AST invariants passed." : "Invariant violations found."),
                    },
                  }
                }

                case "graph": {
                  const graph = yield* locus.graph(targetPath).pipe(
                    Effect.catchAll((err) => Effect.succeed(`LOCUS graph error: ${err.message}`)),
                  )
                  return {
                    output: {
                      success: true,
                      action: "graph",
                      output: graph,
                    },
                  }
                }

                case "impact": {
                  if (!input.symbol) {
                    return yield* new ToolFailure({ message: "Action 'impact' requires a 'symbol' argument." })
                  }
                  const impact = yield* locus.impact(input.symbol, targetPath, input.depth ?? 2).pipe(
                    Effect.catchAll((err) => Effect.succeed(`LOCUS impact error: ${err.message}`)),
                  )
                  return {
                    output: {
                      success: true,
                      action: "impact",
                      output: impact,
                    },
                  }
                }

                case "refs": {
                  if (!input.symbol) {
                    return yield* new ToolFailure({ message: "Action 'refs' requires a 'symbol' argument." })
                  }
                  const refs = yield* locus.refs(input.symbol, targetPath).pipe(
                    Effect.catchAll((err) => Effect.succeed(`LOCUS refs error: ${err.message}`)),
                  )
                  return {
                    output: {
                      success: true,
                      action: "refs",
                      output: refs,
                    },
                  }
                }

                case "patch": {
                  if (!input.symbol || input.code === undefined) {
                    return yield* new ToolFailure({
                      message: "Action 'patch' requires both 'symbol' and 'code' arguments.",
                    })
                  }
                  const patchRes = yield* locus.patch(targetPath, input.symbol, input.code).pipe(
                    Effect.catchAll((err) => Effect.succeed(`LOCUS patch error: ${err.message}`)),
                  )
                  return {
                    output: {
                      success: true,
                      action: "patch",
                      output: patchRes,
                    },
                  }
                }
              }
            }).pipe(
              Effect.map((result) => ({
                output: result.output,
                content: `LOCUS [${result.output.action}]:\n${result.output.output}`,
              })),
            ),
        }),
      )
      .pipe(Effect.orDie)
  }),
}
