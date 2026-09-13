const rawBackendApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";

export const backendApiUrl = rawBackendApiUrl.replace(/\/+$/, "");

export const isBackendApiConfigured = backendApiUrl.length > 0;
