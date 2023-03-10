import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConvertException } from 'src/common/utils/convert-exception';
import { Page } from 'src/common/utils/page';
import { WordLevel } from 'src/modules/wordLevel/entities/wordLevel.entity';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { GetProjectListQuery } from './get-project-list.query';

/**
 * 프로젝트 정보 조회용 쿼리 핸들러
 */
@QueryHandler(GetProjectListQuery)
export class GetProjectListQueryHandler implements IQueryHandler<GetProjectListQuery> {
  constructor(
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @InjectRepository(WordLevel) private wordLevelRepository: Repository<WordLevel>,
    @Inject(ConvertException) private convertException: ConvertException,
  ) {}

  async execute(query: GetProjectListQuery) {
    const { param } = query;

    //단어레벨아이디, 단어레벨명 조회
    const wordLevel = this.wordLevelRepository
      .createQueryBuilder('wordLevel')
      .subQuery()
      .select([
        `wordLevel.wordLevelId AS wordLevelId,
      wordLevel.wordLevelName AS wordLevelName`,
      ])
      .from(WordLevel, 'wordLevel')
      .groupBy('wordLevel.wordLevelId')
      .getQuery();

    //단어레벨번호, 단어레벨명, 프로젝트번호, 프로젝트명, 서비스 여부 조회
    const project = await this.projectRepository
      .createQueryBuilder('project')
      .select([
        `project.projectId AS projectId,
        project.projectName AS projectName,
        project.isService AS isService,
        project.regBy AS regBy,
        project.regDate AS regDate
        `,
      ])
      .leftJoinAndSelect(wordLevel, 'wordLevel', 'wordLevel.wordLevelId = project.wordLevelId')
      .orderBy('project.projectId', 'DESC');

    //단어레벨명 OR 프로젝트명으로 검색 가능
    if (param.searchWord) {
      project.where(
        'project.projectName like :projectName OR wordLevel.wordLevelName like :wordLevelName',
        {
          wordLevelName: `%${param.searchWord}%`,
          projectName: `%${param.searchWord}%`,
        },
      );
    }
    let tempQuery = project;

    // 전체 조회 값이 false일 경우, 페이징 처리
    if (!param.totalData) {
      tempQuery = tempQuery.limit(param.getLimit()).offset(param.getOffset());
    }
    // 최종 데이터 반환
    const list = await tempQuery.getRawMany();
    // 최종 데이터의 총 개수 반환
    const total = await tempQuery.getCount();

    // 전체 조회 값 여부에 따른 pageNo/pageSize 반환값 설정
    const pageNo = param.totalData ? 1 : param.pageNo;
    const pageSize = param.totalData ? total : param.pageSize;

    if (total === 0) {
      return this.convertException.notFoundError('프로젝트 ', 404);
    }

    return new Page(pageNo, pageSize, total, list);
  }
}
