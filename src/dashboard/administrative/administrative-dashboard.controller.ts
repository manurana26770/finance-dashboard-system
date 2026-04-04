import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthorizeRoles } from '../../common/decorators/access.decorator';
import { DashboardActivityQueryDto } from '../dto/dashboard-activity-query.dto';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { DashboardService } from '../dashboard.service';

@Controller('dashboard/administrative')
@AuthorizeRoles(
  Role.ADMINISTRATOR,
  Role.ORCHESTRATOR,
  Role.CONTROLLER_APPROVER,
)
export class AdministrativeDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(@Query() query: DashboardOverviewQueryDto) {
    return this.dashboardService.getAdministrativeOverview(query);
  }

  @Get('activity')
  getActivity(@Query() query: DashboardActivityQueryDto) {
    return this.dashboardService.getAdministrativeActivity(query);
  }
}
