import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslatorModule } from 'nestjs-translator';
import { DeleteNoticeHandler } from './delete-notice.handler';
import { Notice } from '../entities/notice.entity';
import { Board } from '../../entities/board.entity';
import { BoardFile } from 'src/modules/file/entities/board-file.entity';
import { BoardFileDb } from '../../board-file-db';
import { EventBus } from '@nestjs/cqrs';
import { ConvertException } from 'src/common/utils/convert-exception';
import { DeleteNoticeCommand } from './delete-notice.command';

const mockRepository = () => ({
  findOneBy: jest.fn(),
  softDelete: jest.fn(),
  delete: jest.fn(),
  findBy: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('DeleteNotice', () => {
  let deleteNoticeHandler: DeleteNoticeHandler;
  let noticeRepository: MockRepository<Notice>;
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
        DeleteNoticeHandler,
        ConvertException,
        BoardFileDb,
        {
          provide: getRepositoryToken(Notice),
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
          provide: 'noticeFile',
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

    deleteNoticeHandler = module.get(DeleteNoticeHandler);
    noticeRepository = module.get(getRepositoryToken(Notice));
    boardRepository = module.get(getRepositoryToken(Board));
    fileRepository = module.get(getRepositoryToken(BoardFile));
    eventBus = module.get(EventBus);
  });

  describe('???????????? ?????? ??????', () => {
    // Given
    const noticeId = 1;
    const role = '?????? ?????????';
    const findOneNoticeId = { noticeId: 1 };
    const softDeleteNoticeId = { noticeId: 1 };
    const findOneBoardId = { boardId: 1 };
    const softDeleteBoardId = { boardId: 1 };

    it('?????? ??????', async () => {
      noticeRepository.findOneBy.mockResolvedValue(findOneNoticeId);
      boardRepository.findOneBy.mockResolvedValue(findOneBoardId);
      fileRepository.findBy.mockResolvedValue(findOneBoardId);
      noticeRepository.delete.mockResolvedValue(softDeleteNoticeId);
      boardRepository.softDelete.mockResolvedValue(softDeleteBoardId);

      // When
      const result = await deleteNoticeHandler.execute(new DeleteNoticeCommand(noticeId));

      // Then
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(result).toEqual('????????? ?????? ???????????????.');
    });

    it('???????????? ?????? ??????', async () => {
      try {
        const noticeId = 999;
        const result = await deleteNoticeHandler.execute(new DeleteNoticeCommand(noticeId));
        expect(result).toBeUndefined();
      } catch (err) {
        expect(err.status).toBe(404);
        expect(err.response).toBe('???????????? ????????? ?????? ??? ????????????.');
      }
    });

    it('???????????? ?????? ?????? ??????', async () => {
      try {
        noticeRepository.findOneBy.mockResolvedValue(findOneNoticeId);
        boardRepository.findOneBy.mockResolvedValue(findOneBoardId);
        fileRepository.findBy.mockResolvedValue(findOneBoardId);
        noticeRepository.delete.mockRejectedValue(softDeleteNoticeId);
        boardRepository.softDelete.mockRejectedValue(softDeleteBoardId);
        const result = await deleteNoticeHandler.execute(new DeleteNoticeCommand(noticeId));
        expect(result).toBeUndefined();
      } catch (err) {
        expect(err.status).toBe(500);
      }
    });
  });
});
