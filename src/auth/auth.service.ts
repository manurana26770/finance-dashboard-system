import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, StatusValue, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

type AccessTokenPayload = {
	sub: number;
	email: string;
	role: Role;
	status: StatusValue;
	sessionVersion: number;
};

type RefreshTokenPayload = {
	sub: number;
	tokenType: 'refresh';
	jti: string;
};

const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);
const PASSWORD_HASH_ROUNDS = 10;

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
	) {}

	async login(loginDto: LoginDto) {
		const email = this.normalizeEmail(loginDto.email);
		const user = await this.prisma.user.findUnique({ where: { email } });

		if (!user) {
			throw new UnauthorizedException('Invalid email or password');
		}

		this.ensureAccountIsLoginReady(user);

		const passwordMatches = await bcrypt.compare(
			loginDto.password,
			user.passwordHash || '',
		);

		if (!passwordMatches) {
			await this.registerFailedLogin(user);
			throw new UnauthorizedException('Invalid email or password');
		}

		const session = await this.createSession(user);

		return {
			message: 'Login successful',
			accessToken: session.accessToken,
			refreshToken: session.refreshToken,
			user: await this.mapUserById(user.id),
		};
	}

	async refresh(refreshTokenDto: RefreshTokenDto) {
		const payload = this.verifyRefreshToken(refreshTokenDto.refreshToken);
		const user = await this.getActiveUserForSession(payload.sub);

		if (!user.refreshTokenHash) {
			throw new UnauthorizedException('Session has expired');
		}

		const tokenMatches = await bcrypt.compare(
			refreshTokenDto.refreshToken,
			user.refreshTokenHash,
		);

		if (!tokenMatches) {
			throw new UnauthorizedException('Session has expired');
		}

		const session = await this.createSession(user);

		return {
			accessToken: session.accessToken,
			refreshToken: session.refreshToken,
			user: await this.mapUserById(user.id),
		};
	}

	async logout(logoutDto: LogoutDto) {
		const payload = this.verifyRefreshToken(logoutDto.refreshToken);
		const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

		if (!user || !user.refreshTokenHash) {
			return { message: 'Logged out successfully' };
		}

		const tokenMatches = await bcrypt.compare(
			logoutDto.refreshToken,
			user.refreshTokenHash,
		);

		if (tokenMatches) {
			await this.prisma.user.update({
				where: { id: user.id },
				data: { refreshTokenHash: null },
			});
		}

		return { message: 'Logged out successfully' };
	}

	async getAuthContext(userId: number) {
		return this.mapUserById(userId);
	}

	private async createSession(user: User) {
		const refreshJti = randomUUID();
		const accessToken = this.jwtService.sign(
			{
				sub: user.id,
				email: user.email,
				role: user.role,
				status: user.status,
				sessionVersion: user.sessionVersion,
			} satisfies AccessTokenPayload,
			{
				secret: this.getAccessTokenSecret(),
				expiresIn: this.getAccessTokenTtlSeconds(),
			},
		);

		const refreshToken = this.jwtService.sign(
			{
				sub: user.id,
				tokenType: 'refresh',
				jti: refreshJti,
			} satisfies RefreshTokenPayload,
			{
				secret: this.getRefreshTokenSecret(),
				expiresIn: this.getRefreshTokenTtlSeconds(),
			},
		);

		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				lastLoginAt: new Date(),
				failedLoginAttempts: 0,
				lockedUntil: null,
				refreshTokenHash: await bcrypt.hash(refreshToken, PASSWORD_HASH_ROUNDS),
			},
		});

		return { accessToken, refreshToken };
	}

	private ensureAccountIsLoginReady(user: User) {
		if (user.status !== StatusValue.active || !user.isActive) {
			throw new UnauthorizedException('Invalid email or password');
		}

		if (!user.passwordHash) {
			throw new BadRequestException('Account is not ready for login yet');
		}

		if (user.lockedUntil && user.lockedUntil > new Date()) {
			throw new ForbiddenException('Account is temporarily locked');
		}
	}

	private async registerFailedLogin(user: User) {
		const failedLoginAttempts = user.failedLoginAttempts + 1;
		const lockThresholdReached = failedLoginAttempts >= LOGIN_MAX_ATTEMPTS;

		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				failedLoginAttempts,
				lockedUntil: lockThresholdReached
					? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000)
					: user.lockedUntil,
			},
		});
	}

	private verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
		try {
			const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
				secret: this.getRefreshTokenSecret(),
			});

			if (payload.tokenType !== 'refresh') {
				throw new UnauthorizedException('Session has expired');
			}

			return payload;
		} catch {
			throw new UnauthorizedException('Session has expired');
		}
	}

	private async getActiveUserForSession(userId: number) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });

		if (!user || user.status !== StatusValue.active || !user.isActive) {
			throw new UnauthorizedException('Session has expired');
		}

		return user;
	}

	private async mapUserById(userId: number) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return this.mapUser(user);
	}

	private mapUser(user: User) {
		return {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			roleId: user.roleId,
			status: user.status,
			phone: user.phone,
			avatarUrl: user.avatarUrl,
			timezone: user.timezone,
			lastLoginAt: user.lastLoginAt,
			sessionVersion: user.sessionVersion,
		};
	}

	private normalizeEmail(email: string) {
		return email.toLowerCase().trim();
	}

	private getAccessTokenSecret() {
		return process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-access-secret';
	}

	private getRefreshTokenSecret() {
		return process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret';
	}

	private getAccessTokenTtlSeconds() {
		return Number(process.env.ACCESS_TOKEN_TTL || 900);
	}

	private getRefreshTokenTtlSeconds() {
		return Number(process.env.REFRESH_TOKEN_TTL || 604800);
	}
}
