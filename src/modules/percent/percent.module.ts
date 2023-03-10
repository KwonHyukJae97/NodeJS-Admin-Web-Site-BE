import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Study } from '../study/entities/study.entity';
import { Percent } from './entities/percent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Percent, Study]), CqrsModule],
})
export class PercentModule {}
