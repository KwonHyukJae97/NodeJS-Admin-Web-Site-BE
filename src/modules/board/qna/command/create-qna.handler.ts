import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateQnaCommand } from './create-qna.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Qna } from '../entities/qna';
import { Repository } from 'typeorm';
import { Board } from '../../entities/board';
import { FileCreateEvent } from '../../../file/event/file-create-event';
import { BoardFileDb } from '../../board-file-db';

/**
 * 1:1 문의 등록 시, 커맨드를 처리하는 커맨드 핸들러
 */

@Injectable()
@CommandHandler(CreateQnaCommand)
export class CreateQnaHandler implements ICommandHandler<CreateQnaCommand> {
  constructor(
    @InjectRepository(Qna)
    private qnaRepository: Repository<Qna>,

    @InjectRepository(Board)
    private boardRepository: Repository<Board>,

    @Inject('qnaFile')
    private boardFileDb: BoardFileDb,

    private eventBus: EventBus,
  ) {}

  async execute(command: CreateQnaCommand) {
    const { title, content, fileType, files } = command;

    const board = this.boardRepository.create({
      // 임시 accountId 부여
      accountId: 3,
      fileTypeCode: '2',
      title,
      content,
      viewCount: 0,
    });

    try {
      await this.boardRepository.save(board);
    } catch (err) {
      console.log(err);
    }

    const qna = this.qnaRepository.create({
      boardId: board,
    });

    try {
      await this.qnaRepository.save(qna);
    } catch (err) {
      console.log(err);
    }

    // 파일 업로드 이벤트 처리
    this.eventBus.publish(new FileCreateEvent(board.boardId, fileType, files, this.boardFileDb));

    return '1:1 문의 등록 성공';
  }
}
