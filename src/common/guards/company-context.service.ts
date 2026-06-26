import { Injectable, Scope } from '@nestjs/common';
import { InternalServerException } from '../exceptions/app.exception';

/**
 * Request-scoped service that holds the authenticated user's context.
 * Populated by CompanyContextGuard after JWT validation.
 */
@Injectable({ scope: Scope.REQUEST })
export class CompanyContextService {
  private _userId: string | null = null;
  private _companyId: string | null = null;
  private _role: string | null = null;

  setContext(userId: string, companyId: string, role: string): void {
    this._userId = userId;
    this._companyId = companyId;
    this._role = role;
  }

  get userId(): string {
    if (!this._userId) {
      throw new InternalServerException('CompanyContext not initialised — userId is missing');
    }
    return this._userId;
  }

  get companyId(): string {
    if (!this._companyId) {
      throw new InternalServerException('CompanyContext not initialised — companyId is missing');
    }
    return this._companyId;
  }

  get role(): string {
    if (!this._role) {
      throw new InternalServerException('CompanyContext not initialised — role is missing');
    }
    return this._role;
  }

  get isInitialised(): boolean {
    return this._userId !== null && this._companyId !== null;
  }
}
