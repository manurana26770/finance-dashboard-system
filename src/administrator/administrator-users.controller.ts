import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { AdministratorUsersService } from './administrator-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('administrator/users')
export class AdministratorUsersController {
  constructor(
    private readonly administratorUsersService: AdministratorUsersService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.administratorUsersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.administratorUsersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParsePositiveIntPipe) id: number) {
    return this.administratorUsersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.administratorUsersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParsePositiveIntPipe) id: number) {
    return this.administratorUsersService.remove(id);
  }
}
