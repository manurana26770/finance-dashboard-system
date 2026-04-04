import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Authenticated } from '../../common/decorators/access.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
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
  @ApiOperation({ summary: 'Get personal dashboard overview (totals, trends, categories)' })
  @ApiOkResponse({ description: 'Personal dashboard overview returned' })
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardOverviewQueryDto,
  ) {
    return this.dashboardService.getMyOverview(user, query);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get paginated personal recent activity list' })
  @ApiOkResponse({ description: 'Personal dashboard activity returned' })
  getActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardActivityQueryDto,
  ) {
    return this.dashboardService.getMyActivity(user, query);
  }
}
