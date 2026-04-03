import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
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
	refresh(@Body() refreshTokenDto: RefreshTokenDto) {
		return this.authService.refresh(refreshTokenDto);
	}

	@Post('logout')
	logout(@Body() logoutDto: LogoutDto) {
		return this.authService.logout(logoutDto);
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	me(@CurrentUser() user: AuthenticatedUser) {
		return this.authService.getAuthContext(user.id);
	}
}

