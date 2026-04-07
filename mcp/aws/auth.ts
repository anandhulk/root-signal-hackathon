export function getRegion(): string {
  return process.env.AWS_REGION ?? "eu-west-1";
}

export function getAwsCredentials(): {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
} {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId) {
    throw new Error(
      "AWS_ACCESS_KEY_ID environment variable is required."
    );
  }

  if (!secretAccessKey) {
    throw new Error(
      "AWS_SECRET_ACCESS_KEY environment variable is required."
    );
  }

  const sessionToken = process.env.AWS_SESSION_TOKEN;

  return { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
}
