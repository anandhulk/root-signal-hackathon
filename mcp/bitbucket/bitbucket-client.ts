import axios, { AxiosInstance, AxiosError } from "axios";
import { getAuthHeaders } from "./auth.js";

const MAX_DIFF_BYTES = 100_000;

function createAxiosInstance(): AxiosInstance {
  const baseURL =
    process.env.BITBUCKET_BASE_URL ?? "https://api.bitbucket.org/2.0";

  const instance = axios.create({ baseURL });

  instance.interceptors.request.use((config) => {
    const headers = getAuthHeaders();
    for (const [key, value] of Object.entries(headers)) {
      config.headers.set(key, value);
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      const status = err.response?.status;
      const data = err.response?.data as
        | { error?: { message?: string } }
        | undefined;
      const message =
        data?.error?.message ?? err.message ?? "Unknown Bitbucket API error";

      if (status === 429) {
        const retryAfter = err.response?.headers["retry-after"] ?? "unknown";
        throw new Error(
          `Rate limited by Bitbucket. Retry after ${retryAfter}s.`
        );
      }

      throw new Error(`Bitbucket API error ${status ?? ""}: ${message}`);
    }
  );

  return instance;
}

const http = createAxiosInstance();

export const bitbucketClient = {
  async listWorkspaces(page = 1, pagelen = 50) {
    const res = await http.get("/workspaces", { params: { page, pagelen } });
    return res.data;
  },

  async listRepositories(
    workspace: string,
    page = 1,
    pagelen = 50,
    query?: string,
    sort?: string
  ) {
    const params: Record<string, unknown> = { page, pagelen };
    if (query) params.q = query;
    if (sort) params.sort = sort;
    const res = await http.get(`/repositories/${workspace}`, { params });
    return res.data;
  },

  async getRepository(workspace: string, repoSlug: string) {
    const res = await http.get(`/repositories/${workspace}/${repoSlug}`);
    return res.data;
  },

  async listBranches(
    workspace: string,
    repoSlug: string,
    page = 1,
    pagelen = 50,
    query?: string
  ) {
    const params: Record<string, unknown> = { page, pagelen };
    if (query) params.q = query;
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/refs/branches`,
      { params }
    );
    return res.data;
  },

  async getBranch(workspace: string, repoSlug: string, branchName: string) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/refs/branches/${encodeURIComponent(branchName)}`
    );
    return res.data;
  },

  async listCommits(
    workspace: string,
    repoSlug: string,
    branch: string,
    page = 1,
    pagelen = 30,
    path?: string
  ) {
    const params: Record<string, unknown> = { page, pagelen };
    if (path) params.path = path;
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/commits/${encodeURIComponent(branch)}`,
      { params }
    );
    return res.data;
  },

  async getCommit(workspace: string, repoSlug: string, node: string) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/commit/${node}`
    );
    return res.data;
  },

  async getCommitDiff(workspace: string, repoSlug: string, spec: string) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/diff/${encodeURIComponent(spec)}`,
      { responseType: "text" }
    );
    let text: string = res.data;
    if (text.length > MAX_DIFF_BYTES) {
      text =
        text.slice(0, MAX_DIFF_BYTES) +
        `\n\n[... diff truncated at ${MAX_DIFF_BYTES} bytes ...]`;
    }
    return text;
  },

  async listPullRequests(
    workspace: string,
    repoSlug: string,
    state: string,
    page = 1,
    pagelen = 50,
    query?: string
  ) {
    const params: Record<string, unknown> = { state, page, pagelen };
    if (query) params.q = query;
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/pullrequests`,
      { params }
    );
    return res.data;
  },

  async getPullRequest(
    workspace: string,
    repoSlug: string,
    prId: number
  ) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`
    );
    return res.data;
  },

  async getPullRequestDiff(
    workspace: string,
    repoSlug: string,
    prId: number
  ) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`,
      { responseType: "text" }
    );
    let text: string = res.data;
    if (text.length > MAX_DIFF_BYTES) {
      text =
        text.slice(0, MAX_DIFF_BYTES) +
        `\n\n[... diff truncated at ${MAX_DIFF_BYTES} bytes ...]`;
    }
    return text;
  },

  async listPullRequestComments(
    workspace: string,
    repoSlug: string,
    prId: number,
    page = 1,
    pagelen = 50
  ) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`,
      { params: { page, pagelen } }
    );
    return res.data;
  },

  async getPullRequestActivity(
    workspace: string,
    repoSlug: string,
    prId: number,
    page = 1,
    pagelen = 50
  ) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/activity`,
      { params: { page, pagelen } }
    );
    return res.data;
  },

  async getFileContent(
    workspace: string,
    repoSlug: string,
    ref: string,
    path: string
  ): Promise<string> {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/src/${encodeURIComponent(ref)}/${path}`,
      {
        responseType: "arraybuffer",
        headers: { Accept: "text/plain" },
      }
    );

    const contentType: string =
      (res.headers["content-type"] as string) ?? "";

    if (
      contentType.includes("application/json") ||
      contentType.includes("text/")
    ) {
      return Buffer.from(res.data as ArrayBuffer).toString("utf-8");
    }

    // Heuristic: try decoding; if replacement chars dominate, treat as binary
    const decoded = Buffer.from(res.data as ArrayBuffer).toString("utf-8");
    const replacementCharCount = (decoded.match(/\uFFFD/g) ?? []).length;
    if (replacementCharCount > 10) {
      return "[binary file — cannot display as text]";
    }
    return decoded;
  },

  async listDirectory(
    workspace: string,
    repoSlug: string,
    ref: string,
    path: string,
    page = 1,
    pagelen = 100
  ) {
    const normalizedPath = path.endsWith("/") ? path : `${path}/`;
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/src/${encodeURIComponent(ref)}/${normalizedPath}`,
      { params: { page, pagelen } }
    );
    return res.data;
  },

  async getFileHistory(
    workspace: string,
    repoSlug: string,
    branch: string,
    path: string,
    page = 1,
    pagelen = 30
  ) {
    const res = await http.get(
      `/repositories/${workspace}/${repoSlug}/commits`,
      {
        params: {
          include: branch,
          path,
          page,
          pagelen,
        },
      }
    );
    return res.data;
  },
};
