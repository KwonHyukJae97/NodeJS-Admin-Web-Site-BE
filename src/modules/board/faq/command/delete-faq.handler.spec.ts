import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslatorModule } from 'nestjs-translator';
import { Board } from '../../entities/board.entity';
import { BoardFile } from 'src/modules/file/entities/board-file.entity';
import { BoardFileDb } from '../../board-file-db';
import { EventBus } from '@nestjs/cqrs';
import { ConvertException } from 'src/common/utils/convert-exception';
import { DeleteFaqHandler } from './delete-faq.handler';
import { Faq } from '../entities/faq.entity';
import { DeleteFaqCommand } from './delete-faq.command';

const mockRepository = () => ({
  findOneBy: jest.fn(),
  softDelete: jest.fn(),
  delete: jest.fn(),
  findBy: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('DeleteFaq', () => {
  let deleteFaqHandler: DeleteFaqHandler;
  let faqRepository: MockRepository<Faq>;
  let boardRepository: MockRepository<Board>;
  let fileRepository: MockRepository<BoardFile>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TranslatorModule.forRoot({
          global: true,
          defaultLang: 'ko',
          translationSource: '/src/common/i18n',
        }),
      ],
      providers: [
        DeleteFaqHandler,
        ConvertException,
        BoardFileDb,
        {
          provide: getRepositoryToken(Faq),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Board),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(BoardFile),
          useValue: mockRepository(),
        },
        {
          provide: 'faqFile',
          useClass: BoardFileDb,
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    deleteFaqHandler = module.get(DeleteFaqHandler);
    faqRepository = module.get(getRepositoryToken(Faq));
    boardRepository = module.get(getRepositoryToken(Board));
    fileRepository = module.get(getRepositoryToken(BoardFile));
    eventBus = module.get(EventBus);
  });

  describe('faq ?????? ??????', () => {
    // Given
    const faqId = 1;
    //   const role = '?????? ?????????';
    const findOneNoticeId = { noticeId: 1 };
    const softDeleteNoticeId = { noticeId: 1 };
    const findOneBoardId = { boardId: 1 };
    const softDeleteBoardId = { boardId: 1 };

    it('faq ?????? ??????', async () => {
      faqRepository.findOneBy.mockResolvedValue(findOneNoticeId);
      boardRepository.findOneBy.mockResolvedValue(findOneBoardId);
      fileRepository.findBy.mockResolvedValue(findOneBoardId);
      faqRepository.delete.mockResolvedValue(softDeleteNoticeId);
      boardRepository.softDelete.mockResolvedValue(softDeleteBoardId);

      // When
      const result = await deleteFaqHandler.execute(new DeleteFaqCommand(faqId));

      // Then
      expect(result).toEqual('????????? ?????? ???????????????.');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('faq ?????? ??????', async () => {
      try {
        const faqId = 999;
        const result = await deleteFaqHandler.execute(new DeleteFaqCommand(faqId));
        expect(result).toBeUndefined();
      } catch (err) {
        expect(err.status).toBe(404);
        expect(err.response).toBe('FAQ ????????? ?????? ??? ????????????.');
      }
    });

    it('faq ?????? ?????? ??????', async () => {
      try {
        faqRepository.findOneBy.mockResolvedValue(findOneNoticeId);
        boardRepository.findOneBy.mockResolvedValue(findOneBoardId);
        fileRepository.findBy.mockResolvedValue(findOneBoardId);
        faqRepository.delete.mockRejectedValue(softDeleteNoticeId);
        boardRepository.softDelete.mockRejectedValue(softDeleteBoardId);
        const result = await deleteFaqHandler.execute(new DeleteFaqCommand(faqId));
        expect(result).toBeUndefined();
      } catch (err) {
        expect(err.status).toBe(500);
      }
    });
  });
});
