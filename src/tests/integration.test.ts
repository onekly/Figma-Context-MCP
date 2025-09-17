import { createServer } from "../mcp/index.js";
import { config } from "dotenv";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import yaml from "js-yaml";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

config();

describe("Figma MCP Server Tests", () => {
  let server: McpServer;
  let client: Client;
  let figmaApiKey: string;
  let figmaFileKey: string;

  beforeAll(async () => {
    figmaApiKey = process.env.FIGMA_API_KEY || "";
    if (!figmaApiKey) {
      throw new Error("FIGMA_API_KEY is not set in environment variables");
    }

    figmaFileKey = process.env.FIGMA_FILE_KEY || "";
    if (!figmaFileKey) {
      throw new Error("FIGMA_FILE_KEY is not set in environment variables");
    }

    server = createServer({
      figmaApiKey,
      figmaOAuthToken: "",
      useOAuth: false,
    });

    client = new Client(
      {
        name: "figma-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterAll(async () => {
    await client.close();
  });

  describe("Get Figma Data", () => {
    it("should be able to get Figma file data", async () => {
      const args: any = {
        fileKey: figmaFileKey,
      };

      const result = await client.request(
        {
          method: "tools/call",
          params: {
            name: "get_figma_data-dev",
            arguments: args,
          },
        },
        CallToolResultSchema,
      );

      const content = result.content[0].text as string;
      const parsed = yaml.load(content);

      expect(parsed).toBeDefined();
    }, 60000);

    it("should include absoluteBoundingBox and top/left for node when applicable", async () => {
      const args: any = {
        fileKey: process.env.FIGMA_FILE_KEY,
        nodeId: process.env.FIGMA_NODE_ID,
      };

      const result = await client.request(
        {
          method: "tools/call",
          params: {
            name: "get_figma_data-dev",
            arguments: args,
          },
        },
        CallToolResultSchema,
      );

      const content = result.content[0].text as string;
      const parsed: any = yaml.load(content);
      expect(parsed).toBeDefined();
      const rootNode = parsed.nodes?.[0];
      expect(rootNode).toBeDefined();
      expect(rootNode.absoluteBoundingBox).toBeDefined();

      // top/left are optional; check presence and types if present
      if (rootNode.left !== undefined) expect(typeof rootNode.left).toBe("number");
      if (rootNode.top !== undefined) expect(typeof rootNode.top).toBe("number");
    }, 60000);
  });
});
