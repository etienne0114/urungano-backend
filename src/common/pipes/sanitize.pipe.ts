import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [], // No HTML allowed by default
        allowedAttributes: {},
      });
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }

    return value;
  }

  private sanitizeObject(obj: any): any {
    const sanitizedObj: Record<string, any> = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        
        if (typeof val === 'string') {
          sanitizedObj[key] = sanitizeHtml(val, {
            allowedTags: [],
            allowedAttributes: {},
          });
        } else if (typeof val === 'object' && val !== null) {
          sanitizedObj[key] = this.sanitizeObject(val);
        } else {
          sanitizedObj[key] = val;
        }
      }
    }
    
    return sanitizedObj;
  }
}
