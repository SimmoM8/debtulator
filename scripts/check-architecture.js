#!/usr/bin/env node
'use strict';
/* global __dirname */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const repositoryRoot = path.resolve(__dirname, '..');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const scannedRoots = ['src', 'backend', 'packages/contracts'];

const layers = [
  'domain',
  'application',
  'infrastructure',
  'platform',
  'presentation',
  'components',
  'navigation',
  'theme',
];
const allowedInternalDependencies = {
  domain: new Set(['domain']),
  application: new Set(['application', 'domain', 'contracts']),
  infrastructure: new Set(['infrastructure', 'platform', 'application', 'domain', 'contracts']),
  platform: new Set(['platform', 'application', 'domain']),
  presentation: new Set(['presentation', 'components', 'theme', 'application', 'domain']),
  components: new Set(['components', 'theme']),
  navigation: new Set(['navigation', 'components', 'theme']),
  theme: new Set(['theme']),
  backend: new Set(['backend', 'contracts']),
  contracts: new Set(['contracts']),
};

const legacySrcAliases = new Map([
  ['config', 'the owning layer'],
  ['constants', 'src/domain or src/theme'],
  ['screens', 'src/presentation/screens'],
  ['services', 'src/domain, src/application, src/infrastructure, or src/platform'],
  ['state', 'src/presentation/providers'],
  ['types', 'src/domain/models'],
  ['utils', 'src/domain/shared or the owning layer'],
]);
const legacyRootAliases = new Map([
  ['components', 'src/components'],
  ['constants', 'src/domain or src/theme'],
  ['hooks', 'the owning src/presentation feature'],
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function isSourceFile(filePath) {
  return sourceExtensions.has(path.extname(filePath));
}

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(entryPath));
    } else if (entry.isFile() && isSourceFile(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function layerForRepositoryPath(repositoryPath) {
  if (repositoryPath === 'src/app' || repositoryPath.startsWith('src/app/')) {
    return 'app';
  }
  for (const layer of layers) {
    if (repositoryPath === `src/${layer}` || repositoryPath.startsWith(`src/${layer}/`)) {
      return layer;
    }
  }
  if (repositoryPath === 'src/composition' || repositoryPath.startsWith('src/composition/')) {
    return 'composition';
  }
  if (repositoryPath === 'backend' || repositoryPath.startsWith('backend/')) {
    return 'backend';
  }
  if (
    repositoryPath === 'packages/contracts' ||
    repositoryPath.startsWith('packages/contracts/')
  ) {
    return 'contracts';
  }
  return null;
}

function isLayoutRoute(repositoryPath) {
  return /^_layout(?:\.[^.]+)*\.(?:js|jsx|ts|tsx)$/.test(path.posix.basename(repositoryPath));
}

function isTestFile(repositoryPath) {
  return (
    repositoryPath.includes('/__tests__/') ||
    /\.(?:spec|test)\.(?:js|jsx|ts|tsx)$/.test(repositoryPath)
  );
}

function isCompositionController(repositoryPath) {
  if (repositoryPath.startsWith('src/composition/')) {
    return true;
  }

  const providerMatch = repositoryPath.match(
    /^src\/presentation\/providers\/([^/]+)\.(?:js|jsx|ts|tsx)$/,
  );
  if (!providerMatch) {
    return false;
  }
  const providerName = providerMatch[1];
  return (
    providerName === 'AppDataProvider' ||
    providerName === 'AuthProvider' ||
    providerName.endsWith('GatewayProvider')
  );
}

function legacyAlias(specifier) {
  const srcMatch = specifier.match(/^@\/src\/([^/]+)(?:\/|$)/);
  if (srcMatch && legacySrcAliases.has(srcMatch[1])) {
    return {
      segment: srcMatch[1],
      replacement: legacySrcAliases.get(srcMatch[1]),
    };
  }

  const rootMatch = specifier.match(/^@\/([^/]+)(?:\/|$)/);
  if (rootMatch && legacyRootAliases.has(rootMatch[1])) {
    return {
      segment: rootMatch[1],
      replacement: legacyRootAliases.get(rootMatch[1]),
    };
  }
  return null;
}

function collectImports(filePath, sourceText) {
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : filePath.endsWith('.js')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const imports = [];

  const addImport = (moduleNode, kind) => {
    if (!moduleNode || !ts.isStringLiteralLike(moduleNode)) {
      return;
    }
    const location = sourceFile.getLineAndCharacterOfPosition(moduleNode.getStart(sourceFile));
    imports.push({
      specifier: moduleNode.text,
      kind,
      line: location.line + 1,
      column: location.character + 1,
    });
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      addImport(node.moduleSpecifier, 'import');
    } else if (ts.isExportDeclaration(node)) {
      addImport(node.moduleSpecifier, 'export');
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addImport(node.moduleReference.expression, 'import');
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      addImport(node.argument.literal, 'type import');
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addImport(node.arguments[0], 'dynamic import');
      } else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        addImport(node.arguments[0], 'require');
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return imports;
}

function resolveImport(importerRepositoryPath, specifier) {
  let targetRepositoryPath = null;
  if (specifier.startsWith('@/')) {
    targetRepositoryPath = toPosix(path.posix.normalize(specifier.slice(2)));
  } else if (specifier.startsWith('.')) {
    targetRepositoryPath = path.posix.normalize(
      path.posix.join(path.posix.dirname(importerRepositoryPath), specifier),
    );
  } else if (path.isAbsolute(specifier)) {
    const relativePath = path.relative(repositoryRoot, specifier);
    if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
      targetRepositoryPath = toPosix(relativePath);
    }
  }

  if (targetRepositoryPath === null) {
    return { kind: 'external', layer: null, repositoryPath: null };
  }
  if (targetRepositoryPath === '..' || targetRepositoryPath.startsWith('../')) {
    return { kind: 'outside', layer: null, repositoryPath: targetRepositoryPath };
  }
  return {
    kind: 'internal',
    layer: layerForRepositoryPath(targetRepositoryPath),
    repositoryPath: targetRepositoryPath,
  };
}

function violation(repositoryPath, imported, rule, message, fix) {
  return {
    file: repositoryPath,
    line: imported.line,
    column: imported.column,
    specifier: imported.specifier,
    rule,
    message,
    fix,
  };
}

function checkLayerImport(repositoryPath, sourceLayer, imported, target) {
  if (sourceLayer === 'composition') {
    if (target.kind === 'internal' && target.layer === 'app') {
      return violation(
        repositoryPath,
        imported,
        'composition-boundary',
        'Composition code must not depend on Expo Router route entries.',
        'Move reusable behavior out of src/app/ and import its owning layer instead.',
      );
    }
    return null;
  }

  if (sourceLayer === 'presentation' && isCompositionController(repositoryPath)) {
    if (
      target.kind === 'internal' &&
      target.layer &&
      ['application', 'domain', 'platform'].includes(target.layer)
    ) {
      return null;
    }
    if (target.kind === 'external') {
      return null;
    }
  }

  const allowedLayers = allowedInternalDependencies[sourceLayer];
  if (target.kind === 'internal' && target.layer && allowedLayers.has(target.layer)) {
    return null;
  }

  if (
    sourceLayer === 'backend' &&
    target.kind === 'internal' &&
    target.layer !== 'backend' &&
    target.layer !== 'contracts'
  ) {
    return violation(
      repositoryPath,
      imported,
      'backend-frontend-boundary',
      `Backend code must not import frontend implementation through "${imported.specifier}".`,
      'Expose a serializable contract in packages/contracts or keep the implementation inside backend.',
    );
  }
  if (sourceLayer === 'contracts' && target.kind === 'internal') {
    return violation(
      repositoryPath,
      imported,
      'contract-boundary',
      `API contracts must not depend on application implementation through "${imported.specifier}".`,
      'Keep contracts serializable and dependency-free so any client or server can consume them.',
    );
  }

  if (
    target.kind === 'external' &&
    (sourceLayer === 'infrastructure' ||
      sourceLayer === 'platform' ||
      sourceLayer === 'presentation' ||
      sourceLayer === 'components' ||
      sourceLayer === 'navigation' ||
      sourceLayer === 'theme' ||
      sourceLayer === 'backend')
  ) {
    return null;
  }

  if (sourceLayer === 'domain') {
    return violation(
      repositoryPath,
      imported,
      'domain-boundary',
      `Domain code may import only src/domain/**; "${imported.specifier}" points outside the domain.`,
      'Move framework, persistence, network, and platform behavior behind an application port; keep domain logic pure.',
    );
  }
  if (sourceLayer === 'backend') {
    return violation(
      repositoryPath,
      imported,
      'backend-boundary',
      `Backend code may import only backend code, packages/contracts, or external server dependencies; found "${imported.specifier}".`,
      'Move shared wire types to packages/contracts and keep frontend code out of the backend.',
    );
  }
  if (sourceLayer === 'contracts') {
    return violation(
      repositoryPath,
      imported,
      'contract-boundary',
      `API contracts must not import implementation code through "${imported.specifier}".`,
      'Use plain serializable TypeScript types with no framework or runtime dependencies.',
    );
  }
  if (sourceLayer === 'application') {
    return violation(
      repositoryPath,
      imported,
      'application-boundary',
      `Application code may import only src/application/** and src/domain/**; "${imported.specifier}" is an outward dependency.`,
      'Define or reuse an application port, then implement the SDK/native behavior in infrastructure or platform.',
    );
  }
  if (sourceLayer === 'infrastructure') {
    return violation(
      repositoryPath,
      imported,
      'infrastructure-boundary',
      `Infrastructure must not import ${target.layer ? `the ${target.layer} layer` : `unowned internal path "${imported.specifier}"`}.`,
      'Depend on domain/application contracts (or a platform adapter), and move UI coordination to composition/presentation.',
    );
  }
  if (sourceLayer === 'platform') {
    return violation(
      repositoryPath,
      imported,
      'platform-boundary',
      `Platform adapters may depend only on platform/application/domain code internally; "${imported.specifier}" crosses that boundary.`,
      'Expose the capability through an application port and keep concrete infrastructure/presentation out of the adapter.',
    );
  }
  return violation(
    repositoryPath,
    imported,
    'presentation-boundary',
    `Presentation must not import concrete ${target.layer || 'unowned internal'} code via "${imported.specifier}".`,
    'Consume an application/domain contract or a presentation provider; wire its concrete adapter in a layout/composition controller.',
  );
}

function checkRouteImport(repositoryPath, imported, target) {
  if (
    target.kind === 'external' &&
    (imported.specifier === 'expo-router' || imported.specifier.startsWith('expo-router/'))
  ) {
    return null;
  }
  if (
    target.kind === 'internal' &&
    target.repositoryPath &&
    /^src\/(?:presentation\/screens|presentation\/features|features)(?:\/|$)/.test(target.repositoryPath)
  ) {
    return null;
  }
  return violation(
    repositoryPath,
    imported,
    'route-boundary',
    `Non-layout routes may import only Expo Router or presentation/feature screens; found "${imported.specifier}".`,
    'Keep the route as a thin re-export/redirect and move rendering, state, and SDK usage into presentation.',
  );
}

function checkRepository(root = repositoryRoot) {
  const files = scannedRoots
    .flatMap((directory) => walk(path.join(root, directory)))
    .sort((left, right) => left.localeCompare(right));
  const violations = [];
  let importCount = 0;
  let filesChecked = 0;

  for (const filePath of files) {
    const repositoryPath = toPosix(path.relative(root, filePath));
    const sourceLayer = layerForRepositoryPath(repositoryPath);
    if (!sourceLayer) {
      continue;
    }

    let sourceText;
    try {
      sourceText = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      // A watch-mode/editor rename can race the initial directory walk.
      if (error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
    filesChecked += 1;

    if (
      (sourceLayer === 'domain' || sourceLayer === 'application') &&
      (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))
    ) {
      violations.push({
        file: repositoryPath,
        line: 1,
        column: 1,
        specifier: null,
        rule: `${sourceLayer}-jsx`,
        message: `${sourceLayer[0].toUpperCase()}${sourceLayer.slice(1)} code must not contain JSX.`,
        fix: 'Move the view/component to src/presentation and keep the inward layer framework-independent.',
      });
    }

    const imports = collectImports(filePath, sourceText);
    importCount += imports.length;
    for (const imported of imports) {
      const legacy = legacyAlias(imported.specifier);
      if (legacy) {
        violations.push(
          violation(
            repositoryPath,
            imported,
            'legacy-alias',
            `Legacy alias "${imported.specifier}" still targets the retired ${legacy.segment} tree.`,
            `Import the canonical module under ${legacy.replacement}.`,
          ),
        );
        continue;
      }

      const target = resolveImport(repositoryPath, imported.specifier);
      if (
        isTestFile(repositoryPath) &&
        target.kind === 'external' &&
        imported.specifier === '@jest/globals'
      ) {
        // Test harness imports do not become runtime layer dependencies.
        continue;
      }
      if (sourceLayer === 'app') {
        if (!isLayoutRoute(repositoryPath)) {
          const routeViolation = checkRouteImport(repositoryPath, imported, target);
          if (routeViolation) {
            violations.push(routeViolation);
          }
        }
        continue;
      }

      const layerViolation = checkLayerImport(repositoryPath, sourceLayer, imported, target);
      if (layerViolation) {
        violations.push(layerViolation);
      }
    }
  }

  violations.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.rule.localeCompare(right.rule),
  );
  return { filesChecked, importCount, violations };
}

function printResult(result) {
  if (result.violations.length === 0) {
    console.log(
      `Architecture boundaries OK (${result.filesChecked} files, ${result.importCount} imports checked).`,
    );
    return;
  }

  console.error(
    `Architecture boundary check failed with ${result.violations.length} violation${result.violations.length === 1 ? '' : 's'}:`,
  );
  for (const item of result.violations) {
    console.error(`\n${item.file}:${item.line}:${item.column} [${item.rule}]`);
    console.error(`  ${item.message}`);
    console.error(`  Fix: ${item.fix}`);
  }
  console.error(
    '\nBoundary summary: domain -> domain; application -> application/domain; infrastructure -> infrastructure/platform/application/domain; platform -> platform/application/domain; theme -> theme; components -> components/theme; navigation -> navigation/components/theme; presentation -> presentation/components/theme/application/domain. Layouts and explicit composition providers are the wiring roots.',
  );
}

if (require.main === module) {
  const result = checkRepository();
  printResult(result);
  if (result.violations.length > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  checkRepository,
  collectImports,
  isCompositionController,
  isLayoutRoute,
  isTestFile,
  layerForRepositoryPath,
  legacyAlias,
  resolveImport,
};
