import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslatorModule } from 'nestjs-translator';
import { ConvertException } from 'src/common/utils/convert-exception';
import { BoardFile } from 'src/modules/file/entities/board-file.entity';
import { Repository } from 'typeorm';
import { BoardFileDb } from '../../board-file-db';
import { Board } from '../../entities/board.entity';
import { Notice } from '../entities/notice.entity';
import { CreateNoticeCommand } from './create-notice.command';
import { CreateNoticeHandler } from './create-notice.handler';
import { Account } from '../../../account/entities/account';

const mockRepository = () => ({
  save: jest.fn(),
  create: jest.fn(),
});
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('createNotice', () => {
  let createNoticeHandler: CreateNoticeHandler;
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
        CreateNoticeHandler,
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

    createNoticeHandler = module.get(CreateNoticeHandler);
    noticeRepository = module.get(getRepositoryToken(Notice));
    boardRepository = module.get(getRepositoryToken(Board));
    fileRepository = module.get(getRepositoryToken(BoardFile));
    eventBus = module.get(EventBus);
  });

  describe('???????????? ?????? ??????', () => {
    const content = '???????????? ??????';
    const isTop = true;
    const noticeGrant = 'noticeGrant';
    const role = '?????? ?????????';
    const files = [];
    const title = '?????????????????????.';
    const board = {
      accountId: 1,
      boardTypeCode: '0',
      title: title,
      content: content,
      viewCount: 0,
    };

    const notice = {
      noticeGrant: noticeGrant,
      isTop: isTop,
      boardId: 1,
      board: board,
    };

    it('???????????? ?????? ??????', async () => {
      noticeRepository.create.mockReturnValue(notice);
      noticeRepository.save.mockReturnValue(notice);
      boardRepository.create.mockReturnValue(board);
      boardRepository.save.mockReturnValue(board);

      const result = await createNoticeHandler.execute(
        new CreateNoticeCommand(title, content, isTop, noticeGrant, new Account(), files),
      );
      expect(result).toEqual(notice);
      expect(eventBus.publish).toHaveBeenCalledTimes(0);
    });

    it('????????? ?????? ?????? ?????? ?????? ??? ?????? ?????? ??????', async () => {
      try {
        boardRepository.save.mockRejectedValue(board);

        const result = await createNoticeHandler.execute(
          new CreateNoticeCommand(title, content, isTop, noticeGrant, new Account(), files),
        );
        expect(result).toBeUndefined();
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.response).toBe('????????? ?????????????????? ????????? ??????????????????.');
      }
    });

    it('???????????? ?????? ?????? ?????? ?????? ??? ?????? ?????? ??????', async () => {
      try {
        boardRepository.create.mockReturnValue(board);
        boardRepository.save.mockReturnValue(board);
        noticeRepository.save.mockRejectedValue(notice);

        const result = await createNoticeHandler.execute(
          new CreateNoticeCommand(title, content, isTop, noticeGrant, new Account(), files),
        );
        expect(result).toBeUndefined();
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.response).toBe('???????????? ?????????????????? ????????? ??????????????????.');
      }
    });
  });
});
