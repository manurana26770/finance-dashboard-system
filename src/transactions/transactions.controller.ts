import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
	Authenticated,
	AuthorizeRoles,
} from '../common/decorators/access.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { CreateRecordDto } from './dto/create-record.dto';
import { ListRecordsQueryDto } from './dto/list-records-query.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { TransactionsService } from './transactions.service';

@Controller('records')
@Authenticated()
export class TransactionsController {
	constructor(private readonly transactionsService: TransactionsService) {}

	@Post()
	@AuthorizeRoles(Role.ORCHESTRATOR, Role.CLERK_SUBMITTER)
	createRecord(
		@CurrentUser() user: AuthenticatedUser,
		@Body() createRecordDto: CreateRecordDto,
	) {
		return this.transactionsService.createRecord(user.id, createRecordDto);
	}

	@Get()
	listRecords(
		@CurrentUser() user: AuthenticatedUser,
		@Query() query: ListRecordsQueryDto,
	) {
		return this.transactionsService.listRecords(user.id, query);
	}

	@Get(':id')
	getRecordById(
		@CurrentUser() user: AuthenticatedUser,
		@Param('id', ParsePositiveIntPipe) id: number,
	) {
		return this.transactionsService.getRecordById(user, id);
	}

	@Patch(':id')
	@AuthorizeRoles(
		Role.ORCHESTRATOR,
		Role.CONTROLLER_APPROVER,
		Role.CLERK_SUBMITTER,
	)
	updateRecord(
		@CurrentUser() user: AuthenticatedUser,
		@Param('id', ParsePositiveIntPipe) id: number,
		@Body() updateRecordDto: UpdateRecordDto,
	) {
		return this.transactionsService.updateRecord(user, id, updateRecordDto);
	}

	@Delete(':id')
	@AuthorizeRoles(Role.ADMINISTRATOR, Role.ORCHESTRATOR)
	deleteRecord(
		@CurrentUser() user: AuthenticatedUser,
		@Param('id', ParsePositiveIntPipe) id: number,
	) {
		return this.transactionsService.softDeleteRecord(user, id);
	}
}
