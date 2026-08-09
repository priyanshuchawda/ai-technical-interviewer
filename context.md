Connect to Claude Desktop
Drop this into ~/Library/Application Support/Claude/claude_desktop_config.json and restart Claude Desktop.

Your API key (shown once)
YOUR_BREETH_API_KEY

We never show this again. Save it somewhere safe.

claude_desktop_config.json

Copy
{
  "mcpServers": {
    "breeth": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.thebreeth.com/mcp",
        "--header",
        "Authorization: Bearer YOUR_BREETH_API_KEY"
      ]
    }
  }
}
