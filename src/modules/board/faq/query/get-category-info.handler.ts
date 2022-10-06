import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCategoryInfoQuery } from './get-category-info.query';
import { InjectRepository } from '@nestjs/typeorm';
import { FaqCategory } from '../entities/faq_category';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Faq } from '../entities/faq';

/**
 * FAQ 카테고리 리스트 조회 시, 쿼리를 구현하는 쿼리 핸들러
 */

@QueryHandler(GetCategoryInfoQuery)
export class GetCategoryInfoHandler implements IQueryHandler<GetCategoryInfoQuery> {
  constructor(
    @InjectRepository(FaqCategory)
    private categoryRepository: Repository<FaqCategory>,
  ) {}

  async execute(query: GetCategoryInfoQuery) {
    const { role } = query;

    // role = 본사 관리자일 경우 전체 데이터 조회
    if (role === '본사 관리자') {
      const category = await this.categoryRepository.find();

      if (!category) {
        throw new NotFoundException('존재하는 카테고리가 없습니다.');
      }
      // category 리스트 반환
      return category;

      // role = 일반 사용자 && 회원사 관리자일 경우 isUse: true 인 데이터만 조회
    } else {
      const category = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.isUse = :isUse', { isUse: true })
        .getMany();

      if (!category) {
        throw new NotFoundException('존재하는 카테고리가 없습니다.');
      }

      return category;
    }
  }
}
