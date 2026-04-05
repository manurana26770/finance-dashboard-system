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
	ApiBearerAuth,
	ApiBadRequestResponse,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
	Authenticated,
	AuthorizeRoles,
} from '../common/decorators/access.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { buildEndpointDescription } from '../common/swagger/swagger-docs';
import { CreateRecordDto } from './dto/create-record.dto';
import { ListRecordsQueryDto } from './dto/list-records-query.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { TransactionsService } from './transactions.service';

@Controller('records')
@Authenticated()
@ApiTags('Records')
@ApiBearerAuth('access-token')
export class TransactionsController {
	constructor(private readonly transactionsService: TransactionsService) {}

	@Post()
	@AuthorizeRoles(Role.ORCHESTRATOR, Role.CLERK_SUBMITTER)
	@ApiOperation({
		summary: 'Create a new financial record',
		description: buildEndpointDescription({
			purpose:
				'Creates a new income or expense record owned by the authenticated user.',
			behavior: [
				'Always creates the record in `PENDING` status.',
				'Trims text fields and stores the authenticated user as `createdBy`.',
				'Triggers dashboard cache invalidation for the record owner and administrative dashboard scope.',
			],
			access: ['Requires `ORCHESTRATOR` or `CLERK_SUBMITTER` role.'],
			flow: [
				'Authenticate with `POST /auth/login` first.',
				'Create records before using review, approval, or dashboard endpoints that depend on record data.',
			],
		}),
	})
	@ApiCreatedResponse({ description: 'Record created successfully' })
	@ApiBadRequestResponse({ description: 'Payload is invalid, for example amount/date/type/category fails validation' })
	@ApiForbiddenResponse({ description: 'Authenticated role is not allowed to create records' })
	@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
	createRecord(
		@CurrentUser() user: AuthenticatedUser,
		@Body() createRecordDto: CreateRecordDto,
	) {
		return this.transactionsService.createRecord(user.id, createRecordDto);
	}

	@Get()
	@ApiOperation({
		summary: 'List records visible to the authenticated user',
		description: buildEndpointDescription({
			purpose:
				'Returns paginated financial records for the current user, with optional filters for type, status, category, and date range.',
			behavior: [
				'Normal users only see their own records because the service filters by `createdBy = currentUser.id`.',
				'Deleted records are excluded by default unless the `status=deleted` filter is explicitly requested.',
				'Results are ordered by record date descending, then id descending.',
			],
			access: ['Requires any valid authenticated user bearer token.'],
			flow: [
				'Authenticate first with `POST /auth/login`.',
				'Use before `GET /records/:id`, `PATCH /records/:id`, or dashboard pages that drill into raw records.',
			],
		}),
	})
	@ApiOkResponse({ description: 'Record list returned successfully' })
	@ApiBadRequestResponse({ description: 'One or more query parameters are invalid' })
	@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
	listRecords(
		@CurrentUser() user: AuthenticatedUser,
		@Query() query: ListRecordsQueryDto,
	) {
		return this.transactionsService.listRecords(user.id, query);
	}

	@Get(':id')
	@ApiOperation({
		summary: 'Get a single financial record by id',
		description: buildEndpointDescription({
			purpose:
				'Returns the full record detail including audit information for creation, approval, and deletion metadata.',
			behavior: [
				'Administrators, orchestrators, and controller approvers can access broader record scope.',
				'Other users can only access records they created themselves.',
				'Returns creator, approver, and deleter audit fragments when present.',
			],
			access: [
				'Requires any valid authenticated user bearer token.',
				'Expanded cross-user access is only available to `ADMINISTRATOR`, `ORCHESTRATOR`, and `CONTROLLER_APPROVER`.',
			],
			flow: [
				'Usually called from a record listing or dashboard activity row when the client needs record-level detail.',
			],
		}),
	})
	@ApiParam({ name: 'id', type: Number, description: 'Record id' })
	@ApiOkResponse({ description: 'Record details returned successfully' })
	@ApiNotFoundResponse({ description: 'No record exists with the supplied id' })
	@ApiForbiddenResponse({ description: 'Authenticated user is not allowed to access this record' })
	@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
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
	@ApiOperation({
		summary: 'Update a financial record with role-based restrictions',
		description: buildEndpointDescription({
			purpose:
				'Applies edits or approval decisions to an existing record while enforcing role-specific business rules.',
			behavior: [
				'`ORCHESTRATOR` can update all business fields and status.',
				'`CONTROLLER_APPROVER` can only set status to `approved` or `rejected`.',
				'`CLERK_SUBMITTER` can only edit their own records while the record is still `PENDING` and cannot change status.',
				'Successful updates invalidate affected dashboard caches so aggregate views stay current.',
			],
			access: [
				'Requires `ORCHESTRATOR`, `CONTROLLER_APPROVER`, or `CLERK_SUBMITTER` role.',
			],
			flow: [
				'Usually preceded by `GET /records` or `GET /records/:id` so the client has the current state.',
				'Approval workflows generally go: clerk/orchestrator creates record, controller approves or rejects with this endpoint, dashboards then reflect the latest state.',
			],
		}),
	})
	@ApiParam({ name: 'id', type: Number, description: 'Record id' })
	@ApiOkResponse({ description: 'Record updated successfully' })
	@ApiBadRequestResponse({ description: 'Payload is empty or contains invalid field values' })
	@ApiNotFoundResponse({ description: 'No record exists with the supplied id' })
	@ApiForbiddenResponse({ description: 'Authenticated role or ownership rules do not allow this update' })
	@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
	updateRecord(
		@CurrentUser() user: AuthenticatedUser,
		@Param('id', ParsePositiveIntPipe) id: number,
		@Body() updateRecordDto: UpdateRecordDto,
	) {
		return this.transactionsService.updateRecord(user, id, updateRecordDto);
	}

	@Delete(':id')
	@AuthorizeRoles(Role.ADMINISTRATOR, Role.ORCHESTRATOR)
	@ApiOperation({
		summary: 'Soft-delete a financial record',
		description: buildEndpointDescription({
			purpose:
				'Marks an existing record as deleted without physically removing it from the database.',
			behavior: [
				'Sets the record status to `DELETED` and stores deletion audit metadata.',
				'Deleted records are excluded from default record listings and from dashboard activity/aggregates unless explicitly requested.',
				'Successful deletion invalidates affected dashboard caches.',
			],
			access: ['Requires `ADMINISTRATOR` or `ORCHESTRATOR` role.'],
			flow: [
				'Usually preceded by `GET /records/:id` or a listing selection so the operator confirms the target record.',
			],
		}),
	})
	@ApiParam({ name: 'id', type: Number, description: 'Record id' })
	@ApiOkResponse({ description: 'Record soft-deleted successfully' })
	@ApiNotFoundResponse({ description: 'No record exists with the supplied id' })
	@ApiForbiddenResponse({ description: 'Authenticated role is not allowed to delete this record' })
	@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
	deleteRecord(
		@CurrentUser() user: AuthenticatedUser,
		@Param('id', ParsePositiveIntPipe) id: number,
	) {
		return this.transactionsService.softDeleteRecord(user, id);
	}
}
