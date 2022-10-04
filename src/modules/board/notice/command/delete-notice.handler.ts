import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DeleteNoticeCommand } from './delete-notice.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from '../entities/notice';
import { Board } from '../../entities/board';
import { TestEvent } from '../event/test.event';
import { FileDeleteEvent } from '../event/file-delete-event';
import { BoardFile } from '../../file/entities/board_file';

/**
 * 공지사항 삭제 시, 커맨드를 처리하는 커맨드 핸들러
 */

@Injectable()
@CommandHandler(DeleteNoticeCommand)
export class DeleteNoticeHandler implements ICommandHandler<DeleteNoticeCommand> {
  constructor(
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,

    @InjectRepository(Board)
    private boardRepository: Repository<Board>,

    @InjectRepository(BoardFile)
    private fileRepository: Repository<BoardFile>,

    private eventBus: EventBus,
  ) {}

  async execute(command: DeleteNoticeCommand) {
    const { noticeId, res } = command;

    const notice = await this.noticeRepository.findOneBy({ noticeId: noticeId });

    if (!notice) {
      throw new NotFoundException('존재하지 않는 공지사항입니다.');
    }

    const board = await this.boardRepository.findOneBy({ boardId: notice.boardId.boardId });

    const files = await this.fileRepository.findBy({ boardId: board.boardId });

    // board_file db 삭제
    files.map((file) => {
      this.fileRepository.delete({ boardFileId: file.boardFileId });
    });

    // 파일 삭제 이벤트 처리
    this.eventBus.publish(new FileDeleteEvent(board.boardId, res));
    this.eventBus.publish(new TestEvent());

    // notice db 삭제
    try {
      await this.noticeRepository.delete(notice);
    } catch (err) {
      console.log(err);
    }

    // board db 삭제 (fk)
    try {
      await this.boardRepository.delete({ boardId: board.boardId });
    } catch (err) {
      console.log(err);
    }

    return '공지사항 삭제 성공';
  }
}
