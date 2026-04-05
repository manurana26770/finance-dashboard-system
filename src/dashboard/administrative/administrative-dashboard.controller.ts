import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthorizeRoles } from '../../common/decorators/access.decorator';
import { buildEndpointDescription } from '../../common/swagger/swagger-docs';
import { DashboardActivityQueryDto } from '../dto/dashboard-activity-query.dto';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { DashboardService } from '../dashboard.service';

@Controller('dashboard/administrative')
@AuthorizeRoles(
  Role.ADMINISTRATOR,
  Role.ORCHESTRATOR,
  Role.CONTROLLER_APPROVER,
)
@ApiTags('Dashboard - Administrative')
@ApiBearerAuth('access-token')
export class AdministrativeDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get cross-user operational dashboard overview',
    description: buildEndpointDescription({
      purpose:
        'Returns organization-wide operational analytics for privileged roles, including totals, categories, trends, and recent activity.',
      behavior: [
        'Aggregates all records visible to administrative dashboard roles rather than filtering by current user ownership.',
        'Uses approved records for totals and trends, and non-deleted records for the recent activity preview.',
        'Responses are cached by scope and date range to reduce database aggregation load.',
      ],
      access: [
        'Requires `ADMINISTRATOR`, `ORCHESTRATOR`, or `CONTROLLER_APPROVER` role.',
      ],
      flow: [
        'Authenticate first with `POST /auth/login`.',
        'Use after record creation and review flows are active so leadership or operations users can monitor the broader ledger.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Administrative dashboard overview returned successfully' })
  @ApiBadRequestResponse({ description: 'Month and date range parameters are combined incorrectly or contain invalid values' })
  @ApiForbiddenResponse({ description: 'Authenticated user does not have an administrative dashboard role' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  getOverview(@Query() query: DashboardOverviewQueryDto) {
    return this.dashboardService.getAdministrativeOverview(query);
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Get paginated cross-user dashboard activity',
    description: buildEndpointDescription({
      purpose:
        'Returns the detailed, paginated administrative activity feed used for operational monitoring.',
      behavior: [
        'Shows non-deleted records across the broader administrative scope.',
        'Includes creator identity fragments so reviewers can understand who submitted each record.',
        'Responses are cached by administrative scope, date range, page, and page size.',
      ],
      access: [
        'Requires `ADMINISTRATOR`, `ORCHESTRATOR`, or `CONTROLLER_APPROVER` role.',
      ],
      flow: [
        'Use after login when a privileged user needs more detail than the activity preview provided by `/dashboard/administrative/overview`.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Administrative dashboard activity returned successfully' })
  @ApiBadRequestResponse({ description: 'Month and date range parameters are combined incorrectly or contain invalid values' })
  @ApiForbiddenResponse({ description: 'Authenticated user does not have an administrative dashboard role' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  getActivity(@Query() query: DashboardActivityQueryDto) {
    return this.dashboardService.getAdministrativeActivity(query);
  }
}
