/**
 * 폼 액션의 초기 상태.
 *
 * `"use server"` 파일은 async 함수만 export 할 수 있으므로 상수·타입은 여기에 둔다.
 */
export type AuthState = {
  readonly error: string | null;
  readonly notice: string | null;
};
export const AUTH_INITIAL: AuthState = { error: null, notice: null };

export type OperationState = AuthState;
export const OPERATION_INITIAL: OperationState = { error: null, notice: null };
