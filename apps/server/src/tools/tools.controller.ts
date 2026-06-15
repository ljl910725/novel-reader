import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ToolsService } from './tools.service';

@Controller('tools')
@UseGuards(JwtAuthGuard)
export class ToolsController {
  constructor(private tools: ToolsService) {}

  @Post('dictionary')
  lookup(@CurrentUser('sub') userId: string, @Body() body: { word: string }) {
    return this.tools.lookupDictionary(userId, body.word);
  }

  @Post('ai-explain')
  explain(@CurrentUser('sub') userId: string, @Body() body: { text: string }) {
    return this.tools.aiExplain(userId, body.text);
  }
}
