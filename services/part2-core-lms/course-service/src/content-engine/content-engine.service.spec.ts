import { Test, TestingModule } from '@nestjs/testing';
import { ContentEngineService } from './content-engine.service';

describe('ContentEngineService', () => {
  let service: ContentEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentEngineService],
    }).compile();

    service = module.get<ContentEngineService>(ContentEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
