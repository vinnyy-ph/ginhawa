import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_JWT_KEY = 'optional_jwt';
export const OptionalJwt = () => SetMetadata(OPTIONAL_JWT_KEY, true);
