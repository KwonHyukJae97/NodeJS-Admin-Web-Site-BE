import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConvertException } from 'src/common/utils/convert-exception';
// import { AccountFileDb } from '../account/account-file-db'
import { WordLevel } from '../wordLevel/entities/wordLevel';
import { CreateProjectHandler } from './command/create-project.handler';
import { DeleteProjectHandler } from './command/delete-project.handler';
import { UpdateProjectHandler } from './command/update-project.handler';
import { Project } from './entities/project';
import { ProjectController } from './project.controller';
import { GetProjectListQueryHandler } from './query/get-project-list.handler';

const CommandHandler = [CreateProjectHandler, UpdateProjectHandler, DeleteProjectHandler];

const QueryHandler = [GetProjectListQueryHandler];
@Module({
  imports: [TypeOrmModule.forFeature([WordLevel, Project]), CqrsModule],
  controllers: [ProjectController],

  providers: [
    ...CommandHandler,
    ...QueryHandler,
    ConvertException,
    // { provide: 'accountFile', useClass: AccountFileDb },
  ],
})
export class ProjectModule {}