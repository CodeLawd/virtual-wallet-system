import { Test, TestingModule } from '@nestjs/testing';
import { VirtualAccountsService } from './virtual-accounts.service';

describe('VirtualAccountsService', () => {
  let service: VirtualAccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VirtualAccountsService],
    }).compile();

    service = module.get<VirtualAccountsService>(VirtualAccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
