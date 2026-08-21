import { createServer } from "node:http";
import { createBackendRuntime } from "./runtime";

const port = Number(process.env.PORT ?? 8787);
const runtime = createBackendRuntime();

createServer(async (nodeRequest, nodeResponse) => {
  try {
    const origin = `http://${nodeRequest.headers.host ?? `localhost:${port}`}`;
    const url = new URL(nodeRequest.url ?? "/", origin);
    const chunks: Buffer[] = [];
    for await (const chunk of nodeRequest) chunks.push(Buffer.from(chunk));
    const request = new Request(url, {
      method: nodeRequest.method,
      headers: nodeRequest.headers as Record<string, string>,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await runtime(request);
    nodeResponse.statusCode = response.status;
    response.headers.forEach((value, key) => nodeResponse.setHeader(key, value));
    nodeResponse.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    nodeResponse.statusCode = 500;
    nodeResponse.setHeader("Content-Type", "application/problem+json");
    nodeResponse.end(JSON.stringify({ type: "about:blank", title: "Internal Server Error", status: 500 }));
  }
}).listen(port, () => {
  console.log(`Debtulator API listening on http://localhost:${port}`);
});