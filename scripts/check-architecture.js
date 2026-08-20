#!/usr/bin/env node
'use strict';
/* global __dirname */

const fs = require('node:fs');
const { builtinModules } = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const repositoryRoot = path.resolve(__dirname, '..');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const scannedRoots = ['packages', 'apps/mobile/app', 'apps/mobile/src'];

const layerRoots = new Map([
  ['packages/domain/src', 'domain'],
  ['packages/application/src', 'application'],
  ['packages/contracts/src', 'contracts'],
  ['apps/mobile/src/infrastructure', 'infrastructure'],
  ['apps/mobile/src/platform', 'platform'],
  ['apps/mobile/src/presentation', 'presentation'],
  ['apps/mobile/src/composition', 'composition'],
  ['apps/mobile/app', 'app'],
]);
const allowedInternalDependencies = {
  domain: new Set(['domain']),
  application: new Set(['application', 'domain']),
  contracts: new Set(['contracts']),
  infrastructure: new Set(['infrastructure', 'platform', 'application', 'domain', 'contracts']),
  platform: new Set(['platform', 'application', 'domain']),
  presentation: new Set(['presentation', 'application', 'domain']),
};

const packageAliases = new Map([
  ['@debtulator/domain', 'packages/domain/src'],
  ['@debtulator/application', 'packages/application/src'],
  ['@debtulator/contracts', 'packages/contracts/src'],
]);

// These packages expose runtime capabilities owned by one or more outward
// layers. Keeping the list explicit makes violations actionable without
// pretending that an architecture checker can prove an arbitrary npm package
// is pure. Unlisted dependencies are considered pure only in the domain layer.
const sdkAllowedLayers = new Map([
  ['@supabase/supabase-js', new Set(['infrastructure', 'composition'])],
  ['@supabase/postgrest-js', new Set(['infrastructure', 'composition'])],
  ['expo-sqlite', new Set(['infrastructure', 'composition'])],
  ['react-native-url-polyfill', new Set(['infrastructure', 'composition'])],
  ['@react-native-async-storage/async-storage', new Set(['platform', 'composition'])],
  ['expo-application', new Set(['platform', 'composition'])],
  ['expo-background-fetch', new Set(['platform', 'composition'])],
  ['expo-background-task', new Set(['platform', 'composition'])],
  ['expo-clipboard', new Set(['platform', 'composition'])],
  ['expo-device', new Set(['platform', 'composition'])],
  ['expo-document-picker', new Set(['platform', 'composition'])],
  ['expo-file-system', new Set(['platform', 'composition'])],
  ['expo-image-picker', new Set(['platform', 'composition'])],
  ['expo-local-authentication', new Set(['platform', 'composition'])],
  ['expo-network', new Set(['platform', 'composition'])],
  ['expo-notifications', new Set(['platform', 'composition'])],
  ['expo-secure-store', new Set(['platform', 'composition'])],
  ['expo-sharing', new Set(['platform', 'composition'])],
  ['expo-task-manager', new Set(['platform', 'composition'])],
  ['expo-router', new Set(['presentation', 'composition', 'app'])],
  ['@expo/ui', new Set(['presentation', 'composition', 'app'])],
  ['@expo/vector-icons', new Set(['presentation', 'composition', 'app'])],
  ['expo-glass-effect', new Set(['presentation', 'composition', 'app'])],
  ['expo-linear-gradient', new Set(['presentation', 'composition', 'app'])],
  ['expo-symbols', new Set(['presentation', 'composition', 'app'])],
  ['react', new Set(['presentation', 'composition', 'app'])],
  ['react-native', new Set(['platform', 'presentation', 'composition', 'app'])],
]);

const generatedSupabaseTypePackages = new Set([
  '@supabase/supabase-js',
  '@supabase/postgrest-js',
]);
const nodeBuiltinPackages = new Set(
  builtinModules.map((moduleName) => moduleName.replace(/^node:/, '').split('/')[0]),
);

const legacySrcAliases = new Map([
  ['application', '@debtulator/application'],
  ['contracts', '@debtulator/contracts'],
  ['domain', '@debtulator/domain'],
  ['components', '@/src/presentation/components or @/src/presentation/design-system'],
  ['config', 'the owning mobile layer (usually @/src/presentation/config)'],
  ['constants', '@debtulator/domain or @/src/presentation/theme'],
  ['data', '@/src/infrastructure or @debtulator/application'],
  ['features', '@/src/presentation/features'],
  ['navigation', '@/src/presentation/navigation'],
  ['screens', '@/src/presentation/screens'],
  ['services', '@debtulator/domain, @debtulator/application, @/src/infrastructure, or @/src/platform'],
  ['state', '@/src/presentation/providers'],
  ['theme', '@/src/presentation/theme'],
  ['types', '@debtulator/domain'],
  ['utils', '@debtulator/domain or the owning mobile layer'],
]);
const legacyRootAliases = new Map([
  ['application', '@debtulator/application'],
  ['contracts', '@debtulator/contracts'],
  ['domain', '@debtulator/domain'],
  ['components', '@/src/presentation/components or @/src/presentation/design-system'],
  ['constants', '@debtulator/domain or @/src/presentation/theme'],
  ['hooks', 'the owning @/src/presentation feature'],
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
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.expo' ||
      entry.name === 'build' ||
      entry.name === 'coverage' ||
      entry.name === 'dist'
    ) {
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
  const normalizedPath = path.posix.normalize(toPosix(repositoryPath));
  for (const [layerRoot, layer] of layerRoots) {
    if (normalizedPath === layerRoot || normalizedPath.startsWith(`${layerRoot}/`)) {
      return layer;
    }
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
  if (
    repositoryPath === 'apps/mobile/src/composition' ||
    repositoryPath.startsWith('apps/mobile/src/composition/')
  ) {
    return true;
  }

  const providerMatch = repositoryPath.match(
    /^apps\/mobile\/src\/presentation\/providers\/([^/]+)\.(?:js|jsx|ts|tsx)$/,
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
  const packagePathMatch = specifier.match(/^\/(domain|application|contracts)(?:\/|$)/);
  if (packagePathMatch) {
    return {
      segment: packagePathMatch[1],
      replacement: `@debtulator/${packagePathMatch[1]}`,
    };
  }

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

  const addImport = (moduleNode, kind, isTypeOnly = false) => {
    if (!moduleNode || !ts.isStringLiteralLike(moduleNode)) {
      return;
    }
    const location = sourceFile.getLineAndCharacterOfPosition(moduleNode.getStart(sourceFile));
    imports.push({
      specifier: moduleNode.text,
      kind,
      isTypeOnly,
      line: location.line + 1,
      column: location.character + 1,
    });
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const bindings = node.importClause?.namedBindings;
      const hasOnlyTypeSpecifiers =
        node.importClause &&
        !node.importClause.name &&
        bindings &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every((element) => element.isTypeOnly);
      addImport(
        node.moduleSpecifier,
        'import',
        Boolean(node.importClause?.isTypeOnly || hasOnlyTypeSpecifiers),
      );
    } else if (ts.isExportDeclaration(node)) {
      const hasOnlyTypeSpecifiers =
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((element) => element.isTypeOnly);
      addImport(
        node.moduleSpecifier,
        'export',
        Boolean(node.isTypeOnly || hasOnlyTypeSpecifiers),
      );
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addImport(node.moduleReference.expression, 'import');
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      addImport(node.argument.literal, 'type import', true);
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
  for (const [packageAlias, packageRoot] of packageAliases) {
    if (specifier === packageAlias || specifier.startsWith(`${packageAlias}/`)) {
      const packageSubpath = specifier === packageAlias ? '' : specifier.slice(packageAlias.length + 1);
      targetRepositoryPath = path.posix.normalize(path.posix.join(packageRoot, packageSubpath));
      break;
    }
  }

  if (targetRepositoryPath === null && specifier.startsWith('@debtulator/')) {
    return { kind: 'unknown-workspace', layer: null, repositoryPath: null };
  }
  if (targetRepositoryPath === null && specifier === '@/src') {
    targetRepositoryPath = 'apps/mobile/src';
  } else if (targetRepositoryPath === null && specifier.startsWith('@/src/')) {
    targetRepositoryPath = path.posix.normalize(
      path.posix.join('apps/mobile/src', specifier.slice('@/src/'.length)),
    );
  } else if (targetRepositoryPath === null && specifier === '@/app') {
    targetRepositoryPath = 'apps/mobile/app';
  } else if (targetRepositoryPath === null && specifier.startsWith('@/app/')) {
    targetRepositoryPath = path.posix.normalize(
      path.posix.join('apps/mobile/app', specifier.slice('@/app/'.length)),
    );
  } else if (targetRepositoryPath === null && specifier.startsWith('@/')) {
    targetRepositoryPath = path.posix.normalize(
      path.posix.join('apps/mobile', specifier.slice(2)),
    );
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

function packageNameForSpecifier(specifier) {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/')) {
    return null;
  }
  if (specifier.startsWith('node:')) {
    return 'node:';
  }
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

function sdkLayersForSpecifier(specifier) {
  const packageName = packageNameForSpecifier(specifier);
  if (
    packageName === 'node:' ||
    (packageName && nodeBuiltinPackages.has(packageName.replace(/^node:/, '')))
  ) {
    return new Set();
  }
  return packageName ? sdkAllowedLayers.get(packageName) || null : null;
}

function isGeneratedContractsFile(repositoryPath) {
  return repositoryPath.startsWith('packages/contracts/src/generated/');
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
        'Move reusable behavior out of app/ and import its owning layer instead.',
      );
    }
    if (target.kind === 'unknown-workspace' || (target.kind === 'internal' && !target.layer)) {
      return violation(
        repositoryPath,
        imported,
        'composition-boundary',
        `Composition imports an unowned workspace module via "${imported.specifier}".`,
        'Import one of the declared workspace packages/mobile layers or move the module into an owned boundary.',
      );
    }
    if (target.kind === 'outside') {
      return violation(
        repositoryPath,
        imported,
        'composition-boundary',
        `Composition imports outside the repository via "${imported.specifier}".`,
        'Use a workspace package, mobile adapter, or an installed dependency.',
      );
    }
    return null;
  }

  if (sourceLayer === 'presentation' && isCompositionController(repositoryPath)) {
    if (target.kind === 'internal' && target.layer && target.layer !== 'app') {
      return null;
    }
    if (target.kind === 'external') {
      return null;
    }
  }

  if (sourceLayer === 'contracts') {
    if (target.kind === 'internal' && target.layer === 'contracts') {
      return null;
    }
    const packageName = packageNameForSpecifier(imported.specifier);
    if (
      target.kind === 'external' &&
      isGeneratedContractsFile(repositoryPath) &&
      imported.isTypeOnly &&
      generatedSupabaseTypePackages.has(packageName)
    ) {
      return null;
    }
    return violation(
      repositoryPath,
      imported,
      'contracts-boundary',
      `Generated contracts must be standalone; "${imported.specifier}" crosses the contracts package boundary.`,
      'Keep generated scalar/database types self-contained; map them to domain objects in mobile infrastructure.',
    );
  }

  if (target.kind === 'external') {
    const sdkLayers = sdkLayersForSpecifier(imported.specifier);
    if (sdkLayers && !sdkLayers.has(sourceLayer)) {
      return violation(
        repositoryPath,
        imported,
        'sdk-boundary',
        `The "${packageNameForSpecifier(imported.specifier)}" SDK is not owned by the ${sourceLayer} layer.`,
        sourceLayer === 'presentation'
          ? 'Consume an application/domain contract and inject the infrastructure or platform adapter from composition.'
          : 'Move this SDK access to its owning mobile adapter and expose only an application-owned port inward.',
      );
    }
  }

  const allowedLayers = allowedInternalDependencies[sourceLayer];
  if (target.kind === 'internal' && target.layer && allowedLayers.has(target.layer)) {
    return null;
  }

  if (target.kind === 'external' && sourceLayer === 'domain') {
    // Known framework/native/data SDKs were rejected above. Remaining packages
    // are treated as pure utilities; adding a new runtime SDK requires adding
    // ownership to sdkAllowedLayers.
    return null;
  }

  if (
    target.kind === 'external' &&
    (sourceLayer === 'infrastructure' || sourceLayer === 'platform' || sourceLayer === 'presentation')
  ) {
    return null;
  }

  if (sourceLayer === 'domain') {
    return violation(
      repositoryPath,
      imported,
      'domain-boundary',
      `Domain code may import only @debtulator/domain or pure external utilities; "${imported.specifier}" points outside the domain.`,
      'Move framework, persistence, network, and platform behavior behind an application port; keep domain logic pure.',
    );
  }
  if (sourceLayer === 'application') {
    return violation(
      repositoryPath,
      imported,
      'application-boundary',
      `Application code may import only @debtulator/application and @debtulator/domain; "${imported.specifier}" is an outward dependency.`,
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
    (/^apps\/mobile\/src\/presentation\/(?:screens|features)(?:\/|$)/.test(
      target.repositoryPath,
    ) ||
      /^apps\/mobile\/src\/presentation\/navigation\/(?:routes|canonicalRoutes)(?:\.|\/|$)/.test(
        target.repositoryPath,
      ))
  ) {
    return null;
  }
  return violation(
    repositoryPath,
    imported,
    'route-boundary',
    `Non-layout routes may import only Expo Router, presentation screens/features, or canonical route definitions; found "${imported.specifier}".`,
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

  if (path.resolve(root) === repositoryRoot) {
    for (const layerRoot of layerRoots.keys()) {
      if (!fs.existsSync(path.join(root, layerRoot))) {
        violations.push({
          file: layerRoot,
          line: 1,
          column: 1,
          specifier: null,
          rule: 'workspace-layout',
          message: `Required workspace boundary "${layerRoot}" is missing.`,
          fix: 'Restore the declared monorepo layer so the checker cannot silently skip its source files.',
        });
      }
    }
  }

  for (const filePath of files) {
    const repositoryPath = toPosix(path.relative(root, filePath));
    const sourceLayer = layerForRepositoryPath(repositoryPath);
    if (!sourceLayer) {
      if (
        repositoryPath.startsWith('apps/mobile/src/') ||
        /^packages\/[^/]+\/src\//.test(repositoryPath)
      ) {
        violations.push({
          file: repositoryPath,
          line: 1,
          column: 1,
          specifier: null,
          rule: 'unowned-source',
          message: 'Source file is outside every declared workspace layer.',
          fix: 'Move it into domain, application, contracts, infrastructure, platform, presentation, or composition.',
        });
      }
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
      (sourceLayer === 'domain' || sourceLayer === 'application' || sourceLayer === 'contracts') &&
      (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))
    ) {
      violations.push({
        file: repositoryPath,
        line: 1,
        column: 1,
        specifier: null,
        rule: `${sourceLayer}-jsx`,
        message: `${sourceLayer[0].toUpperCase()}${sourceLayer.slice(1)} code must not contain JSX.`,
        fix: 'Move the view/component to apps/mobile/src/presentation and keep workspace packages framework-independent.',
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
    '\nBoundary summary: domain -> domain/pure utilities; application -> application/domain; contracts -> contracts/generated scalar types; infrastructure -> infrastructure/platform/application/domain/contracts; platform -> platform/application/domain; presentation -> presentation/application/domain. Composition and route layouts are the wiring roots; composition never imports route entries.',
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
  packageNameForSpecifier,
  resolveImport,
  sdkLayersForSpecifier,
};
