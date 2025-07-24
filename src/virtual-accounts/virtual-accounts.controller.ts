import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VirtualAccountsService } from './virtual-accounts.service';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { UpdateVirtualAccountDto } from './dto/update-virtual-account.dto';

@Controller('virtual-accounts')
export class VirtualAccountsController {
  constructor(private readonly virtualAccountsService: VirtualAccountsService) {}

  @Post()
  create(@Body() createVirtualAccountDto: CreateVirtualAccountDto) {
    return this.virtualAccountsService.create(createVirtualAccountDto);
  }

  @Get()
  findAll() {
    return this.virtualAccountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.virtualAccountsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVirtualAccountDto: UpdateVirtualAccountDto) {
    return this.virtualAccountsService.update(+id, updateVirtualAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.virtualAccountsService.remove(+id);
  }
}
