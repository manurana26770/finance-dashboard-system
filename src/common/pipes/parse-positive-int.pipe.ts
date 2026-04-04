import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const normalized = value?.trim();

    if (!normalized || !/^[1-9]\d*$/.test(normalized)) {
      throw new BadRequestException('id must be a positive integer');
    }

    const parsed = Number(normalized);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('id must be a positive integer');
    }

    return parsed;
  }
}
