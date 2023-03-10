import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyType } from './entities/studyType.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudyType]), CqrsModule],
})
export class StudyTypeModule {}
