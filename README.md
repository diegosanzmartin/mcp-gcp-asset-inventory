# Google Cloud Asset Inventory MCP Server

A Model Context Protocol (MCP) server that provides LLMs access to Google Cloud Asset Inventory data through gcloud CLI.

## Overview

This server enables AI assistants like Claude to query and analyze Google Cloud resources securely. It uses the authenticated gcloud CLI under the hood, providing a bridge between natural language interactions and GCP's Asset Inventory capabilities.

## Features

- **List Assets**: View all assets in your Google Cloud environment with filtering options
- **Search Assets**: Find specific resources using query strings
- **Asset History**: Track changes to assets over time
- **Project Management**: List and explore available projects
- **Service Discovery**: View enabled APIs and services 
- **Default Project**: Check the currently configured default project

## Prerequisites

- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed
- Authenticated with gcloud (`gcloud auth login`)
- Appropriate IAM permissions for Asset Inventory API

## Installation

You can install this server using npm:

```bash
npm install -g mcp-gcp-asset-inventory
```

Or run it directly using npx:

```bash
npx mcp-gcp-asset-inventory
```

## Usage with Claude Desktop

Add this configuration to your Claude Desktop settings:

```json
{
  "mcpServers": {
    "gcp-asset-inventory": {
      "command": "npx",
      "args": ["-y", "mcp-gcp-asset-inventory"]
    }
  }
}
```

## Example Prompts

Here are some example prompts to use with Claude once the server is connected:

- "Show me all the VMs running in my default GCP project"
- "Search for all Cloud Storage buckets across my projects"
- "List enabled APIs in my current project"
- "Which of my Google Cloud projects has the most resources?"
- "Show me the history of changes to my Kubernetes cluster"

## Permission Requirements

This server requires your gcloud user to have the following permissions:

- `cloudasset.assets.listResource` for listing assets
- `cloudasset.assets.searchAllResources` for searching assets
- `cloudasset.assets.getHistory` for retrieving asset history
- Cloud Resource Manager API access for project listing

## Security Considerations

This server runs with your local gcloud credentials and is bound by your IAM permissions in Google Cloud. It does not require or store additional authentication information.

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/diegosanzmartin/mcp-gcp-asset-inventory.git
cd mcp-gcp-asset-inventory

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Run the server
npm start
```

### Building with Docker

```bash
docker build -t mcp-gcp-asset-inventory .
docker run -i mcp-gcp-asset-inventory
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.