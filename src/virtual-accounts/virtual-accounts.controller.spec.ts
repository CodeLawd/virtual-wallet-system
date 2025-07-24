import { Test, TestingModule } from '@nestjs/testing';
import { VirtualAccountsController } from './virtual-accounts.controller';
import { VirtualAccountsService } from './virtual-accounts.service';

describe('VirtualAccountsController', () => {
  let controller: VirtualAccountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualAccountsController],
      providers: [VirtualAccountsService],
    }).compile();

    controller = module.get<VirtualAccountsController>(VirtualAccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
