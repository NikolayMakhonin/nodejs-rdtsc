import {describe, expect, it} from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {fileURLToPath} from 'url'
import ts from 'typescript'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))

/**
 * Module paths that the file imports and re-exports, except type-only ones.
 * TypeScript removes type-only imports from the output, so they form no cycle
 */
function getRuntimeImports(file: string, text: string): string[] {
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest)
  const result: string[] = []
  for (const statement of sourceFile.statements) {
    let specifier: ts.Expression | undefined
    let isTypeOnly = false
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause
      specifier = statement.moduleSpecifier
      isTypeOnly = clause != null
        && (clause.isTypeOnly || clause.name == null && isEverySpecifierTypeOnly(clause.namedBindings))
    }
    else if (ts.isExportDeclaration(statement)) {
      specifier = statement.moduleSpecifier
      isTypeOnly = statement.isTypeOnly || isEverySpecifierTypeOnly(statement.exportClause)
    }
    if (specifier != null && ts.isStringLiteral(specifier) && !isTypeOnly) {
      result.push(specifier.text)
    }
  }
  return result
}

function isEverySpecifierTypeOnly(
  bindings: ts.NamedImportBindings | ts.NamedExportBindings | undefined,
): boolean {
  return bindings != null
    && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))
    && bindings.elements.every(o => o.isTypeOnly)
}

function resolveImport(files: Set<string>, fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) {
    return null
  }
  const base = path.resolve(path.dirname(fromFile), spec)
  for (const candidate of [base + '.ts', path.join(base, 'index.ts')]) {
    if (files.has(candidate)) {
      return candidate
    }
  }
  return null
}

async function findImportCycles(): Promise<string[]> {
  const names = await fs.promises.readdir(SRC_DIR, {recursive: true})
  const files = new Set(names.filter(o => o.endsWith('.ts')).map(o => path.join(SRC_DIR, o)))
  const graph = new Map<string, string[]>()
  for (const file of files) {
    const text = await fs.promises.readFile(file, 'utf8')
    const targets: string[] = []
    for (const spec of getRuntimeImports(file, text)) {
      const target = resolveImport(files, file, spec)
      if (target) {
        targets.push(target)
      }
    }
    graph.set(file, targets)
  }

  const cycles: string[] = []
  const stack: string[] = []
  const states = new Map<string, 'visiting' | 'done'>()
  function visit(file: string) {
    states.set(file, 'visiting')
    stack.push(file)
    for (const target of graph.get(file)!) {
      const state = states.get(target)
      if (state === 'visiting') {
        cycles.push(
          stack
            .slice(stack.indexOf(target))
            .concat(target)
            .map(o => path.relative(SRC_DIR, o).replace(/\\/g, '/'))
            .join(' -> '),
        )
      }
      else if (state == null) {
        visit(target)
      }
    }
    stack.pop()
    states.set(file, 'done')
  }
  for (const file of graph.keys()) {
    if (!states.has(file)) {
      visit(file)
    }
  }
  return cycles
}

describe('imports', () => {
  it('form no cycles', async () => {
    expect(await findImportCycles()).toEqual([])
  })
})
