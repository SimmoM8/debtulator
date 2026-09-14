import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const sourceRoot = join(projectRoot, "src");
const backendClient = "src/data/backend/BackendClient.ts";
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const violations = [];

for (const file of walk(sourceRoot)) {
  const relativePath = normalize(relative(projectRoot, file));
  const extension = relativePath.slice(relativePath.lastIndexOf("."));

  if (!sourceExtensions.has(extension)) {
    continue;
  }

  const source = readFileSync(file, "utf8");

  if (relativePath !== backendClient && /\bfetch\s*\(/u.test(source)) {
    violations.push(
      `${relativePath}: direct fetch() is not allowed outside ${backendClient}.`,
    );
  }
}

if (violations.length > 0) {
  console.error("Architecture checks failed:\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("Architecture checks passed.");
}

function walk(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function normalize(path) {
  return path.split("\\").join("/");
}
