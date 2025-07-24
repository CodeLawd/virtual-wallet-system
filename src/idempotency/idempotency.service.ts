import { Injectable, ConflictException, InternalServerErrorException } from "@nestjs/common"
import type { Repository, EntityManager } from "typeorm" // Import Repository and EntityManager
import { IdempotencyKey } from "../entities/idempotency-key.entity" // Import IdempotencyKey entity
import type { IdempotencyStatus } from "../common/enums"
import { PostgresErrorCode } from "../common/constants/postgres-error-codes.enum"

@Injectable()
export class IdempotencyService {
  private idempotencyKeysRepository: Repository<IdempotencyKey>

  constructor(entityManager: EntityManager) {
    this.idempotencyKeysRepository = entityManager.getRepository(IdempotencyKey)
  }

  async create(
    key: string,
    tenantId: string,
    status: IdempotencyStatus,
    entityManager?: EntityManager, // Optional EntityManager for transaction
  ): Promise<IdempotencyKey> {
    const repo = entityManager ? entityManager.getRepository(IdempotencyKey) : this.idempotencyKeysRepository
    const newIdempotencyKey = repo.create({ key, tenantId, status })
    try {
      const idempotencyKey = await repo.save(newIdempotencyKey)
      return idempotencyKey
    } catch (error) {
      if (error.code === PostgresErrorCode.UniqueViolation) {
        throw new ConflictException(`Idempotency key '${key}' already exists for this tenant.`)
      }
      throw error
    }
  }

  async findByKeyAndTenantId(
    key: string,
    tenantId: string,
    entityManager?: EntityManager,
  ): Promise<IdempotencyKey | null> {
    const repo = entityManager ? entityManager.getRepository(IdempotencyKey) : this.idempotencyKeysRepository
    const idempotencyKey = await repo.findOneBy({ key, tenantId })
    return idempotencyKey
  }

  async updateStatus(
    idempotencyKeyId: string,
    status: IdempotencyStatus,
    entityManager: EntityManager, // EntityManager is required for this update
    resourceId?: string,
    responsePayload?: Record<string, any>,
  ): Promise<IdempotencyKey> {
    const updateData: Partial<IdempotencyKey> = { status }
    if (resourceId) {
      updateData.resourceId = resourceId
    }
    if (responsePayload) {
      updateData.responsePayload = responsePayload
    }

    const result = await entityManager.update(IdempotencyKey, { id: idempotencyKeyId }, updateData)

    if (result.affected === 0) {
      throw new InternalServerErrorException(`Failed to update idempotency key with ID '${idempotencyKeyId}'.`)
    }

    const updatedKey = await entityManager.findOneBy(IdempotencyKey, { id: idempotencyKeyId })
    if (!updatedKey) {
      throw new InternalServerErrorException(`Idempotency key with ID '${idempotencyKeyId}' not found after update.`)
    }
    return updatedKey
  }
}
