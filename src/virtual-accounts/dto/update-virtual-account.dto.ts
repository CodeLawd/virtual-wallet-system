import { PartialType } from '@nestjs/mapped-types';
import { CreateVirtualAccountDto } from './create-virtual-account.dto';

export class UpdateVirtualAccountDto extends PartialType(CreateVirtualAccountDto) {}
