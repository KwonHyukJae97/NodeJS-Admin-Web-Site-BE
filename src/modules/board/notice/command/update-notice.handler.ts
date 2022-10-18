import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateNoticeCommand } from './update-notice.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Notice } from '../entities/notice';
import { Repository } from 'typeorm';
import { Board } from '../../entities/board';
import { FilesUpdateEvent } from '../../../file/event/files-update-event';
import { BoardFileDb } from '../../board-file-db';
import { FileType } from '../../../file/entities/file-type.enum';

/**
 * 공지사항 정보 수정용 커맨드 핸들러
 */
@Injectable()
@CommandHandler(UpdateNoticeCommand)
export class UpdateNoticeHandler implements ICommandHandler<UpdateNoticeCommand> {
  constructor(
    @InjectRepository(Notice) private noticeRepository: Repository<Notice>,
    @InjectRepository(Board) private boardRepository: Repository<Board>,
    @Inject('noticeFile') private boardFileDb: BoardFileDb,
    private eventBus: EventBus,
  ) {}

  /**
   * 공지사항 정보 수정 메소드
   * @param command : 공지사항 정보 수정에 필요한 파라미터
   * @returns : DB처리 실패 시 에러 메시지 반환 / 수정 성공 시 공지사항 정보 반환
   */
  async execute(command: UpdateNoticeCommand) {
    const { title, content, isTop, noticeGrant, noticeId, role, accountId, files } = command;

    if (role !== '본사 관리자' && role !== '회원사 관리자') {
      throw new BadRequestException('본사 및 회원사 관리자만 접근 가능합니다.');
    }

    const notice = await this.noticeRepository.findOneBy({ noticeId: noticeId });

    if (!notice) {
      throw new NotFoundException('존재하지 않는 공지사항입니다.');
    }

    if (accountId !== notice.boardId.accountId) {
      throw new BadRequestException('작성자만 수정이 가능합니다.');
    }

    const board = await this.boardRepository.findOneBy({ boardId: notice.boardId.boardId });

    board.title = title;
    board.content = content;

    try {
      await this.boardRepository.save(board);
    } catch (err) {
      console.log(err);
    }

    notice.isTop = isTop;
    notice.noticeGrant = noticeGrant;
    notice.boardId = board;

    try {
      await this.noticeRepository.save(notice);
    } catch (err) {
      console.log(err);
    }

    // 파일 업데이트 이벤트 처리
    this.eventBus.publish(
      new FilesUpdateEvent(board.boardId, FileType.NOTICE, files, this.boardFileDb),
    );

    return notice;
  }
}
