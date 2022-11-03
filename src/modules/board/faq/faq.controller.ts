import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateFaqCommand } from './command/create-faq.command';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { UpdateFaqCommand } from './command/update-faq.command';
import { DeleteFaqCommand } from './command/delete-faq.command';
import { FilesInterceptor } from '@nestjs/platform-express/multer/interceptors/files.interceptor';
import { GetFaqDetailCommand } from './command/get-faq-detail.command';
import { GetFaqInfoDto } from './dto/get-faq-info.dto';
import { GetCategoryListQuery } from './query/get-category-list.query';
import { DeleteFaqInfoDto } from './dto/delete-faq-info.dto';
import { GetFaqListQuery } from './query/get-faq-list.query';
import { Account } from '../../account/entities/account';
import { GetUser } from '../../account/decorator/account.decorator';
import { JwtAuthGuard } from '../../../guard/jwt/jwt-auth.guard';

/**
 * FAQ API controller
 */
@Controller('faq')
export class FaqController {
  constructor(private commandBus: CommandBus, private queryBus: QueryBus) {}

  /**
   * FAQ 등록
   * @returns : FAQ 등록 커맨드 전송
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  createFaq(
    @Body() createFaqDto: CreateFaqDto,
    @UploadedFiles() files: Express.MulterS3.File[],
    @GetUser() account: Account,
  ) {
    const { title, content, categoryName, role } = createFaqDto;
    const command = new CreateFaqCommand(title, content, categoryName, role, account, files);
    return this.commandBus.execute(command);
  }

  /**
   * FAQ 전체 & 카테고리별 검색 결과 리스트 조회
   * @query : category_name
   * @query : keyword
   * @returns : FAQ 리스트 조회 쿼리 전송
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getFaqSearch(
    @Query('categoryName') categoryName: string,
    @Query('keyword') keyword: string,
    @Query('role') role: string,
  ) {
    const getFaqListSearchQuery = new GetFaqListQuery(categoryName, keyword, role);
    return this.queryBus.execute(getFaqListSearchQuery);
  }

  /**
   * FAQ 카테고리 리스트 조회
   * @returns : FAQ 카테고리 리스트 조회 쿼리 전송
   */
  @Get('category')
  @UseGuards(JwtAuthGuard)
  async getAllCategory(@Query('role') role: string) {
    const getCategoryListQuery = new GetCategoryListQuery(role);
    return this.queryBus.execute(getCategoryListQuery);
  }

  /**
   * FAQ 상세 정보 조회
   * @param : faq_id
   * @returns : FAQ 상세 정보 조회 커맨드 전송
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getFaqDetail(@Param('id') faqId: number, @Body() getFaqInfoDto: GetFaqInfoDto) {
    const { role } = getFaqInfoDto;
    const command = new GetFaqDetailCommand(faqId, role);
    return this.commandBus.execute(command);
  }

  /**
   * FAQ 상세 정보 수정
   * @param : faq_id
   * @returns : FAQ 상세 정보 수정 커맨드 전송
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  async updateFaq(
    @Param('id') faqId: number,
    @Body() updateFaqDto: UpdateFaqDto,
    @UploadedFiles() files: Express.MulterS3.File[],
    @GetUser() account: Account,
  ) {
    const { title, content, categoryName, role } = updateFaqDto;
    const command = new UpdateFaqCommand(title, content, categoryName, role, account, faqId, files);
    return this.commandBus.execute(command);
  }

  /**
   * FAQ 정보 삭제
   * @param : faq_id
   * @returns : FAQ 정보 삭제 커맨드 전송
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteFaq(
    @Param('id') faqId: number,
    @Body() deleteFaqInfoDto: DeleteFaqInfoDto,
    @GetUser() account: Account,
  ) {
    const { role } = deleteFaqInfoDto;
    const command = new DeleteFaqCommand(faqId, role, account);
    return this.commandBus.execute(command);
  }
}