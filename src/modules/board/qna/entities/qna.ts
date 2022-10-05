import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Board } from '../../entities/board';

/**
 * 1:1 문의에 대한 엔티티 정의
 */

@Entity()
export class Qna {
  // 문의 번호
  @PrimaryGeneratedColumn({
    name: 'qna_id',
  })
  qnaId: number;

  // 게시글 번호
  @OneToOne((type) => Board, (board) => board.qnaId, { eager: true })
  @JoinColumn({
    name: 'board_id',
  })
  boardId: Board;
}
