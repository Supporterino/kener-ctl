import type { YAMLException } from "js-yaml"
import { load as yamlLoad, loadAll as yamlLoadAll } from "js-yaml"

export interface YamlLoadResult<T = unknown> {
  data: T
  filePath: string
}

export function loadYaml<T = unknown>(content: string, filePath: string): T {
  try {
    return yamlLoad(content) as T
  } catch (err) {
    throw enrichYamlError(err, filePath)
  }
}

export function loadAllYaml<T = unknown>(content: string, filePath: string): T[] {
  try {
    return yamlLoadAll(content) as T[]
  } catch (err) {
    throw enrichYamlError(err, filePath)
  }
}

export function loadYamlFromFile<T = unknown>(
  content: string,
  filePath: string,
): YamlLoadResult<T> {
  try {
    const data = yamlLoad(content)
    if (data === undefined || data === null) {
      return { data: {} as T, filePath }
    }
    if (Array.isArray(data)) {
      throw new Error(
        `YAML root is an array in ${filePath}. Expected a document or document stream (--- separated). Use loadAllYaml for arrays.`,
      )
    }
    return { data: data as T, filePath }
  } catch (err) {
    throw enrichYamlError(err, filePath)
  }
}

export function loadAllYamlFromFile<T = unknown>(
  content: string,
  filePath: string,
): YamlLoadResult<T>[] {
  try {
    const documents = yamlLoadAll(content) as unknown[]
    if (documents.length === 1 && Array.isArray(documents[0])) {
      const arr = documents[0] as unknown[]
      return arr.map((item) => ({ data: item as T, filePath }))
    }
    return documents.map((doc) => ({ data: doc as T, filePath }))
  } catch (err) {
    throw enrichYamlError(err, filePath)
  }
}

function enrichYamlError(err: unknown, filePath: string): Error {
  if (err instanceof Error) {
    const yamlErr = err as YAMLException
    const line = (yamlErr as unknown as { mark?: { line?: number } }).mark?.line
    const lineInfo = line !== undefined ? ` (line ${line + 1})` : ""
    return new Error(`YAML error in ${filePath}${lineInfo}: ${err.message}`)
  }
  return new Error(`Unknown YAML error in ${filePath}`)
}
