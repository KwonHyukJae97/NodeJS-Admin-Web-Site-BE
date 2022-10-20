import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DeleteQnaCommand } from './delete-qna.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Qna } from '../entities/qna';
import { Board } from '../../entities/board';
import { BoardFile } from '../../../file/entities/board-file';
import { Comment } from '../../comment/entities/comment';
import { FilesDeleteEvent } from '../../../file/event/files-delete-event';
import { BoardFileDb } from '../../board-file-db';
import { ConvertException } from '../../../../common/utils/convert-exception';

/**
 * 1:1 문의 삭제용 커맨드 핸들러
 */
@Injectable()
@CommandHandler(DeleteQnaCommand)
export class DeleteQnaHandler implements ICommandHandler<DeleteQnaCommand> {
  constructor(
    @InjectRepository(Qna) private qnaRepository: Repository<Qna>,
    @InjectRepository(Board) private boardRepository: Repository<Board>,
    @InjectRepository(BoardFile) private fileRepository: Repository<BoardFile>,
    @InjectRepository(Comment) private commentRepository: Repository<Comment>,
    @Inject('qnaFile') private boardFileDb: BoardFileDb,
    @Inject(ConvertException) private convertException: ConvertException,
    private eventBus: EventBus,
  ) {}

  /**
   * 1:1 문의 삭제 메소드
   * @param command : 1:1 문의 삭제에 필요한 파라미터
   * @returns : DB처리 실패 시 에러 메시지 반환 / 삭제 성공 시 완료 메시지 반환
   */
  async execute(command: DeleteQnaCommand) {
    const { qnaId, accountId } = command;

    const qna = await this.qnaRepository.findOneBy({ qnaId: qnaId });

    if (!qna) {
      return this.convertException.notFoundError('QnA', 404);
    }

    // TODO : 유저 정보 데코레이터 적용시 확인 후, 삭제 예정
    if (accountId != qna.boardId.accountId) {
      throw new BadRequestException('작성자만 삭제가 가능합니다.');
    }

    const board = await this.boardRepository.findOneBy({ boardId: qna.boardId.boardId });

    if (!board) {
      return this.convertException.notFoundError('게시글', 404);
    }

    // 파일 삭제 이벤트 처리
    this.eventBus.publish(new FilesDeleteEvent(board.boardId, this.boardFileDb));

    const comments = await this.commentRepository.findBy({ qnaId: qnaId });

    comments.map((comment) => {
      try {
        this.commentRepository.softDelete({ commentId: comment.commentId });
      } catch (err) {
        return this.convertException.CommonError(500);
      }
    });

    try {
      await this.qnaRepository.delete(qna);
    } catch (err) {
      return this.convertException.CommonError(500);
    }

    try {
      await this.boardRepository.softDelete({ boardId: board.boardId });
    } catch (err) {
      return this.convertException.CommonError(500);
    }

    return '삭제가 완료 되었습니다.';
  }
}
