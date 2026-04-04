import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
	ApiTooManyRequestsResponse,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Authenticated } from '../common/decorators/access.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	@ApiOperation({ summary: 'Authenticate user and issue access/refresh tokens' })
	@ApiOkResponse({ description: 'Login successful' })
	@ApiUnauthorizedResponse({ description: 'Invalid credentials or account locked' })
	@ApiTooManyRequestsResponse({ description: 'Too many login attempts' })
	@UseGuards(ThrottlerGuard)
	@Throttle({
		default: {
			limit: 5,
			ttl: 60_000,
		},
	})
	login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	@Post('refresh')
	@ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
	@ApiOkResponse({ description: 'Token refresh successful' })
	@ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
	refresh(@Body() refreshTokenDto: RefreshTokenDto) {
		return this.authService.refresh(refreshTokenDto);
	}

	@Post('logout')
	@ApiOperation({ summary: 'Invalidate a refresh token and end session' })
	@ApiOkResponse({ description: 'Logout successful' })
	@ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
	logout(@Body() logoutDto: LogoutDto) {
		return this.authService.logout(logoutDto);
	}

	@Get('me')
	@Authenticated()
	@ApiBearerAuth('access-token')
	@ApiOperation({ summary: 'Get authenticated user context' })
	@ApiOkResponse({ description: 'User context returned' })
	@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
	me(@CurrentUser() user: AuthenticatedUser) {
		return this.authService.getAuthContext(user.id);
	}
}

