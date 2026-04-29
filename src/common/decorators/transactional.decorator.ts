import { SetMetadata } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

export const TRANSACTIONAL_KEY = 'transactional';

export interface TransactionalOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
}

/**
 * Decorator to wrap method execution in a database transaction
 * Provides automatic rollback on exceptions and configurable isolation levels
 */
export const Transactional = (options: TransactionalOptions = {}) => {
  return SetMetadata(TRANSACTIONAL_KEY, {
    isolationLevel: options.isolationLevel || 'READ_COMMITTED',
    timeout: options.timeout || 30000, // 30 seconds default
    retryAttempts: options.retryAttempts || 0,
    retryDelay: options.retryDelay || 1000,
  });
};

/**
 * Transaction manager utility class
 * Handles transaction lifecycle, nested transactions, and connection pooling
 */
export class TransactionManager {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute operation within a transaction with automatic rollback on failure
   */
  async executeInTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
    options: TransactionalOptions = {},
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      
      // Convert isolation level format from underscore to space
      const isolationLevel = options.isolationLevel?.replace(/_/g, ' ') as any;
      
      // Start transaction with isolation level
      await queryRunner.startTransaction(isolationLevel);
      
      // Set timeout if specified
      if (options.timeout) {
        setTimeout(() => {
          if (!queryRunner.isReleased) {
            queryRunner.rollbackTransaction().catch(() => {});
            queryRunner.release().catch(() => {});
          }
        }, options.timeout);
      }
      
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      
      return result;
    } catch (error) {
      // Rollback transaction on any error
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      
      // Retry logic if configured
      if (options.retryAttempts && options.retryAttempts > 0) {
        await new Promise(resolve => setTimeout(resolve, options.retryDelay || 1000));
        return this.executeInTransaction(operation, {
          ...options,
          retryAttempts: options.retryAttempts - 1,
        });
      }
      
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeMultipleInTransaction<T>(
    operations: Array<(queryRunner: QueryRunner) => Promise<any>>,
    options: TransactionalOptions = {},
  ): Promise<T[]> {
    return this.executeInTransaction(async (queryRunner) => {
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(queryRunner);
        results.push(result);
      }
      return results;
    }, options);
  }

  /**
   * Check if a transaction is currently active
   */
  isTransactionActive(queryRunner: QueryRunner): boolean {
    return queryRunner.isTransactionActive;
  }

  /**
   * Create a savepoint for nested transaction support
   */
  async createSavepoint(queryRunner: QueryRunner, name: string): Promise<void> {
    await queryRunner.query(`SAVEPOINT ${name}`);
  }

  /**
   * Rollback to a savepoint
   */
  async rollbackToSavepoint(queryRunner: QueryRunner, name: string): Promise<void> {
    await queryRunner.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  /**
   * Release a savepoint
   */
  async releaseSavepoint(queryRunner: QueryRunner, name: string): Promise<void> {
    await queryRunner.query(`RELEASE SAVEPOINT ${name}`);
  }
}

/**
 * Interceptor to handle transactional methods
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class TransactionalInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const transactionalOptions = this.reflector.get<TransactionalOptions>(
      TRANSACTIONAL_KEY,
      context.getHandler(),
    );

    if (!transactionalOptions) {
      return next.handle();
    }

    const transactionManager = new TransactionManager(this.dataSource);
    
    return new Observable((observer) => {
      transactionManager
        .executeInTransaction(async () => {
          return next.handle().toPromise();
        }, transactionalOptions)
        .then((result) => {
          observer.next(result);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }
}