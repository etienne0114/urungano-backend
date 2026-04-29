import { 
  Repository, 
  DataSource, 
  QueryRunner, 
  SelectQueryBuilder,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral
} from 'typeorm';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { TransactionManager, TransactionalOptions } from '../decorators/transactional.decorator';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export abstract class BaseService<T extends ObjectLiteral> {
  protected readonly transactionManager: TransactionManager;

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly dataSource: DataSource,
  ) {
    this.transactionManager = new TransactionManager(dataSource);
  }

  /**
   * Run operations inside a transaction with enhanced options
   */
  async runInTransaction<R>(
    operation: (queryRunner: QueryRunner) => Promise<R>,
    options: TransactionalOptions = {},
  ): Promise<R> {
    return this.transactionManager.executeInTransaction(operation, options);
  }

  /**
   * Legacy method for backward compatibility
   */
  async runInTransactionLegacy<R>(
    operation: (queryRunner: QueryRunner) => Promise<R>,
  ): Promise<R> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeMultipleInTransaction<R>(
    operations: Array<(queryRunner: QueryRunner) => Promise<any>>,
    options: TransactionalOptions = {},
  ): Promise<R[]> {
    return this.transactionManager.executeMultipleInTransaction(operations, options);
  }

  /**
   * Find all with pagination
   */
  async findAllPaginated(
    options: PaginationOptions = {},
    findOptions: FindManyOptions<T> = {},
  ): Promise<PaginatedResult<T>> {
    const { 
      page = 1, 
      limit = 10, 
      sortBy, 
      order = 'DESC' 
    } = options;

    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      ...findOptions,
      take: limit,
      skip: skip,
      order: sortBy ? { [sortBy]: order } as any : findOptions.order,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one or throw 404
   */
  async findOneOrThrow(options: FindOneOptions<T>): Promise<T> {
    const entity = await this.repository.findOne(options);
    if (!entity) {
      throw new NotFoundException(`Resource not found`);
    }
    return entity;
  }

  /**
   * Find by ID or throw 404
   */
  async findById(id: string): Promise<T> {
    return this.findOneOrThrow({ where: { id: id as any } });
  }

  /**
   * Standardized save with logging
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data as any);
      return await this.repository.save(entity as any) as T;
    } catch (error) {
      throw new InternalServerErrorException('Error creating resource');
    }
  }
}
