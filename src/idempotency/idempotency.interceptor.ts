import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  ConflictException,
  Logger,
  BadRequestException,
} from "@nestjs/common"
import { Observable, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"
import type { IdempotencyService } from "./idempotency.service"
import { IdempotencyStatus } from "../common/enums"
import type { DataSource } from "typeorm" // Import DataSource

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name)

  constructor(
    private idempotencyService: IdempotencyService,
    private dataSource: DataSource, // Inject DataSource
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()
    const idempotencyKey = request.headers["idempotency-key"]
    const tenantId = request.tenantId // Assumed to be set by JwtAuthGuard

    if (!idempotencyKey) {
      throw new BadRequestException("Idempotency-Key header is required for this operation.")
    }

    // Use a query runner for the initial idempotency check to ensure it's part of a transaction
    // that can be rolled back if the request is a duplicate.
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const existingIdempotency = await this.idempotencyService.findByKeyAndTenantId(
        idempotencyKey,
        tenantId,
        queryRunner.manager, // Pass the EntityManager from the query runner
      )

      if (existingIdempotency) {
        if (existingIdempotency.status === IdempotencyStatus.PROCESSED) {
          // Request already processed, return stored response
          await queryRunner.commitTransaction()
          this.logger.log(`Idempotent request '${idempotencyKey}' already processed. Returning stored response.`)
          response
            .status(existingIdempotency.responsePayload?.statusCode || 200)
            .json(existingIdempotency.responsePayload)
          return new Observable() // Stop further processing
        } else if (existingIdempotency.status === IdempotencyStatus.PENDING) {
          // Request is currently being processed
          await queryRunner.rollbackTransaction()
          throw new ConflictException("Idempotent request is currently being processed.")
        }
        // If status is FAILED, allow the request to proceed for retry.
        // The service logic will update its status to PENDING again.
      } else {
        // Create a new idempotency key record with PENDING status
        await this.idempotencyService.create(idempotencyKey, tenantId, IdempotencyStatus.PENDING, queryRunner.manager)
      }

      // Pass the EntityManager from the query runner to the request object
      // so the service can use it for the main transaction.
      request.entityManager = queryRunner.manager

      return next.handle().pipe(
        tap(async (data) => {
          // On successful response, the service should have committed its transaction
          // and updated the idempotency key.
          // We just need to ensure the queryRunner is released.
          if (!queryRunner.isReleased) {
            await queryRunner.release()
          }
        }),
        catchError(async (err) => {
          // On error, ensure the queryRunner is rolled back and released
          if (!queryRunner.isReleased) {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()
          }
          // The service should have already updated the idempotency key to FAILED if its transaction failed.
          return throwError(() => err)
        }),
      )
    } catch (error) {
      // If an error occurs before next.handle() (e.g., during idempotency key lookup/creation)
      if (!queryRunner.isReleased) {
        await queryRunner.rollbackTransaction()
        await queryRunner.release()
      }
      throw error
    }
  }
}
