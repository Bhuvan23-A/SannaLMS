import { Test, TestingModule } from '@nestjs/testing';
import { ContentEngineController } from './content-engine.controller';

describe('ContentEngineController', () => {
  let controller: ContentEngineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentEngineController],
    }).compile();

    controller = module.get<ContentEngineController>(ContentEngineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
