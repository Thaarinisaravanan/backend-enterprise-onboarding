import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto, AdjustQuantityDto, ItemQueryDto, ItemResponseDto, InventorySummaryDto } from './dto/items.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('items')
@ApiBearerAuth()
@Controller({ path: 'items', version: '1' })
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @ApiOperation({ summary: 'List items with cursor-based pagination and filters' })
  findAll(@CurrentUser() user: CurrentUserPayload, @Query() query: ItemQueryDto) {
    return this.itemsService.findAll(user.companyId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Inventory summary (cached 60s per company)' })
  getSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.itemsService.getSummary(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single item by ID' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.findById(user.companyId, id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new inventory item' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateItemDto) {
    return this.itemsService.create(user.companyId, dto, user.sub);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update an item' })
  update(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(user.companyId, id, dto, user.sub);
  }

  @Post(':id/adjust')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust item quantity (atomic + audit log)' })
  adjustQuantity(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AdjustQuantityDto) {
    return this.itemsService.adjustQuantity(user.companyId, id, dto, user.sub);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an item' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.remove(user.companyId, id, user.sub);
  }
}
