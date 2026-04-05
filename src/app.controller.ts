import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { buildEndpointDescription } from './common/swagger/swagger-docs';

@Controller()
@ApiTags('Health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Basic service health check',
    description: buildEndpointDescription({
      purpose:
        'Confirms that the HTTP service is reachable and responding.',
      behavior: [
        'Returns a lightweight string response from the application service.',
        'Does not perform deep dependency health checks for database, cache, or SMTP.',
      ],
      access: ['Public endpoint. No token is required.'],
      flow: [
        'Use for simple uptime or connectivity verification before hitting business endpoints.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Service is reachable' })
  getHello(): string {
    return this.appService.getHello();
  }
}
