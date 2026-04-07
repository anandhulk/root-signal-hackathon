export function getWorkspace(override?: string): string {
  const workspace = override ?? process.env.BITBUCKET_WORKSPACE;
  if (!workspace) {
    throw new Error(
      "Workspace not provided. Set BITBUCKET_WORKSPACE in env or pass workspace explicitly."
    );
  }
  return workspace;
}

export function getAuthHeaders(): Record<string, string> {
  const token = process.env.BITBUCKET_TOKEN;
  const username = process.env.BITBUCKET_USERNAME;

  if (!token) {
    throw new Error(
      "BITBUCKET_TOKEN environment variable is required. Set it to your Bitbucket app password or API token."
    );
  }

  if (username) {
    // Basic auth: username + app password
    const encoded = Buffer.from(`${username}:${token}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }

  // Bearer token (OAuth 2.0 / API token)
  return { Authorization: `Bearer ${token}` };
}
