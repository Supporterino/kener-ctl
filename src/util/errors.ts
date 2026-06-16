export class KenerCtlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "KenerCtlError"
  }
}

export class ValidationError extends KenerCtlError {
  readonly errors: Array<{ filePath: string; message: string }>

  constructor(errors: Array<{ filePath: string; message: string }>) {
    super("Manifest validation failed")
    this.name = "ValidationError"
    this.errors = errors
  }

  override toString(): string {
    const lines = [this.message, ""]
    for (const err of this.errors) {
      lines.push(`  ${err.filePath}: ${err.message}`)
    }
    return lines.join("\n")
  }
}

export class ConfigError extends KenerCtlError {
  readonly issues: string[]

  constructor(issues: string[]) {
    super("Configuration error")
    this.name = "ConfigError"
    this.issues = issues
  }

  override toString(): string {
    const lines = [this.message, ""]
    for (const issue of this.issues) {
      lines.push(`  - ${issue}`)
    }
    return lines.join("\n")
  }
}

export class ApiError extends KenerCtlError {
  readonly statusCode: number
  readonly resourceKind?: string
  readonly resourceKey?: string
  readonly responseBody?: unknown

  constructor(
    message: string,
    statusCode: number,
    opts?: { resourceKind?: string; resourceKey?: string; responseBody?: unknown },
  ) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.resourceKind = opts?.resourceKind
    this.resourceKey = opts?.resourceKey
    this.responseBody = opts?.responseBody
  }

  override toString(): string {
    const parts = [`[${this.statusCode}] ${this.message}`]
    if (this.resourceKind && this.resourceKey) {
      parts.push(` (${this.resourceKind}/${this.resourceKey})`)
    }
    if (this.responseBody) {
      parts.push(` — ${JSON.stringify(this.responseBody)}`)
    }
    return parts.join("")
  }
}

export class NetworkError extends KenerCtlError {
  readonly cause: Error

  constructor(cause: Error) {
    super(`Network error: ${cause.message}`)
    this.name = "NetworkError"
    this.cause = cause
  }
}
