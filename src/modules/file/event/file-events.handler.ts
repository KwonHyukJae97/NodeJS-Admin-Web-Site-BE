import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { FileCreateEvent } from './file-create-event';
import { FileUpdateEvent } from './file-update-event';
import { FileDeleteEvent } from './file-delete-event';
import { FileService } from '../file.service';
import { Inject } from '@nestjs/common';
import { BoardFileDb } from '../../board/board-file-db';

/**
 * 게시글의 파일 관련 필요 로직을 처리하는 이벤트 핸들러
 */

@EventsHandler(FileCreateEvent, FileUpdateEvent, FileDeleteEvent)
export class FileEventsHandler
  implements IEventHandler<FileCreateEvent | FileUpdateEvent | FileDeleteEvent>
{
  constructor(
    private fileService: FileService,

    @Inject('boardFile')
    private boardFileDb: BoardFileDb,
  ) {}

  // 하나의 이벤트 핸들러에 여러 이벤트를 받을 수 있기에, 하나의 이벤트 핸들러로 관리하도록 개선
  async handle(event: FileCreateEvent | FileUpdateEvent | FileDeleteEvent) {
    switch (event.name) {
      // 게시글 등록 시, 파일 업로드 이벤트
      case FileCreateEvent.name: {
        console.log('파일 업로드 이벤트 발생!');
        const { id, fileType, files, fileDbInterface } = event as FileCreateEvent;
        await this.fileService.uploadFiles(id, fileType, files, fileDbInterface);
        break;
      }
      // 게시글 수정 시, 파일 업로드 및 삭제 이벤트
      case FileUpdateEvent.name: {
        console.log('파일 업데이트 이벤트 발생!');
        const { id, fileType, files, fileDbInterface } = event as FileUpdateEvent;
        await this.fileService.updateFiles(id, fileType, files, fileDbInterface);
        break;
      }
      // 게시글 삭제 시, 파일 삭제 이벤트
      case FileDeleteEvent.name: {
        console.log('파일 삭제 이벤트 발생!');
        const { id, fileDbInterface } = event as FileDeleteEvent;
        await this.fileService.deleteFiles(id, fileDbInterface);
        break;
      }
      default:
        break;
    }
  }
}
