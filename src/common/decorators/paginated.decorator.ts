import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export const PAGINATED_KEY = 'paginated';

export interface PaginationConfig {
  defaultLimit?: number;
  maxLimit?: number;
  allowAll?: boolean; // Allow limit=-1 for all records
}

/**
 * Decorator to mark endpoints as paginated and configure pagination behavior
 */
export const Paginated = (config: PaginationConfig = {}) => {
  return SetMetadata(PAGINATED_KEY, {
    defaultLimit: config.defaultLimit || 10,
    maxLimit: config.maxLimit || 100,
    allowAll: config.allowAll || false,
  });
};

/**
 * DTO for pagination query parameters
 */
export class PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 10;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  search?: string;
}

/**
 * Enhanced pagination query DTO with cursor support
 */
export class CursorPaginationQueryDto {
  @IsOptional()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  direction?: 'forward' | 'backward' = 'forward';
}

/**
 * Standard pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage?: number;
  previousPage?: number;
}

/**
 * Cursor pagination metadata
 */
export interface CursorPaginationMeta {
  hasNext: boolean;
  hasPrevious: boolean;
  nextCursor?: string;
  previousCursor?: string;
  limit: number;
  count: number;
}

/**
 * Paginated response wrapper
 */
export class PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;

  constructor(data: T[], meta: PaginationMeta) {
    this.data = data;
    this.meta = meta;
  }

  static create<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrevious,
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: hasPrevious ? page - 1 : undefined,
    };

    return new PaginatedResponse(data, meta);
  }
}

/**
 * Cursor-based paginated response wrapper
 */
export class CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;

  constructor(data: T[], meta: CursorPaginationMeta) {
    this.data = data;
    this.meta = meta;
  }

  static create<T>(
    data: T[],
    limit: number,
    nextCursor?: string,
    previousCursor?: string,
  ): CursorPaginatedResponse<T> {
    const meta: CursorPaginationMeta = {
      hasNext: !!nextCursor,
      hasPrevious: !!previousCursor,
      nextCursor,
      previousCursor,
      limit,
      count: data.length,
    };

    return new CursorPaginatedResponse(data, meta);
  }
}

/**
 * Parameter decorator to extract pagination parameters from request
 */
export const Pagination = createParamDecorator(
  (config: PaginationConfig = {}, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    const defaultLimit = config.defaultLimit || 10;
    const maxLimit = config.maxLimit || 100;

    let page = parseInt(query.page) || 1;
    let limit = parseInt(query.limit) || defaultLimit;

    // Validate and constrain values
    page = Math.max(1, page);
    
    if (config.allowAll && limit === -1) {
      limit = Number.MAX_SAFE_INTEGER;
    } else {
      limit = Math.min(Math.max(1, limit), maxLimit);
    }

    const sortBy = query.sortBy || 'created_at';
    const order = (query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    const search = query.search || undefined;

    return {
      page,
      limit,
      skip: (page - 1) * limit,
      sortBy,
      order,
      search,
    };
  },
);

/**
 * Parameter decorator for cursor-based pagination
 */
export const CursorPagination = createParamDecorator(
  (config: PaginationConfig = {}, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    const defaultLimit = config.defaultLimit || 10;
    const maxLimit = config.maxLimit || 100;

    const cursor = query.cursor || undefined;
    let limit = parseInt(query.limit) || defaultLimit;
    const direction = query.direction === 'backward' ? 'backward' : 'forward';

    // Validate and constrain limit
    limit = Math.min(Math.max(1, limit), maxLimit);

    // Decode cursor if provided
    let decodedCursor: any = null;
    if (cursor) {
      try {
        decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
      } catch (e) {
        // Invalid cursor, ignore
      }
    }

    return {
      cursor: decodedCursor,
      limit,
      direction,
      encodedCursor: cursor,
    };
  },
);

/**
 * Utility class for cursor encoding/decoding
 */
export class CursorUtils {
  /**
   * Encode cursor data to base64 string
   */
  static encode(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Decode cursor from base64 string
   */
  static decode(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (e) {
      return null;
    }
  }

  /**
   * Create cursor from entity
   */
  static createCursor(entity: any, sortField = 'createdAt'): string {
    const cursorData = {
      id: entity.id,
      [sortField]: entity[sortField]?.toISOString?.() || entity[sortField],
    };
    return this.encode(cursorData);
  }

  /**
   * Create cursors for pagination response
   */
  static createCursors<T>(
    data: T[],
    sortField = 'createdAt',
  ): { nextCursor?: string; previousCursor?: string } {
    if (data.length === 0) {
      return {};
    }

    const firstItem = data[0] as any;
    const lastItem = data[data.length - 1] as any;

    return {
      nextCursor: this.createCursor(lastItem, sortField),
      previousCursor: this.createCursor(firstItem, sortField),
    };
  }
}

/**
 * Interceptor to automatically handle pagination responses
 */
import { Injectable, NestInterceptor, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const paginationConfig = this.reflector.get<PaginationConfig>(
      PAGINATED_KEY,
      context.getHandler(),
    );

    if (!paginationConfig) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already a PaginatedResponse, return as-is
        if (data instanceof PaginatedResponse || data instanceof CursorPaginatedResponse) {
          return data;
        }

        // If data has pagination structure, wrap it
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return data;
        }

        // Otherwise, return data as-is (might be handled manually in controller)
        return data;
      }),
    );
  }
}

/**
 * Query builder helper for pagination
 */
export class PaginationQueryBuilder {
  /**
   * Apply pagination to TypeORM query builder
   */
  static applyPagination<T>(
    queryBuilder: any,
    pagination: {
      page: number;
      limit: number;
      skip: number;
      sortBy: string;
      order: 'ASC' | 'DESC';
      search?: string;
    },
    searchFields: string[] = [],
  ) {
    // Apply search if provided
    if (pagination.search && searchFields.length > 0) {
      const searchConditions = searchFields
        .map((field, index) => `${field} ILIKE :search${index}`)
        .join(' OR ');
      
      queryBuilder.andWhere(`(${searchConditions})`, 
        searchFields.reduce((params, _, index) => {
          params[`search${index}`] = `%${pagination.search}%`;
          return params;
        }, {} as any)
      );
    }

    // Apply sorting
    queryBuilder.orderBy(pagination.sortBy, pagination.order);

    // Apply pagination
    queryBuilder.skip(pagination.skip).take(pagination.limit);

    return queryBuilder;
  }

  /**
   * Apply cursor-based pagination to TypeORM query builder
   */
  static applyCursorPagination<T>(
    queryBuilder: any,
    pagination: {
      cursor: any;
      limit: number;
      direction: 'forward' | 'backward';
    },
    sortField = 'createdAt',
  ) {
    if (pagination.cursor) {
      const operator = pagination.direction === 'forward' ? '>' : '<';
      const cursorValue = pagination.cursor[sortField];
      
      if (cursorValue) {
        queryBuilder.andWhere(`${sortField} ${operator} :cursorValue`, {
          cursorValue,
        });
      }
    }

    // Apply sorting
    const order = pagination.direction === 'forward' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(sortField, order);

    // Apply limit (fetch one extra to determine if there are more results)
    queryBuilder.take(pagination.limit + 1);

    return queryBuilder;
  }
}