import { type ExceptionFilter, Catch, type ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common"
import type { HttpAdapterHost } from "@nestjs/core"
import { QueryFailedError, EntityNotFoundError } from "typeorm" // Import TypeORM errors
import { PostgresErrorCode } from "../constants/postgres-error-codes.enum" // Custom enum for PG error codes

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost

    const ctx = host.switchToHttp()

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR
    let message = "Internal server error"
    let error = "InternalServerError"

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus()
      const response = exception.getResponse()
      if (typeof response === "string") {
        message = response
      } else if (typeof response === "object" && response !== null) {
        message = (response as any).message || message
        error = (response as any).error || error
      }
    } else if (exception instanceof QueryFailedError) {
      // Handle TypeORM QueryFailedError (e.g., from unique constraints, foreign keys)
      const pgError = exception.driverError
      switch (pgError.code) {
        case PostgresErrorCode.UniqueViolation:
          httpStatus = HttpStatus.CONFLICT
          message = `Duplicate entry: ${pgError.detail || exception.message}`
          error = "Conflict"
          break
        case PostgresErrorCode.ForeignKeyViolation:
          httpStatus = HttpStatus.BAD_REQUEST
          message = `Referenced record not found or invalid: ${pgError.detail || exception.message}`
          error = "BadRequest"
          break
        case PostgresErrorCode.InvalidTextRepresentation:
          httpStatus = HttpStatus.BAD_REQUEST
          message = `Invalid input format: ${pgError.detail || exception.message}`
          error = "BadRequest"
          break
        default:
          httpStatus = HttpStatus.BAD_REQUEST
          message = `Database error: ${exception.message}`
          error = "DatabaseError"
          break
      }
    } else if (exception instanceof EntityNotFoundError) {
      httpStatus = HttpStatus.NOT_FOUND
      message = "Resource not found."
      error = "NotFound"
    } else if (exception instanceof Error) {
      message = exception.message
      error = exception.name
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message,
      error,
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
  }
}
