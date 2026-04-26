import { applyDecorators, UsePipes } from '@nestjs/common';
import { SanitizationPipe } from '../pipes/sanitization.pipe';
import { UsernameValidationPipe } from '../pipes/username-validation.pipe';
import { PinValidationPipe } from '../pipes/pin-validation.pipe';

/**
 * Apply username validation to a specific parameter
 */
export function ValidateUsername() {
  return applyDecorators(
    UsePipes(new UsernameValidationPipe())
  );
}

/**
 * Apply PIN validation to a specific parameter
 */
export function ValidatePin() {
  return applyDecorators(
    UsePipes(new PinValidationPipe())
  );
}

/**
 * Apply comprehensive sanitization to all inputs
 */
export function SanitizeInput() {
  return applyDecorators(
    UsePipes(new SanitizationPipe())
  );
}

/**
 * Apply enhanced security validation for sensitive endpoints
 */
export function SecureValidation() {
  return applyDecorators(
    UsePipes(new SanitizationPipe())
  );
}