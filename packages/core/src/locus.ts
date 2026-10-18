export * as Locus from "./locus.js"

import { Context, Effect, Layer, Schema } from "effect"
import { makeLocationNode } from "@opencode/util/effect/app-node"
import { Location } from "./location.js"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import fs from "node:fs"
import path from "node:path"

const execFileAsync = promisify(execFile)

export class LocusError extends Schema.TaggedError<LocusError>()("Locus.Error", {
  command: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String),
}) {}

export const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".rs",
  ".py",
  ".vue",
  ".svelte",
  ".astro",
])

export interface CheckResult {
  readonly passed: boolean
  readonly output: string
}

export interface Interface {
  readonly isSupported: (filepath: string) => boolean
  readonly skeleton: (filepath: string) => Effect.Effect<string, LocusError>
  readonly slice: (filepath: string, symbol: string, depth?: number) => Effect.Effect<string, LocusError>
  readonly check: (filepath: string) => Effect.Effect<CheckResult, LocusError>
  readonly graph: (dirpath: string) => Effect.Effect<string, LocusError>
  readonly impact: (symbol: string, targetpath: string, depth?: number) => Effect.Effect<string, LocusError>
  readonly refs: (symbol: string, dirpath: string) => Effect.Effect<string, LocusError>
  readonly patch: (filepath: string, symbol: string, newCode: string) => Effect.Effect<string, LocusError>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Locus") {}

function resolveLocusBinary(): string {
  if (process.env.LOCUS_PATH && fs.existsSync(process.env.LOCUS_PATH)) {
    return process.env.LOCUS_PATH
  }
  const defaultPaths = [
    "D:/LOCUS/target/release/locus.exe",
    "D:/LOCUS/target/release/locus",
    "C:/LOCUS/target/release/locus.exe",
    "C:/Program Files/LOCUS/locus.exe",
  ]
  for (const candidate of defaultPaths) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return "locus"
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const location = yield* Location.Service
    const locusBinary = resolveLocusBinary()

    const runLocus = (subcommand: string, args: string[]) =>
      Effect.tryPromise({
        try: async () => {
          const { stdout, stderr } = await execFileAsync(locusBinary, [subcommand, ...args], {
            cwd: location.directory,
            maxBuffer: 20 * 1024 * 1024,
            timeout: 30_000,
          })
          return stdout
        },
        catch: (error: any) =>
          new LocusError({
            command: `locus ${subcommand} ${args.join(" ")}`,
            message: error.message || String(error),
            stderr: error.stderr,
          }),
      })

    return Service.of({
      isSupported: (filepath: string) => {
        const ext = path.extname(filepath).toLowerCase()
        return SUPPORTED_EXTENSIONS.has(ext)
      },

      skeleton: (filepath: string) => runLocus("skeleton", [filepath]),

      slice: (filepath: string, symbol: string, depth = 2) =>
        runLocus("slice", [symbol, filepath, "--depth", String(depth)]),

      check: (filepath: string) =>
        Effect.async<CheckResult, LocusError>((resume) => {
          execFile(
            locusBinary,
            ["check", filepath],
            { cwd: location.directory, timeout: 30_000 },
            (error, stdout, stderr) => {
              if (error && error.code !== 1) {
                resume(
                  Effect.fail(
                    new LocusError({
                      command: `locus check ${filepath}`,
                      message: error.message,
                      stderr,
                    }),
                  ),
                )
                return
              }
              const output = (stdout + "\n" + (stderr || "")).trim()
              const passed = !error && !output.includes("violated safety invariants")
              resume(Effect.succeed({ passed, output }))
            },
          )
        }),

      graph: (dirpath: string) => runLocus("graph", [dirpath]),

      impact: (symbol: string, targetpath: string, depth = 2) =>
        runLocus("impact", [symbol, targetpath, "--depth", String(depth)]),

      refs: (symbol: string, dirpath: string) => runLocus("refs", [symbol, dirpath]),

      patch: (filepath: string, symbol: string, newCode: string) =>
        runLocus("patch", [filepath, "--symbol", symbol, "--with", newCode]),
    })
  }),
)

export const node = makeLocationNode({ service: Service, layer, deps: [Location.node] })
