import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Authenticated } from '../../common/decorators/access.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { buildEndpointDescription } from '../../common/swagger/swagger-docs';
import { DashboardActivityQueryDto } from '../dto/dashboard-activity-query.dto';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { DashboardService } from '../dashboard.service';

@Controller('dashboard/me')
@Authenticated()
@ApiTags('Dashboard - Personal')
@ApiBearerAuth('access-token')
export class PersonalDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get the personal dashboard overview for the current user',
    description: buildEndpointDescription({
      purpose:
        'Returns high-level personal analytics including totals, category breakdown, trends, and a recent activity preview.',
      behavior: [
        'Totals, category totals, and trends are calculated from approved records only.',
        'Recent activity includes non-deleted records within the requested period.',
        'Responses are cached per user and per period to reduce repeat aggregation load.',
      ],
      access: ['Requires any valid authenticated user bearer token.'],
      flow: [
        'Authenticate with `POST /auth/login` first.',
        'Use after records have been created or reviewed through the records endpoints.',
        'If a record is created, updated, approved, rejected, or deleted, cache invalidation is triggered automatically.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Personal dashboard overview returned successfully' })
  @ApiBadRequestResponse({ description: 'Month and date range parameters are combined incorrectly or contain invalid values' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardOverviewQueryDto,
  ) {
    return this.dashboardService.getMyOverview(user, query);
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Get paginated personal dashboard activity',
    description: buildEndpointDescription({
      purpose:
        'Returns the detailed activity feed used by the personal dashboard for the authenticated user.',
      behavior: [
        'Filters by month or by explicit start/end dates.',
        'Returns paginated, date-descending records excluding deleted records.',
        'Responses are cached per user, date range, page, and limit.',
      ],
      access: ['Requires any valid authenticated user bearer token.'],
      flow: [
        'Use after login when the dashboard needs more than the lightweight recent activity preview from `/dashboard/me/overview`.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Personal dashboard activity returned successfully' })
  @ApiBadRequestResponse({ description: 'Month and date range parameters are combined incorrectly or contain invalid values' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  getActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardActivityQueryDto,
  ) {
    return this.dashboardService.getMyActivity(user, query);
  }
}
