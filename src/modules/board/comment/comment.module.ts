import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../entities/board';
import { Comment } from './entities/comment';
import { CommentController } from './comment.controller';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateCommentHandler } from './command/create-comment.handler';
import { GetCommentListHandler } from './query/get-comment-list.handler';
import { UpdateCommentHandler } from './command/update-comment.handler';
import { BoardFile } from '../../file/entities/board-file';
import { GetCommentDetailHandler } from './command/get-comment-detail.handler';
import { Qna } from '../qna/entities/qna';

const CommandHandlers = [CreateCommentHandler, UpdateCommentHandler, GetCommentDetailHandler];
const QueryHandlers = [GetCommentListHandler];

@Module({
  imports: [TypeOrmModule.forFeature([Board, Comment, BoardFile, Qna]), CqrsModule],
  controllers: [CommentController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class CommentModule {}
