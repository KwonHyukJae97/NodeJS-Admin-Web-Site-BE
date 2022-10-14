import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateFaqCommand } from './create-faq.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Faq } from '../entities/faq';
import { Repository } from 'typeorm';
import { Board } from '../../entities/board';
import { FaqCategory } from '../entities/faq_category';
import { FileCreateEvent } from '../../../file/event/file-create-event';
import { BoardFileDb } from '../../board-file-db';

/**
 * FAQ 등록 시, 커맨드를 처리하는 커맨드 핸들러
 */

@Injectable()
@CommandHandler(CreateFaqCommand)
export class CreateFaqHandler implements ICommandHandler<CreateFaqCommand> {
  constructor(
    @InjectRepository(Faq)
    private faqRepository: Repository<Faq>,

    @InjectRepository(Board)
    private boardRepository: Repository<Board>,

    @InjectRepository(FaqCategory)
    private categoryRepository: Repository<FaqCategory>,

    @Inject('faqFile')
    private boardFileDb: BoardFileDb,

    private eventBus: EventBus,
  ) {}

  async execute(command: CreateFaqCommand) {
    const { title, content, categoryName, fileType, role, files } = command;

    if (role !== '본사 관리자') {
      throw new BadRequestException('본사 관리자만 접근 가능합니다.');
    }

    const board = this.boardRepository.create({
      // 임시 accountId 부여
      accountId: 1,
      fileTypeCode: '1',
      title,
      content,
      viewCount: 0,
    });

    try {
      await this.boardRepository.save(board);
    } catch (err) {
      console.log(err);
    }

    const category = await this.categoryRepository.findOneBy({ categoryName: categoryName });

    if (!category) {
      throw new NotFoundException('존재하지 않는 카테고리입니다.');
    }

    const faq = this.faqRepository.create({
      boardId: board,
      categoryId: category.categoryId,
    });

    try {
      await this.faqRepository.save(faq);
    } catch (err) {
      console.log(err);
    }

    // 파일 업로드 이벤트 처리
    this.eventBus.publish(new FileCreateEvent(board.boardId, fileType, files, this.boardFileDb));

    return 'FAQ 등록 성공';
  }
}
