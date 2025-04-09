#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Schema definitions
const ListAssetsArgsSchema = z.object({
  projectId: z.string().optional().describe("The Google Cloud project ID. If not provided, uses the default project from gcloud config"),
  assetTypes: z.array(z.string()).optional().describe("Filter assets by type (e.g., 'compute.googleapis.com/Instance')"),
  contentType: z.enum(["RESOURCE", "IAM_POLICY", "ORG_POLICY", "OS_INVENTORY", "RELATIONSHIP"]).optional().default("RESOURCE").describe("Content type to include"),
  pageSize: z.number().optional().default(100).describe("Maximum number of results per page"),
  snapshot: z.boolean().optional().default(false).describe("Whether to return a snapshot in time or the latest state"),
});

const SearchAssetsArgsSchema = z.object({
  projectId: z.string().optional().describe("The Google Cloud project ID. If not provided, uses the default project from gcloud config"),
  query: z.string().describe("Query string following the Cloud Asset Inventory query syntax"),
  pageSize: z.number().optional().default(100).describe("Maximum number of results per page"),
});

const GetAssetHistoryArgsSchema = z.object({
  projectId: z.string().optional().describe("The Google Cloud project ID. If not provided, uses the default project from gcloud config"),
  assetName: z.string().describe("Full name of the asset"),
  startTime: z.string().optional().describe("Start time in RFC3339 format (e.g. '2022-01-01T00:00:00Z')"),
  endTime: z.string().optional().describe("End time in RFC3339 format (e.g. '2022-01-02T00:00:00Z')"),
  contentType: z.enum(["RESOURCE", "IAM_POLICY", "ORG_POLICY", "OS_INVENTORY", "RELATIONSHIP"]).optional().default("RESOURCE").describe("Content type to include"),
});

const GetProjectsArgsSchema = z.object({});

const GetServicesArgsSchema = z.object({
  projectId: z.string().optional().describe("The Google Cloud project ID. If not provided, uses the default project from gcloud config"),
});

// Google Asset Inventory access functions
async function listAssets(options: z.infer<typeof ListAssetsArgsSchema>) {
  const { projectId, assetTypes, contentType, pageSize, snapshot } = options;
  
  let cmd = "gcloud asset list";
  
  if (projectId) {
    cmd += ` --project=${projectId}`;
  }
  
  if (assetTypes && assetTypes.length > 0) {
    cmd += ` --asset-types="${assetTypes.join(",")}"`;
  }
  
  cmd += ` --content-type=${contentType}`;
  cmd += ` --page-size=${pageSize}`;
  
  if (snapshot) {
    cmd += " --snapshot-time=" + new Date().toISOString();
  }
  
  cmd += " --format=json";
  
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      console.error("Warning:", stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Error executing gcloud command:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list assets: ${errorMessage}`);
  }
}

async function searchAssets(options: z.infer<typeof SearchAssetsArgsSchema>) {
  const { projectId, query, pageSize } = options;
  
  let cmd = `gcloud asset search-all-resources --query="${query}"`;
  
  if (projectId) {
    cmd += ` --project=${projectId}`;
  }
  
  cmd += ` --page-size=${pageSize}`;
  cmd += " --format=json";
  
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      console.error("Warning:", stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Error executing gcloud command:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to search assets: ${errorMessage}`);
  }
}

async function getAssetHistory(options: z.infer<typeof GetAssetHistoryArgsSchema>) {
  const { projectId, assetName, startTime, endTime, contentType } = options;
  
  let cmd = `gcloud asset get-history --asset-names="${assetName}"`;
  
  if (projectId) {
    cmd += ` --project=${projectId}`;
  }
  
  if (startTime) {
    cmd += ` --start-time="${startTime}"`;
  }
  
  if (endTime) {
    cmd += ` --end-time="${endTime}"`;
  }
  
  cmd += ` --content-type=${contentType}`;
  cmd += " --format=json";
  
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      console.error("Warning:", stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Error executing gcloud command:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get asset history: ${errorMessage}`);
  }
}

async function getProjects() {
  const cmd = "gcloud projects list --format=json";
  
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      console.error("Warning:", stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Error executing gcloud command:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list projects: ${errorMessage}`);
  }
}

async function getServices(projectId?: string) {
  let cmd = "gcloud services list";
  
  if (projectId) {
    cmd += ` --project=${projectId}`;
  }
  
  cmd += " --format=json";
  
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      console.error("Warning:", stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Error executing gcloud command:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list services: ${errorMessage}`);
  }
}

async function getCurrentProject() {
  const cmd = "gcloud config get-value project";
  
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      console.error("Warning:", stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error("Error executing gcloud command:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get current project: ${errorMessage}`);
  }
}

async function checkGcloudInstalled() {
  try {
    await execAsync("gcloud --version");
    return true;
  } catch (error) {
    return false;
  }
}

async function checkGcloudAuth() {
  try {
    await execAsync("gcloud auth list");
    return true;
  } catch (error) {
    return false;
  }
}

// Server setup
const server = new Server(
  {
    name: "gcp-asset-inventory-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool implementations
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const isGcloudInstalled = await checkGcloudInstalled();
  if (!isGcloudInstalled) {
    console.error("gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install");
    process.exit(1);
  }

  const isAuthenticated = await checkGcloudAuth();
  if (!isAuthenticated) {
    console.error("Not authenticated with gcloud. Run 'gcloud auth login' first.");
    process.exit(1);
  }

  return {
    tools: [
      {
        name: "list_assets",
        description: "List assets in Google Cloud by type with optional filtering. Uses the gcloud asset list command.",
        inputSchema: zodToJsonSchema(ListAssetsArgsSchema),
      },
      {
        name: "search_assets",
        description: "Search for assets across your Google Cloud environment using a query string. Uses the gcloud asset search-all-resources command.",
        inputSchema: zodToJsonSchema(SearchAssetsArgsSchema),
      },
      {
        name: "get_asset_history",
        description: "Get the change history for a specific asset. Uses the gcloud asset get-history command.",
        inputSchema: zodToJsonSchema(GetAssetHistoryArgsSchema),
      },
      {
        name: "get_projects",
        description: "List all Google Cloud projects you have access to. Uses the gcloud projects list command.",
        inputSchema: zodToJsonSchema(GetProjectsArgsSchema),
      },
      {
        name: "get_services",
        description: "List enabled services/APIs in a Google Cloud project. Uses the gcloud services list command.",
        inputSchema: zodToJsonSchema(GetServicesArgsSchema),
      },
      {
        name: "get_current_project",
        description: "Get the currently configured default Google Cloud project from gcloud config.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "list_assets": {
        const parsed = ListAssetsArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for list_assets: ${JSON.stringify(parsed.error)}`);
        }
        const result = await listAssets(parsed.data);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "search_assets": {
        const parsed = SearchAssetsArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for search_assets: ${JSON.stringify(parsed.error)}`);
        }
        const result = await searchAssets(parsed.data);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_asset_history": {
        const parsed = GetAssetHistoryArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_asset_history: ${JSON.stringify(parsed.error)}`);
        }
        const result = await getAssetHistory(parsed.data);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_projects": {
        const result = await getProjects();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_services": {
        const parsed = GetServicesArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_services: ${JSON.stringify(parsed.error)}`);
        }
        const result = await getServices(parsed.data.projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_current_project": {
        const result = await getCurrentProject();
        return {
          content: [{ type: "text", text: result }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GCP Asset Inventory MCP Server running on stdio");
    
    const currentProject = await getCurrentProject();
    console.error(`Using default project: ${currentProject || "Not set"}`);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

runServer();