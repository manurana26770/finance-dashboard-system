import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiBadRequestResponse,
	ApiCreatedResponse,
	ApiForbiddenResponse,
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
import { buildEndpointDescription } from '../common/swagger/swagger-docs';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	@ApiOperation({
		summary: 'Authenticate a user and create a new session',
		description: buildEndpointDescription({
			purpose:
				'Validates email and password, then issues a short-lived access token and a long-lived refresh token.',
			behavior: [
				'Rejects users that are pending, suspended, inactive, locked, or missing a password.',
				'Resets failed login counters on success and stores the hashed refresh token for later refresh/logout operations.',
				'Returns the authenticated user context together with both tokens.',
			],
			access: ['Public endpoint. No prior token is required.'],
			flow: [
				'Use after the invited user has completed `POST /users/accept-invite` or for any existing active account.',
				'Store the returned access token and send it as the bearer token for protected endpoints.',
				'Store the returned refresh token for `POST /auth/refresh` and `POST /auth/logout`.',
			],
		}),
	})
	@ApiCreatedResponse({ description: 'Session created and tokens issued successfully' })
	@ApiBadRequestResponse({ description: 'Account exists but is not ready for login, for example invite onboarding is incomplete' })
	@ApiUnauthorizedResponse({ description: 'Invalid credentials, inactive account, suspended account, or expired session state' })
	@ApiForbiddenResponse({ description: 'Account is temporarily locked because too many failed login attempts were made' })
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
	@ApiOperation({
		summary: 'Rotate session tokens using a refresh token',
		description: buildEndpointDescription({
			purpose:
				'Generates a new access token and a new refresh token for an existing authenticated session.',
			behavior: [
				'Validates the refresh token signature and compares it with the hashed token stored for the user.',
				'Rejects refresh attempts if the user is inactive, suspended, or the stored session is gone.',
				'Rotates the refresh token so the previous refresh token can no longer be used.',
			],
			access: ['Public endpoint. Uses the refresh token in the request body instead of a bearer token.'],
			flow: [
				'Call this only after obtaining a refresh token from `POST /auth/login`.',
				'Replace both locally stored tokens with the newly returned values.',
			],
		}),
	})
	@ApiCreatedResponse({ description: 'New session tokens issued successfully' })
	@ApiUnauthorizedResponse({ description: 'Refresh token is invalid, expired, revoked, or no longer matches the active session' })
	refresh(@Body() refreshTokenDto: RefreshTokenDto) {
		return this.authService.refresh(refreshTokenDto);
	}

	@Post('logout')
	@ApiOperation({
		summary: 'Invalidate a refresh token and end the active session',
		description: buildEndpointDescription({
			purpose:
				'Ends a session by clearing the refresh token stored for the user account.',
			behavior: [
				'If the provided refresh token matches the active stored token, it is invalidated.',
				'If the token is already expired or no longer present, the endpoint still returns a successful logout response.',
				'This endpoint does not require an access token because it relies on the refresh token payload.',
			],
			access: ['Public endpoint. Uses the refresh token in the request body.'],
			flow: [
				'Call after `POST /auth/login` if the client wants to terminate the session deliberately.',
				'After logout, the client should discard both local access and refresh tokens.',
			],
		}),
	})
	@ApiCreatedResponse({ description: 'Logout processed successfully' })
	@ApiUnauthorizedResponse({ description: 'Refresh token format is invalid or cannot be verified' })
	logout(@Body() logoutDto: LogoutDto) {
		return this.authService.logout(logoutDto);
	}

	@Get('me')
	@Authenticated()
	@ApiBearerAuth('access-token')
	@ApiOperation({
		summary: 'Get the current authenticated user context',
		description: buildEndpointDescription({
			purpose:
				'Returns the identity and role information attached to the current access token after database validation.',
			behavior: [
				'Confirms the JWT belongs to an active user with a valid session version.',
				'Returns the current role, status, and profile basics needed by clients to shape the UI and permissions.',
			],
			access: ['Requires any valid authenticated user bearer token.'],
			flow: [
				'Call immediately after `POST /auth/login` to hydrate client-side auth state.',
				'Use before role-sensitive operations if the client needs to confirm the current role or session context.',
			],
		}),
	})
	@ApiOkResponse({ description: 'Authenticated user context returned successfully' })
	@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
	me(@CurrentUser() user: AuthenticatedUser) {
		return this.authService.getAuthContext(user.id);
	}
}
