import { describe, expect, test, mock } from "bun:test"
import path from "path"
import { BashTool } from "../../src/tool/bash"
import { Instance } from "../../src/project/instance"
import { Permission } from "../../src/permission"
import { Log } from "../../src/util/log"
import { Agent } from "../../src/agent/agent"

Log.init({ print: false })

// Mock Permission.ask to auto-allow in tests
Permission.ask = mock(async () => {
  return
})

const ctx = {
  sessionID: "test",
  messageID: "",
  toolCallID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  metadata: () => {},
}

const projectRoot = path.join(__dirname, "../..")

describe("tool.bash", () => {
  test("basic", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const bash = await BashTool.init()
        const result = await bash.execute(
          {
            command: "echo 'test'",
            description: "Echo test message",
          },
          ctx,
        )
        expect(result.metadata.exit).toBe(0)
        expect(result.metadata.output).toContain("test")
      },
    })
  })

  test("cd ../ should fail outside of project root", async () => {
    const originalGet = Agent.get
    // Mock Agent.get to return agent with external_directory='deny'
    Agent.get = mock(async () => ({
      permission: {
        edit: "allow" as const,
        bash: { "*": "allow" as const },
        webfetch: "allow" as const,
        external_directory: "deny" as const,
        doom_loop: "ask" as const,
      },
    })) as any

    try {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const bash = await BashTool.init()
          await expect(
            bash.execute(
              {
                command: "cd ../",
                description: "Try to cd to parent directory",
              },
              ctx,
            ),
          ).rejects.toThrow("This command references paths outside of")
        },
      })
    } finally {
      Agent.get = originalGet
    }
  })
})
